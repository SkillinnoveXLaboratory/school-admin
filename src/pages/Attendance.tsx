import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic, Attendance as AttendanceApi, Students } from '@/lib/api/services';
import type { AcademicClass, Student } from '@/lib/api/types';
import { compactId, formatDate, fullName, idOf, inputDate, isRecord, rowsFrom, statusClass, textOf } from '@/lib/viewUtils';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
type MarkState = Record<string, { status: AttendanceStatus; remarks: string }>;

const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'];

export function AttendancePage() {
  const qc = useQueryClient();
  const today = inputDate();
  const [date, setDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [marks, setMarks] = useState<MarkState>({});
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => Academic.classes.list(),
  });
  const classes = classesQuery.data?.classes ?? [];
  const defaultClassId = classes[0]?.id ?? '';
  const activeClassId = selectedClassId || defaultClassId;
  const selectedClass = classes.find((item) => item.id === activeClassId);
  const sections = selectedClass?.sections ?? [];
  const defaultSectionId = sections[0]?.id ?? '';
  const activeSectionId = selectedSectionId || defaultSectionId;

  useEffect(() => {
    if (!selectedClassId && classes.length) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!selectedClass) return;
    if (!selectedSectionId || !selectedClass.sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(selectedClass.sections[0]?.id ?? '');
    }
  }, [selectedClass, selectedSectionId]);

  const studentsQuery = useQuery({
    queryKey: ['attendance-students', activeClassId, activeSectionId],
    queryFn: () => Students.list({ classId: activeClassId, sectionId: activeSectionId, page: 1, limit: 100 }),
    enabled: Boolean(activeClassId && activeSectionId),
  });
  const students = studentsQuery.data?.students ?? [];

  useEffect(() => {
    setMarks((current) => {
      const next: MarkState = {};
      students.forEach((student) => {
        next[student.id] = current[student.id] ?? { status: 'PRESENT', remarks: '' };
      });
      return next;
    });
  }, [students]);

  const month = Number(date.slice(5, 7));
  const year = Number(date.slice(0, 4));
  const aggregateQuery = useQuery({
    queryKey: ['attendance-class', activeClassId, activeSectionId, date],
    queryFn: () => AttendanceApi.forClass(activeClassId, { date, sectionId: activeSectionId }),
    enabled: Boolean(activeClassId && date),
  });
  const reportQuery = useQuery({
    queryKey: ['attendance-report', month, year],
    queryFn: () => AttendanceApi.reports({ month, year }),
  });
  const leavesQuery = useQuery({
    queryKey: ['attendance-leaves'],
    queryFn: () => AttendanceApi.listLeaves({ page: 1, limit: 50 }),
  });

  const counts = useMemo(() => {
    return Object.values(marks).reduce<Record<AttendanceStatus, number>>(
      (acc, mark) => ({ ...acc, [mark.status]: acc[mark.status] + 1 }),
      { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0 },
    );
  }, [marks]);

  const saveAttendance = useMutation({
    mutationFn: () =>
      AttendanceApi.record({
        classId: activeClassId,
        sectionId: activeSectionId,
        date,
        records: students.map((student) => ({
          studentId: student.id,
          status: marks[student.id]?.status ?? 'PRESENT',
          remarks: marks[student.id]?.remarks || undefined,
        })),
      }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Attendance recorded');
      qc.invalidateQueries({ queryKey: ['attendance-class'] });
      qc.invalidateQueries({ queryKey: ['attendance-report'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to record attendance'),
  });

  const aggregate = isRecord(aggregateQuery.data) && isRecord(aggregateQuery.data.aggregates)
    ? aggregateQuery.data.aggregates
    : isRecord(aggregateQuery.data) && isRecord(aggregateQuery.data.data)
      ? aggregateQuery.data.data
      : {};
  const reportRows = rowsFrom<any>(reportQuery.data, ['report', 'data']);
  const leaveRows = rowsFrom<any>(leavesQuery.data, ['leaves', 'data']);
  const classRecords = rowsFrom<any>(aggregateQuery.data, ['records']);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 4"
        title="Attendance"
        subtitle="Record roster attendance, review daily aggregates, and approve student leave requests."
        actions={
          <>
            <button onClick={() => setLeaveOpen(true)} className="btn-outline">
              <Icon name="plus" size={16} /> Leave request
            </button>
            <button
              onClick={() => saveAttendance.mutate()}
              disabled={saveAttendance.isPending || !students.length || !activeClassId || !activeSectionId}
              className="btn-primary"
            >
              <Icon name="check" size={16} /> {saveAttendance.isPending ? 'Saving...' : 'Submit attendance'}
            </button>
          </>
        }
      />

      <section className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Class">
            <select
              className="input mt-2"
              value={activeClassId}
              onChange={(event) => {
                const nextClassId = event.target.value;
                const nextClass = classes.find((item) => item.id === nextClassId);
                setSelectedClassId(nextClassId);
                setSelectedSectionId(nextClass?.sections[0]?.id ?? '');
              }}
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <select className="input mt-2" value={activeSectionId} onChange={(event) => setSelectedSectionId(event.target.value)}>
              <option value="">Select section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>{section.name || section.sectionName || compactId(section.id)}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className="input mt-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <div className="rounded-2xl bg-brand-50 p-3">
            <p className="label">Daily total</p>
            <p className="mt-1 font-display text-2xl font-bold text-brand-700">
              {textOf(aggregate, ['totalStudents'], String(students.length))}
            </p>
            <p className="text-xs text-ink-500">students in selected class</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Present" value={counts.PRESENT} apiValue={textOf(aggregate, ['present'], '')} tone="chip-success" />
        <Stat label="Absent" value={counts.ABSENT} apiValue={textOf(aggregate, ['absent'], '')} tone="chip-danger" />
        <Stat label="Late" value={counts.LATE} apiValue={textOf(aggregate, ['late'], '')} tone="chip-warning" />
        <Stat label="Half day" value={counts.HALF_DAY} apiValue={textOf(aggregate, ['halfDay'], '')} tone="chip-brand" />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Roster marking</h2>
            <p className="text-sm text-ink-500">
              {selectedClass?.name ?? 'Select class'} · {sections.find((section) => section.id === selectedSectionId)?.name ?? 'section'} · {date}
            </p>
          </div>
          <span className="chip-brand">{students.length} students loaded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-muted/60">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Status</th>
                <th className="table-header">Remarks</th>
                <th className="table-header text-right">Logs</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-muted/40">
                  <td className="table-cell">
                    <button onClick={() => setActiveStudent(student)} className="flex items-center gap-3 text-left">
                      <Avatar name={`${student.firstName} ${student.lastName}`} />
                      <span>
                        <span className="block font-semibold text-ink-900">{student.firstName} {student.lastName}</span>
                        <span className="block text-xs text-ink-400">{student.email || compactId(student.id)}</span>
                      </span>
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="inline-flex rounded-xl bg-muted p-1">
                      {STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setMarks((current) => ({ ...current, [student.id]: { ...(current[student.id] ?? { remarks: '' }), status } }))}
                          className={clsx(
                            'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                            marks[student.id]?.status === status
                              ? status === 'PRESENT'
                                ? 'bg-success text-white'
                                : status === 'ABSENT'
                                  ? 'bg-danger text-white'
                                  : status === 'LATE'
                                    ? 'bg-warning text-white'
                                    : 'bg-brand-600 text-white'
                              : 'text-ink-500 hover:text-ink-900',
                          )}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell">
                    <input
                      className="input py-2"
                      placeholder="Optional note"
                      value={marks[student.id]?.remarks ?? ''}
                      onChange={(event) => setMarks((current) => ({
                        ...current,
                        [student.id]: { status: current[student.id]?.status ?? 'PRESENT', remarks: event.target.value },
                      }))}
                    />
                  </td>
                  <td className="table-cell text-right">
                    <button onClick={() => setActiveStudent(student)} className="btn-ghost px-3 py-1.5 text-xs">View logs</button>
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">
                    {studentsQuery.isLoading ? 'Loading roster...' : 'No students found for this class section.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-line p-4">
            <h2 className="font-display text-lg font-semibold">Monthly report</h2>
            <p className="text-sm text-ink-500">Live summary from `/attendance/reports` for {month}/{year}.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-muted/60">
                <tr>
                  <th className="table-header">Student</th>
                  <th className="table-header">Present</th>
                  <th className="table-header">Absent</th>
                  <th className="table-header">Late</th>
                  <th className="table-header">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row) => {
                  const stats = isRecord(row.stats) ? row.stats : {};
                  return (
                    <tr key={idOf(row.studentId) || textOf(row, ['studentId'])} className="hover:bg-muted/40">
                      <td className="table-cell font-medium text-ink-900">{fullName(row, 'Student')}</td>
                      <td className="table-cell">{textOf(stats, ['present'], '0')}</td>
                      <td className="table-cell">{textOf(stats, ['absent'], '0')}</td>
                      <td className="table-cell">{textOf(stats, ['late'], '0')}</td>
                      <td className="table-cell">
                        <span className="chip-success">{textOf(stats, ['percentage'], '0')}%</span>
                      </td>
                    </tr>
                  );
                })}
                {!reportRows.length && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-400">No monthly report rows returned yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Leave requests</h2>
              <p className="text-sm text-ink-500">Approve or reject pending requests.</p>
            </div>
            <button onClick={() => setLeaveOpen(true)} className="btn-outline px-3 py-2 text-xs">New</button>
          </div>
          <div className="divide-y divide-line">
            {leaveRows.map((leave) => (
              <LeaveRow key={idOf(leave)} leave={leave} onChanged={() => qc.invalidateQueries({ queryKey: ['attendance-leaves'] })} />
            ))}
            {!leaveRows.length && <p className="p-5 text-sm text-ink-400">No leave applications returned by the API.</p>}
          </div>
        </div>
      </section>

      {classRecords.length > 0 && (
        <section className="card p-4">
          <h2 className="font-display text-lg font-semibold">API class records for selected day</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {classRecords.map((record) => (
              <div key={textOf(record, ['studentId'])} className="rounded-xl border border-line bg-muted/30 p-3">
                <p className="font-semibold text-ink-900">{fullName(record)}</p>
                <p className="mt-1 text-xs text-ink-500">{textOf(record, ['remarks'], 'No remarks')}</p>
                <span className={clsx('mt-2', statusClass(textOf(record, ['status'], '')))}>{textOf(record, ['status'])}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {leaveOpen && (
          <LeaveModal
            students={students}
            onClose={() => setLeaveOpen(false)}
            onSaved={() => {
              setLeaveOpen(false);
              qc.invalidateQueries({ queryKey: ['attendance-leaves'] });
            }}
          />
        )}
        {activeStudent && <StudentLogsModal student={activeStudent} onClose={() => setActiveStudent(null)} />}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, apiValue, tone }: { label: string; value: number; apiValue: string; tone: string }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-bold">{apiValue || value}</p>
        <span className={tone}>live</span>
      </div>
    </div>
  );
}

function LeaveRow({ leave, onChanged }: { leave: any; onChanged: () => void }) {
  const status = textOf(leave, ['status'], 'PENDING');
  const mutation = useMutation({
    mutationFn: (next: 'APPROVED' | 'REJECTED') =>
      AttendanceApi.setLeaveStatus(idOf(leave), { status: next, remarks: next === 'APPROVED' ? 'Approved from admin console' : 'Rejected from admin console' }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Leave status updated');
      onChanged();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update leave'),
  });

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-ink-900">{fullName(leave.studentId, compactId(leave.studentId))}</p>
          <p className="text-xs text-ink-500">{formatDate(textOf(leave, ['startDate'], ''))} to {formatDate(textOf(leave, ['endDate'], ''))}</p>
          <p className="mt-2 text-sm text-ink-600">{textOf(leave, ['reason'], 'No reason given')}</p>
        </div>
        <span className={statusClass(status)}>{status}</span>
      </div>
      {status === 'PENDING' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => mutation.mutate('APPROVED')} disabled={mutation.isPending} className="btn-outline px-3 py-1.5 text-xs">Approve</button>
          <button onClick={() => mutation.mutate('REJECTED')} disabled={mutation.isPending} className="btn-ghost px-3 py-1.5 text-xs text-danger hover:bg-danger-bg">Reject</button>
        </div>
      )}
    </div>
  );
}

function LeaveModal({ students, onClose, onSaved }: { students: Student[]; onClose: () => void; onSaved: () => void }) {
  const studentsQuery = useQuery({
    queryKey: ['attendance-leave-students'],
    queryFn: () => Students.list({ page: 1, limit: 200 }),
  });
  const availableStudents = students.length > 0 ? students : (studentsQuery.data?.students ?? []);
  const [form, setForm] = useState({
    studentId: '',
    startDate: inputDate(),
    endDate: inputDate(),
    reason: '',
  });

  useEffect(() => {
    if (!form.studentId && availableStudents.length) {
      setForm((current) => ({ ...current, studentId: availableStudents[0].id }));
    }
  }, [availableStudents, form.studentId]);

  const save = useMutation({
    mutationFn: () => AttendanceApi.submitLeave(form),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Leave request logged');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to submit leave'),
  });

  return (
    <Modal
      title="Submit leave request"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.studentId || !form.reason} className="btn-primary">
            {save.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Student">
          <div>
            <select
              className="input mt-2"
              value={form.studentId}
              onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            >
              <option value="">Select student</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
              ))}
            </select>
            {!availableStudents.length && (
              <p className="mt-2 text-xs text-ink-400">
                {studentsQuery.isLoading ? 'Loading students...' : 'No students available yet.'}
              </p>
            )}
          </div>
        </Field>
        <Field label="Start date">
          <input className="input mt-2" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        </Field>
        <Field label="End date">
          <input className="input mt-2" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
        </Field>
      </div>
      <Field label="Reason" className="mt-3">
        <textarea className="input mt-2 min-h-[120px]" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      </Field>
    </Modal>
  );
}

function StudentLogsModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['attendance-student-logs', student.id],
    queryFn: () => AttendanceApi.forStudent(student.id),
  });
  const logs = rowsFrom<any>(query.data, ['logs', 'data']);

  return (
    <Modal title={`${student.firstName} ${student.lastName}`} onClose={onClose} size="lg" footer={<button onClick={onClose} className="btn-ghost">Close</button>}>
      <div className="flex items-center gap-3">
        <Avatar name={`${student.firstName} ${student.lastName}`} />
        <div>
          <p className="font-semibold text-ink-900">{student.email || compactId(student.id)}</p>
          <p className="text-xs text-ink-400">Student ID {student.id}</p>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead className="bg-muted/60">
            <tr><th className="table-header">Date</th><th className="table-header">Status</th><th className="table-header">Method</th><th className="table-header">Remarks</th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={idOf(log)} className="hover:bg-muted/40">
                <td className="table-cell">{formatDate(textOf(log, ['date'], ''))}</td>
                <td className="table-cell"><span className={statusClass(textOf(log, ['status'], ''))}>{textOf(log, ['status'])}</span></td>
                <td className="table-cell">{textOf(log, ['method'])}</td>
                <td className="table-cell">{textOf(log, ['remarks'])}</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">No logs returned for this student.</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Field({ label, children, className }: { label: string; children: JSX.Element; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
      {name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ST'}
    </span>
  );
}
