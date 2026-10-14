// Only audited overview/setup screens use this projection. Unknown and detail
// routes retain the complete response, including exports and editing screens.
export function academicView(url: string): 'overview' | 'full' {
  const path = url.split(/[?#]/)[0].replace(/\/$/, '');
  const overview = new Set([
    '/head', '/academic', '/academic/page', '/head/dashboard', '/head/settings', '/head/school-setup', '/head/staff',
    '/head/staff/invite', '/head/staff/pending', '/head/teaching-assignments',
    '/head/academic-years', '/head/notifications',
    '/academic/dashboard', '/academic/settings', '/academic/teaching-assignments',
    '/academic/teachers', '/academic/classes-subjects', '/academic/years',
    '/academic/subjects', '/academic/notifications',
    '/teacher', '/teacher/planner', '/teacher/support', '/teacher/profile', '/teacher/notifications',
  ]);
  return overview.has(path) ? 'overview' : 'full';
}
