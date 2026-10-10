export const IMPORT_FIELDS = [
  { key: 'name', label: 'Student name', aliases: ['studentfullname', 'fullname', 'studentname', 'name'] },
  { key: 'admissionNumber', label: 'Admission number', aliases: ['regno', 'registrationnumber', 'admissionnumber', 'studentnumber', 'studentid'] },
  { key: 'classroom', label: 'Class', aliases: ['class', 'classform', 'form', 'classroom'] },
  { key: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
  { key: 'dateOfBirth', label: 'Birth date', aliases: ['dob', 'dateofbirth', 'birthdate'] },
  { key: 'admissionDate', label: 'Admission date', aliases: ['admissiondate', 'dateofadmission', 'joineddate'] },
  { key: 'ownPhone', label: 'Student phone', aliases: ['ownphone', 'studentphone'] },
  { key: 'guardianName', label: 'Guardian name', aliases: ['guardianname', 'parentname', 'parentguardianname'] },
  { key: 'guardianPhone', label: 'Guardian phone', aliases: ['guardianphone', 'parentphone', 'parentphonenumber', 'guardianphonenumber'] },
  { key: 'address', label: 'Address', aliases: ['address', 'homeaddress'] },
  { key: 'subjects', label: 'Subjects (separate with ;)', aliases: ['subjects', 'subjectsseparatewith', 'subjectcodes', 'electives'] },
];
export function suggestMapping(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map(h => { const field = IMPORT_FIELDS.find(f => f.aliases.includes(h.toLowerCase().replace(/[^a-z]/g, ''))); if (!field || used.has(field.key)) return ''; used.add(field.key); return field.key; });
}
/** RFC4180 quoting, including embedded newlines; reject malformed files rather than shift columns. */
export function parseCsv(text: string, delimiter = ','): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false; let closed = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; if (row.length > 256) throw new Error('Maximum 256 columns per file.'); };
  const pushRow = () => { pushCell(); rows.push(row); row = []; if (rows.length > 5001) throw new Error('Maximum 5,000 student rows per import.'); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c; }
    else if (c === delimiter) pushCell();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; pushRow(); }
    else if (c === '"' && !cell && !closed) quoted = true;
    else if (closed || c === '"') throw new Error('Malformed CSV quoting. Export the file again as CSV UTF-8.');
    else cell += c;
  }
  if (quoted) throw new Error('A quoted CSV cell was not closed.');
  if (cell || row.length || closed) pushRow();
  return rows;
}
export function importDate(value: string, format: string): string {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value) || format === 'ISO') return value;
  const match = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${(format === 'DMY' ? match[2] : match[1]).padStart(2, '0')}-${(format === 'DMY' ? match[1] : match[2]).padStart(2, '0')}`;
}
export function downloadCsv(filename: string, rows: unknown[][]) {
  const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
