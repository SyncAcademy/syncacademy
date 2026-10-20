import { 
  BadRequestException, 
  Body, 
  Controller, 
  Get, 
  NotFoundException, 
  Param, 
  Post, 
  Query, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { ReconciliationService } from './reconciliation.service';

const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const importStatementSchema = z.object({
  bankName: z.string().trim().min(2).max(100),
  accountNumber: z.string().trim().max(50).optional(),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date as YYYY-MM-DD'),
  fileName: z.string().trim().min(3).max(255),
  csvContent: z.string().min(10),
});

const confirmMatchSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

const disputeRowSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

@Controller('api/v1/schools/:schoolId/finance')
export class ReconciliationController {
  constructor(
    private readonly svc: PlatformService,
    private readonly reconService: ReconciliationService,
  ) {}

  /**
   * Import bank/mobile money statement CSV
   */
  @Post('statements/import')
  async importStatement(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    const b = parse(importStatementSchema, body);

    const statement = await this.reconService.importStatement(
      schoolId,
      user.id,
      b.fileName,
      b.csvContent,
      {
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        statementDate: new Date(b.statementDate),
      }
    );

    return {
      message: 'Bank statement imported successfully and candidate matches evaluated.',
      statement,
    };
  }

  /**
   * List imported statements
   */
  @Get('statements')
  async listStatements(
    @Req() req: Request,
    @Param('schoolId') schoolId: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);

    return this.svc.db.bankStatement.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: { rows: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get statement details and rows with match candidates
   */
  @Get('statements/:statementId')
  async getStatementDetails(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('statementId') statementId: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    parse(uuid, statementId);

    const statement = await this.svc.db.bankStatement.findFirst({
      where: { id: statementId, schoolId },
      include: {
        rows: {
          orderBy: { rowNumber: 'asc' },
          include: {
            matches: {
              include: {
                payment: {
                  include: {
                    student: { select: { id: true, name: true, admissionNumber: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!statement) throw new NotFoundException('Statement not found in this school.');
    return statement;
  }

  /**
   * Confirm candidate reconciliation match
   */
  @Post('reconciliation/matches/:matchId/confirm')
  async confirmMatch(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('matchId') matchId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    parse(uuid, matchId);
    const b = parse(confirmMatchSchema, body);

    return this.reconService.confirmMatch(schoolId, matchId, user.id, b.notes);
  }

  /**
   * Dispute statement row
   */
  @Post('statements/rows/:rowId/dispute')
  async disputeRow(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('rowId') rowId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    parse(uuid, rowId);
    const b = parse(disputeRowSchema, body);

    return this.reconService.disputeRow(schoolId, rowId, b.reason, user.id);
  }

  /**
   * Reconciliation overview and statistics
   */
  @Get('reconciliation/overview')
  async getReconciliationOverview(
    @Req() req: Request,
    @Param('schoolId') schoolId: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);

    const [totalRows, confirmedRows, suggestedRows, disputedRows] = await Promise.all([
      this.svc.db.bankStatementRow.count({ where: { schoolId } }),
      this.svc.db.bankStatementRow.count({ where: { schoolId, matchStatus: 'confirmed' } }),
      this.svc.db.bankStatementRow.count({ where: { schoolId, matchStatus: 'suggested' } }),
      this.svc.db.bankStatementRow.count({ where: { schoolId, matchStatus: 'disputed' } }),
    ]);

    const unmatchedRows = totalRows - (confirmedRows + suggestedRows + disputedRows);

    return {
      totalRows,
      confirmedRows,
      suggestedRows,
      disputedRows,
      unmatchedRows,
      reconciliationRate: totalRows > 0 ? Math.round((confirmedRows / totalRows) * 100) : 0,
    };
  }
}
