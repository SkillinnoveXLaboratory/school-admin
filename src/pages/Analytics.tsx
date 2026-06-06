import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { Analytics, HR, Students } from '@/lib/api/services';
import { fullName, isRecord, rowsFrom, textOf } from '@/lib/viewUtils';

export function AnalyticsPage() {
  const dashboardQuery = useQuery({ queryKey: ['school-dashboard', 'analytics'], queryFn: () => Analytics.schoolDashboard() });
  const studentsQuery = useQuery({ queryKey: ['students', 'analytics'], queryFn: () => Students.list({ page: 1, limit: 100 }) });
  const employeesQuery = useQuery({ queryKey: ['hr-employees', 'analytics'], queryFn: () => HR.employees.list({ page: 1, limit: 100 }) });

  const students = studentsQuery.data?.students ?? [];
  const teachers = useMemo(() => (employeesQuery.data?.employees ?? []).filter((employee) => employee.role === 'TEACHER'), [employeesQuery.data]);
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const activeStudentId = studentId || students[0]?.id || '';
  const activeTeacher = teachers.find((teacher) => teacher.userId === teacherId || teacher.id === teacherId) ?? teachers[0];
  const activeTeacherId = teacherId || activeTeacher?.userId || activeTeacher?.id || '';

  const studentPerformanceQuery = useQuery({
    queryKey: ['student-performance', activeStudentId],
    queryFn: () => Analytics.studentPerformance(activeStudentId),
    enabled: Boolean(activeStudentId),
  });
  const teacherPerformanceQuery = useQuery({
    queryKey: ['teacher-performance', activeTeacherId],
    queryFn: () => Analytics.teacherPerformance(activeTeacherId),
    enabled: Boolean(activeTeacherId),
  });

  const stats = isRecord(dashboardQuery.data?.statistics) ? dashboardQuery.data.statistics : {};
  const performance = rowsFrom<any>(studentPerformanceQuery.data, ['performance', 'data']);
  const subjectsTaught = rowsFrom<any>(teacherPerformanceQuery.data, ['subjectsTaught', 'data']);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 12"
        title="Analytics"
        subtitle="Live dashboard KPIs, student marks progression, and teacher subject aggregates."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Students" value={textOf(stats, ['totalStudents'], '0')} />
        <Stat label="Teachers" value={textOf(stats, ['totalTeachers'], '0')} />
        <Stat label="Classes" value={textOf(stats, ['totalClasses'], '0')} />
        <Stat label="Routes" value={textOf(stats, ['totalTransportRoutes'], '0')} />
        <Stat label="Books" value={textOf(stats, ['totalLibraryBooks'], '0')} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-start">
            <div>
              <h2 className="font-display text-lg font-semibold">Student performance</h2>
              <p className="text-sm text-ink-500">Loaded from the student performance API.</p>
            </div>
            <select className="input" value={activeStudentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 h-72">
            {performance.length ? (
              <ResponsiveContainer>
                <LineChart data={performance}>
                  <CartesianGrid strokeDasharray="3 6" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="subjectName" fontSize={12} stroke="#64748B" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} fontSize={12} stroke="#64748B" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="percentage" name="Percentage" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty text={studentPerformanceQuery.isLoading ? 'Loading student performance...' : 'No performance rows returned for this student.'} />
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {performance.map((row) => (
              <div key={`${textOf(row, ['examId'])}-${textOf(row, ['subjectId'])}`} className="rounded-xl border border-line p-3">
                <p className="font-semibold text-sm">{textOf(row, ['examName'])}</p>
                <p className="text-xs text-ink-400 mt-1">{textOf(row, ['subjectName'])} / {textOf(row, ['term'])}</p>
                <p className="mt-2 font-display text-xl font-bold">{textOf(row, ['marksObtained'], '0')} / {textOf(row, ['maxMarks'], '0')}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-start">
            <div>
              <h2 className="font-display text-lg font-semibold">Teacher performance</h2>
              <p className="text-sm text-ink-500">Loaded from the teacher performance API.</p>
            </div>
            <select className="input" value={activeTeacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.userId || teacher.id}>{teacher.firstName} {teacher.lastName}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 rounded-2xl border border-line p-4">
            <p className="label">Teacher</p>
            <h3 className="mt-1 font-display text-xl font-semibold">{textOf(teacherPerformanceQuery.data, ['teacherName'], fullName(activeTeacher, 'No teacher selected'))}</h3>
          </div>

          <div className="mt-5 h-64">
            {subjectsTaught.length ? (
              <ResponsiveContainer>
                <BarChart data={subjectsTaught}>
                  <CartesianGrid strokeDasharray="3 6" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="subjectName" fontSize={12} stroke="#64748B" tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} stroke="#64748B" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="averagePercentage" name="Average %" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty text={teacherPerformanceQuery.isLoading ? 'Loading teacher analytics...' : 'No subject aggregates returned for this teacher.'} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="h-full grid place-items-center rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-400">{text}</div>;
}
