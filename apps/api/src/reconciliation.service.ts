import { 
  BadRequestException, 
  ConflictException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Database } from './database/database.service';

export interface ParsedStatementRow {
  rowNumber: number;
  transactionDate: Date;
  reference: string;
  description: string;
  amount: number;
  payerName: string;
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly db: Database) {}

  /**
   * Safe CSV parser for bank and mobile money statements
   */
  public parseStatementCsv(csvContent: string): ParsedStatementRow[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('CSV file is empty or missing data rows.');
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Find column indexes
    const dateIdx = header.findIndex(h => h.includes('date') || h.includes('tarehe'));
    const refIdx = header.findIndex(h => h.includes('ref') || h.includes('kumbukumbu') || h.includes('trans') || h.includes('receipt'));
    const descIdx = header.findIndex(h => h.includes('desc') || h.includes('maelezo') || h.includes('particulars'));
    const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('kiasi') || h.includes('credit') || h.includes('paid'));
    const payerIdx = header.findIndex(h => h.includes('payer') || h.includes('name') || h.includes('jina') || h.includes('sender'));

    if (dateIdx === -1 || amountIdx === -1) {
      throw new BadRequestException('CSV must contain at least Date and Amount columns.');
    }

    const rows: ParsedStatementRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV tokenization respecting quotes
      const cells: string[] = [];
      let inQuotes = false;
      let current = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());

      const rawDate = cells[dateIdx]?.replace(/^["']|["']$/g, '');
      const rawAmount = cells[amountIdx]?.replace(/[^0-9.-]/g, '');
      const parsedDate = new Date(rawDate);
      const parsedAmount = Math.round(Number(rawAmount) || 0);

      if (isNaN(parsedDate.getTime()) || parsedAmount <= 0) {
        continue; // Skip invalid or non-credit rows
      }

      rows.push({
        rowNumber: rows.length + 1,
        transactionDate: parsedDate,
        reference: (refIdx !== -1 ? cells[refIdx] : '').replace(/^["']|["']$/g, '').trim(),
        description: (descIdx !== -1 ? cells[descIdx] : '').replace(/^["']|["']$/g, '').trim(),
        amount: parsedAmount,
        payerName: (payerIdx !== -1 ? cells[payerIdx] : '').replace(/^["']|["']$/g, '').trim(),
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('No valid credit transaction rows found in CSV file.');
    }

    return rows;
  }

  /**
   * Import bank statement and run candidate matching engine
   */
  async importStatement(
    schoolId: string,
    uploadedById: string,
    fileName: string,
    csvContent: string,
    meta: {
      bankName: string;
      accountNumber?: string;
      statementDate: Date;
    }
  ) {
    if (Buffer.byteLength(csvContent, 'utf8') > 5 * 1024 * 1024) {
      throw new BadRequestException('Statement file exceeds maximum allowed size of 5 MB.');
    }

    // SHA-256 hash to prevent duplicate uploads
    const fileHash = createHash('sha256').update(csvContent).digest('hex');

    const duplicate = await this.db.bankStatement.findFirst({
      where: { schoolId, fileHash },
    });
    if (duplicate) {
      throw new ConflictException('This statement file has already been imported for this school.');
    }

    const parsedRows = this.parseStatementCsv(csvContent);
    const totalCredits = parsedRows.reduce((sum, r) => sum + r.amount, 0);

    return this.db.$transaction(async tx => {
      const statement = await tx.bankStatement.create({
        data: {
          schoolId,
          bankName: meta.bankName,
          accountNumber: meta.accountNumber || '',
          statementDate: meta.statementDate,
          totalCredits,
          rowCount: parsedRows.length,
          fileName,
          fileHash,
          uploadedById,
          status: 'uploaded',
        },
      });

      // Insert rows
      const createdRows = await Promise.all(
        parsedRows.map(r =>
          tx.bankStatementRow.create({
            data: {
              statementId: statement.id,
              schoolId,
              rowNumber: r.rowNumber,
              transactionDate: r.transactionDate,
              reference: r.reference,
              description: r.description,
              amount: r.amount,
              payerName: r.payerName,
              matchStatus: 'unmatched',
            },
          })
        )
      );

      // Automated Candidate Matching Engine
      for (const row of createdRows) {
        // Rule 1: Exact reference match against active school payments
        let candidate = row.reference
          ? await tx.payment.findFirst({
              where: {
                schoolId,
                voidAt: null,
                OR: [
                  { reference: { equals: row.reference, mode: 'insensitive' } },
                  { receipt: { equals: row.reference, mode: 'insensitive' } },
                ],
              },
            })
          : null;

        if (candidate) {
          await tx.reconciliationMatch.create({
            data: {
              schoolId,
              statementRowId: row.id,
              paymentId: candidate.id,
              matchType: 'EXACT_REFERENCE',
              confidenceScore: 100,
              status: 'suggested',
            },
          });

          await tx.bankStatementRow.update({
            where: { id_schoolId: { id: row.id, schoolId } },
            data: { matchStatus: 'suggested' },
          });
          continue;
        }

        // Rule 2: Exact Amount match within +/- 4 days
        const minDate = new Date(row.transactionDate.getTime() - 4 * 86400000);
        const maxDate = new Date(row.transactionDate.getTime() + 4 * 86400000);

        const amountCandidates = await tx.payment.findMany({
          where: {
            schoolId,
            amount: row.amount,
            voidAt: null,
            date: { gte: minDate, lte: maxDate },
          },
          include: { student: true },
          take: 3,
        });

        for (const p of amountCandidates) {
          // Check if student name or admission number appears in row description or payer
          const textCorpus = `${row.description} ${row.payerName}`.toLowerCase();
          const nameMatches = p.student.name.toLowerCase().split(' ').some(part => part.length > 2 && textCorpus.includes(part));
          const admissionMatches = p.student.admissionNumber && textCorpus.includes(p.student.admissionNumber.toLowerCase());

          const score = admissionMatches ? 95 : nameMatches ? 80 : 65;

          await tx.reconciliationMatch.create({
            data: {
              schoolId,
              statementRowId: row.id,
              paymentId: p.id,
              matchType: score >= 80 ? 'HIGH_CONFIDENCE' : 'MANUAL',
              confidenceScore: score,
              status: 'suggested',
            },
          });

          await tx.bankStatementRow.update({
            where: { id_schoolId: { id: row.id, schoolId } },
            data: { matchStatus: 'suggested' },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: uploadedById,
          action: 'BANK_STATEMENT_IMPORTED',
          target: `${statement.id}:${parsedRows.length}_rows`,
        },
      });

      return statement;
    });
  }

  /**
   * Confirm a suggested or manual reconciliation match
   */
  async confirmMatch(schoolId: string, matchId: string, actorId: string, notes?: string) {
    const match = await this.db.reconciliationMatch.findFirst({
      where: { id: matchId, schoolId },
      include: { statementRow: true, payment: true },
    });
    if (!match) throw new NotFoundException('Reconciliation match candidate not found.');

    return this.db.$transaction(async tx => {
      const now = new Date();

      const confirmedMatch = await tx.reconciliationMatch.update({
        where: { id_schoolId: { id: matchId, schoolId } },
        data: {
          status: 'confirmed',
          reconciledById: actorId,
          reconciledAt: now,
          notes: notes || match.notes,
        },
      });

      await tx.bankStatementRow.update({
        where: { id_schoolId: { id: match.statementRowId, schoolId } },
        data: {
          matchStatus: 'confirmed',
          matchedPaymentId: match.paymentId,
          reconciledAt: now,
          reconciledById: actorId,
          notes: notes || '',
        },
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId,
          action: 'PAYMENT_RECONCILED',
          target: `${match.paymentId}:${match.statementRowId}`,
        },
      });

      return confirmedMatch;
    });
  }

  /**
   * Dispute or flag an unmatched statement row
   */
  async disputeRow(schoolId: string, rowId: string, reason: string, actorId: string) {
    const row = await this.db.bankStatementRow.findFirst({
      where: { id: rowId, schoolId },
    });
    if (!row) throw new NotFoundException('Statement row not found.');

    return this.db.bankStatementRow.update({
      where: { id_schoolId: { id: rowId, schoolId } },
      data: {
        matchStatus: 'disputed',
        notes: reason,
      },
    });
  }
}
