type Report = {
  school: string;
  student: string;
  admissionNumber: string;
  academicYear: string;
  className: string;
  period: string;
  publishedAt: string;
  results: unknown;
  noMarks: unknown;
  summary: unknown;
};

const safeText = (value: unknown) => String(value ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7e]/g, '?')
  .slice(0, 180);
const escaped = (value: unknown) => safeText(value).replace(/[\\()]/g, '\\$&');
const value = (item: unknown) => item && typeof item === 'object' ? item as Record<string, unknown> : {};

/** A bounded, dependency-free PDF for an already authorized, published snapshot. */
export function renderReportPdf(report: Report): Buffer {
  const lines = [
    'SYNCACADEMY | OFFICIAL PUBLISHED RESULT',
    report.school,
    `Student: ${report.student}`,
    `Admission number: ${report.admissionNumber}`,
    `Academic year: ${report.academicYear}    Class: ${report.className}`,
    `Assessment: ${report.period}`,
    `Published: ${report.publishedAt}`,
    '',
    'SUBJECT RESULTS',
  ];
  for (const raw of Array.isArray(report.results) ? report.results.slice(0, 100) : []) {
    const row = value(raw);
    const mark = typeof row.mark === 'number' ? row.mark : '-';
    const maximum = typeof row.maxMarks === 'number' ? ` / ${row.maxMarks}` : '';
    lines.push(`${safeText(row.subject)}: ${mark}${maximum}    Grade: ${safeText(row.grade) || '-'}`);
  }
  for (const subject of Array.isArray(report.noMarks) ? report.noMarks.slice(0, 100) : []) {
    lines.push(`${safeText(subject)}: no mark`);
  }
  const summary = value(report.summary);
  lines.push('', 'PERFORMANCE SUMMARY');
  lines.push(`Average: ${summary.average ?? '-'}    Overall grade: ${safeText(summary.overallGrade) || '-'}`);
  lines.push(`Position: ${summary.position ?? '-'}${summary.classSize ? ` / ${summary.classSize}` : ''}`);
  lines.push('', 'This document reflects the published school report snapshot.');
  const wrapped = lines.flatMap(line => line.length ? line.match(/.{1,85}/g) ?? [''] : ['']);

  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const pagesId = add('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];
  for (let offset = 0; offset < wrapped.length; offset += 44) {
    const pageLines = wrapped.slice(offset, offset + 44);
    const content = ['BT', '/F1 11 Tf', '45 790 Td', '15 TL', ...pageLines.map((line, index) => `${index ? 'T* ' : ''}(${escaped(line)}) Tj`), 'ET'].join('\n');
    const streamId = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`));
  }
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
