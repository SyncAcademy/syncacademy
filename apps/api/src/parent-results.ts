type Assessment = { id: string; yearId: string; name: string; term: string; deadline?: string; status: string };
type Report = { id: string; assessmentId?: string; status?: string; academicApproved?: boolean };
type Submission = { assessmentId: string; entries?: Array<{ studentId: string; marksValue?: number | null; noMark?: boolean }> };

/** Called only after guardian permission and school/year ownership checks. */
export function parentAssessmentCatalog(data: unknown, publications: Array<{ reportCardId: string }>, studentId: string, yearId: string, term: string) {
  const state = (data ?? {}) as { assessments?: Assessment[]; reports?: Report[]; submissions?: Submission[] };
  const assessments = (state.assessments ?? []).filter(item => item.yearId === yearId && item.term === term);
  const assessmentIds = new Set(assessments.map(item => item.id));
  const studentReports = (state.reports ?? []).filter(report => report.id.split(':')[2] === studentId && assessmentIds.has(report.id.split(':')[0]));
  const approved = new Set(studentReports.filter(report => report.status === 'approved' && report.academicApproved === true).map(report => report.id));
  const allowed = new Set(publications.filter(item => approved.has(item.reportCardId)).map(item => item.reportCardId.split(':')[0]));
  const items = assessments.filter(item => item.id && item.name && item.status !== 'draft' && allowed.has(item.id))
    .map(item => ({ id: item.id, name: item.name, termId: term, date: item.deadline ?? null }));
  // Return only existence for this child, never draft marks or assessment metadata.
  const recorded = studentReports.length > 0 || (state.submissions ?? []).some(submission => assessmentIds.has(submission.assessmentId) &&
    (submission.entries ?? []).some(entry => entry.studentId === studentId && (typeof entry.marksValue === 'number' || entry.noMark === true)));
  return { items, availability: items.length ? 'published' : recorded ? 'awaiting_publication' : 'no_assessments' };
}
