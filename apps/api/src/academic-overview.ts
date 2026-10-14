import { Prisma } from '@prisma/client';

// Read-only projection: keep the stored workspace and its historical records intact.
// Aggregate before returning JSON so dashboards never parse every student mark.
export function academicOverviewQuery(schoolId: string, yearId: string) {
  return Prisma.sql`
    SELECT revision, jsonb_build_object('assessments',COALESCE(data->'assessments','[]'::jsonb),
      'slots',COALESCE(data->'slots','[]'::jsonb),'syllabus',COALESCE(data->'syllabus','[]'::jsonb),
      'support',COALESCE(data->'support','[]'::jsonb),'audit',COALESCE(data->'audit','[]'::jsonb),
      'notifications',COALESCE(data->'notifications','[]'::jsonb),'classTeachers',COALESCE(data->'classTeachers','[]'::jsonb),
      'policy',data->'policy',
      'submissions', COALESCE((SELECT jsonb_agg((s - 'entries' - 'archives') || jsonb_build_object(
        'resultStats', (SELECT jsonb_build_object('count',count(*),'sum',COALESCE(sum((m->>'marksValue')::numeric),0),
          'below50',count(*) FILTER (WHERE (m->>'marksValue')::numeric < 50),
          'passed',count(*) FILTER (WHERE (m->>'marksValue')::numeric >= COALESCE((s->'gradingPolicy'->>'passMark')::numeric,35)))
          FROM jsonb_array_elements(COALESCE(s->'entries','[]'::jsonb)) m
          WHERE jsonb_typeof(m->'marksValue')='number' AND (m->>'marksValue')::numeric BETWEEN 0 AND 100)
      )) FROM jsonb_array_elements(COALESCE(data->'submissions','[]'::jsonb)) s),'[]'::jsonb),
      'reports',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r->'id','classId',r->'classId'))
        FROM jsonb_array_elements(COALESCE(data->'reports','[]'::jsonb)) r),'[]'::jsonb)
    ) AS data FROM "AcademicWorkspace" WHERE "schoolId"=${schoolId}::uuid AND "yearId"=${yearId}::uuid`;
}
