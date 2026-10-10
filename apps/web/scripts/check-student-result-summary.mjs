import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await readFile(new URL('../src/app/features/academic/student-result-summary.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const { summarizeStudents } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);
const row = (className, student, studentNumber, subject, mark) => ({ className, student, studentNumber, subject, mark, grade: 'A', status: 'approved' });
const summaries = summarizeStudents([
  row('Form 1A', 'Cal', '003', 'Math', 40),
  row('Form 1A', 'Ada', '001', 'Math', 80),
  row('Form 1B', 'Dan', '004', 'Math', 90),
  row('Form 1A', 'Ben', '002', 'English', 70),
  row('Form 1A', 'Ada', '001', 'English', 60),
  row('Form 1A', 'Cal', '003', 'English', 50),
  row('Form 1A', 'Ben', '002', 'Math', 70),
]);
assert.deepEqual(summaries.map(({ className, studentNumber, average, position }) => [className, studentNumber, average, position]), [
  ['Form 1A', '001', 70, 1],
  ['Form 1A', '002', 70, 1],
  ['Form 1A', '003', 45, 3],
  ['Form 1B', '004', 90, 1],
]);
assert.deepEqual(summaries[0].subjects.map(subject => subject.subject), ['English', 'Math']);
console.log('Student standings: grouping, averages, class positions, and ties passed.');
