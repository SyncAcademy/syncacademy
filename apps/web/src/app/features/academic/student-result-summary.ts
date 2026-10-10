export interface SubjectResult {
  subject: string;
  mark: number;
  grade: string;
  status: string;
}

export interface StudentResultSummary {
  className: string;
  student: string;
  studentNumber: string;
  subjects: SubjectResult[];
  average: number;
  position: number;
}

export function summarizeStudents<T extends StudentResultSummaryIdentity>(rows: T[]): StudentResultSummary[] {
  const grouped = new Map<string, StudentResultSummary>();
  for (const row of rows) {
    const key = `${row.className}\u0000${row.studentNumber}`;
    let student = grouped.get(key);
    if (!student) {
      student = { className: row.className, student: row.student, studentNumber: row.studentNumber, subjects: [], average: 0, position: 0 };
      grouped.set(key, student);
    }
    student.subjects.push({ subject: row.subject, mark: row.mark, grade: row.grade, status: row.status });
  }

  const summaries = [...grouped.values()];
  for (const student of summaries) {
    student.subjects.sort((a, b) => a.subject.localeCompare(b.subject));
    student.average = student.subjects.reduce((total, result) => total + result.mark, 0) / student.subjects.length;
  }

  const byClass = new Map<string, StudentResultSummary[]>();
  for (const student of summaries) {
    const classmates = byClass.get(student.className) ?? [];
    classmates.push(student);
    byClass.set(student.className, classmates);
  }
  for (const classmates of byClass.values()) {
    classmates.sort((a, b) => b.average - a.average || a.student.localeCompare(b.student) || a.studentNumber.localeCompare(b.studentNumber));
    classmates.forEach((student, index) => {
      student.position = index && student.average === classmates[index - 1].average ? classmates[index - 1].position : index + 1;
    });
  }
  return summaries.sort((a, b) => a.className.localeCompare(b.className) || a.position - b.position || a.student.localeCompare(b.student));
}

interface StudentResultSummaryIdentity {
  className: string;
  student: string;
  studentNumber: string;
  subject: string;
  mark: number;
  grade: string;
  status: string;
}
