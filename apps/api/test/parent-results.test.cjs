const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Execute current source in memory so regression tests do not need a build.
function source(name) {
  const filename = path.resolve(__dirname, '../src', name + '.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports;
}
const { parentAssessmentCatalog: catalog } = source('parent-results');
const { termsForYear } = source('academic-terms');
const assessment = { id: 'exam', yearId: 'year', name: 'Terminal', term: 'term-1', status: 'closed' };
const report = { id: 'exam:class:child', academicApproved: true, status: 'approved' };
const publication = { reportCardId: report.id };
const query = (state, publications = []) => catalog(state, publications, 'child', 'year', 'term-1');

test('recorded and approved reports remain hidden until explicitly published', () => {
  assert.deepEqual(query({ assessments: [assessment], reports: [report] }), { items: [], availability: 'awaiting_publication' });
  assert.equal(query({ assessments: [assessment], reports: [report] }, [publication]).items[0].id, 'exam');
});
test('unapproved or withdrawn publications never expose assessment metadata', () => {
  for (const value of [{ ...report, status: 'generated' }, { ...report, academicApproved: false }]) {
    assert.deepEqual(query({ assessments: [assessment], reports: [value] }, [publication]).items, []);
  }
  assert.deepEqual(query({ assessments: [assessment], reports: [report] }).items, []);
});
test('availability is scoped to this student, year and term, including zero and no-mark entries', () => {
  const state = { assessments: [assessment], submissions: [{ assessmentId: 'exam', entries: [{ studentId: 'other', marksValue: 80 }] }] };
  assert.equal(query(state).availability, 'no_assessments');
  for (const entry of [{ studentId: 'child', marksValue: 0 }, { studentId: 'child', noMark: true }]) {
    state.submissions[0].entries = [entry];
    assert.equal(query(state).availability, 'awaiting_publication');
  }
  assert.equal(catalog(state, [], 'child', 'other-year', 'term-1').availability, 'no_assessments');
  assert.equal(catalog(state, [], 'child', 'year', 'term-2').availability, 'no_assessments');
  assert.deepEqual(query({ assessments: [assessment], reports: [{ ...report, id: 'exam:class:other' }] }, [publication]).items, []);
});
test('legacy years use the shared staff term fallback and custom terms remain intact', () => {
  const year = { startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31'), terms: [] };
  assert.deepEqual(termsForYear(year).map(term => term.key), ['Term 1', 'Term 2', 'Term 3']);
  year.terms = [{ key: 'semester-a', name: 'Semester A', startsAt: '2026-01-01', endsAt: '2026-12-31' }];
  assert.deepEqual(termsForYear(year), year.terms);
});
