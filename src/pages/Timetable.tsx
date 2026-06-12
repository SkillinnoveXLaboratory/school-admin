import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic, HR } from '@/lib/api/services';
import type { AcademicClass } from '@/lib/api/types';
import { compactId, fullName, idOf, rowsFrom, textOf } from '@/lib/viewUtils';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const TONES = ['bg-brand-50 text-brand-700', 'bg-info-bg text-info', 'bg-success-bg text-success', 'bg-warning-bg text-warning', 'bg-danger-bg text-danger'];

export function TimetablePage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [adding, setAdding] = useState(false);

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => Academic.classes.list() });
  const employeesQuery = useQuery({ queryKey: ['hr-employees', 'timetable'], queryFn: () => HR.employees.list({ page: 1, limit: 100 }) });
  const classes = classesQuery.data?.classes ?? [];
  const employees = employeesQuery.data?.employees ?? [];
  const selectedClass = classes.find((item) => item.id === classId);
  const sections = selectedClass?.sections ?? [];
  const selectedSection = sections.find((section) => section.id === sectionId);

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  useEffect(() => {
    if (!selectedClass) return;
    if (!sectionId || !selectedClass.sections.some((section) => section.id === sectionId)) {
      setSectionId(selectedClass.sections[0]?.id ?? '');
    }
  }, [selectedClass, sectionId]);

  const timetableQuery = useQuery({
    queryKey: ['timetable', classId, sectionId],
    queryFn: () => Academic.timetable.forSection(classId, sectionId),
    enabled: Boolean(classId && sectionId),
  });
  const slots = rowsFrom<any>(timetableQuery.data, ['timetable', 'data']);
  const teacherDirectory = useMemo(() => buildTeacherDirectory(slots), [slots]);
  const subjectDirectory = useMemo(() => buildSubjectDirectory(slots), [slots]);
  const periods = useMemo(() => {
    const unique = new Set(slots.map((slot) => `${textOf(slot, ['startTime'], '')}-${textOf(slot, ['endTime'], '')}`).filter((time) => time !== '-'));
    return [...unique].sort();
  }, [slots]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 5"
        title="Timetable"
        subtitle="Live weekly class-section timetable loaded from the backend."
        actions={
          <>
            <select className="input h-10 w-full sm:w-56" value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId(''); }}>
              <option value="">Select class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="input h-10 w-full sm:w-48" value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              <option value="">Select section</option>
              {sections.map((section) => <option key={section.id} value={section.id}>{section.name || section.sectionName || compactId(section.id)}</option>)}
            </select>
            <button onClick={() => setAdding(true)} disabled={!classId || !sectionId} className="btn-primary"><Icon name="plus" size={16} /> Add slot</button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Class" value={selectedClass?.name ?? '—'} />
        <Stat label="Section" value={selectedSection?.name || selectedSection?.sectionName || '—'} />
        <Stat label="Slots" value={slots.length} />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Weekly grid</h2>
            <p className="text-sm text-ink-500">Source: {textOf(timetableQuery.data, ['source'], 'live API')}</p>
          </div>
          <button onClick={() => timetableQuery.refetch()} className="btn-outline px-3 py-2 text-xs">Refresh</button>
        </div>

        <div className="overflow-x-auto p-3 sm:p-4">
          {periods.length > 0 ? (
            <table className="w-full min-w-[900px] border-separate" style={{ borderSpacing: 8 }}>
              <thead>
                <tr>
                  <th className="w-28 pb-1 text-left text-xs font-semibold text-ink-400">Period</th>
                  {DAYS.map((day) => <th key={day} className="pb-1 text-left text-xs font-semibold text-ink-400">{prettyDay(day)}</th>)}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const [start, end] = period.split('-');
                  return (
                    <tr key={period}>
                      <td className="align-middle font-mono text-xs text-ink-400">{start}<br />{end}</td>
                      {DAYS.map((day, dayIndex) => {
                        const slot = slots.find((item) => textOf(item, ['dayOfWeek'], '') === day && textOf(item, ['startTime'], '') === start);
                        return (
                          <td key={`${period}-${day}`} className="align-top">
                            {slot ? (
                              <SlotCard
                                slot={slot}
                                tone={TONES[(periods.indexOf(period) + dayIndex) % TONES.length]}
                                teacherLabel={resolveTeacherName(idOf(slot.teacherId), employees, teacherDirectory)}
                              />
                            ) : (
                              <div className="min-h-[82px] rounded-xl border border-dashed border-line bg-muted/20" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-400">
              {timetableQuery.isLoading ? 'Loading timetable...' : 'No timetable slots returned for this class section.'}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => (
          <div key={idOf(slot)} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">{prettyDay(textOf(slot, ['dayOfWeek'], ''))}</p>
                <h3 className="mt-1 font-display text-base font-semibold">{subjectName(slot.subjectId)}</h3>
                <p className="mt-1 text-sm text-ink-500">{resolveTeacherName(idOf(slot.teacherId), employees, teacherDirectory)}</p>
              </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="chip-brand">{textOf(slot, ['startTime'])}-{textOf(slot, ['endTime'])}</span>
                </div>
              </div>
            </div>
          ))}
      </section>

      <AnimatePresence>
        {adding && (
          <AddSlotModal
            classes={classes}
            classId={classId}
            sectionId={sectionId}
            employees={employeesQuery.data?.employees ?? []}
            teacherDirectory={teacherDirectory}
            subjectDirectory={subjectDirectory}
            onClose={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              qc.invalidateQueries({ queryKey: ['timetable'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddSlotModal({
  classes,
  classId,
  sectionId,
  employees,
  teacherDirectory,
  subjectDirectory,
  onClose,
  onSaved,
}: {
  classes: AcademicClass[];
  classId: string;
  sectionId: string;
  employees: any[];
  teacherDirectory: Record<string, string>;
  subjectDirectory: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const selectedClass = classes.find((item) => item.id === classId);
  const selectedSection = selectedClass?.sections.find((section) => section.id === sectionId);
  const subjects = dedupeSubjects(selectedSection?.subjects ?? []);
  const subjectDetailQueries = useQueries({
    queries: subjects.map((subject) => ({
      queryKey: ['timetable-subject-detail', subject.subjectId],
      queryFn: () => Academic.subjects.get(subject.subjectId),
      enabled: Boolean(subject.subjectId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const subjectOptions = useMemo(
    () => subjects.map((subject, index) => {
      const query = subjectDetailQueries[index] as any;
      const detail = query?.data?.subject ?? query?.data?.data;
      const subjectLabel = detail?.subjectName || subjectDirectory[subject.subjectId] || `Subject ${compactId(subject.subjectId)}`;
      const subjectCode = detail?.subjectCode || '';
      const teacherLabel = subject.teacherId ? teacherDirectory[subject.teacherId] || 'Teacher' : 'Teacher';
      return {
        ...subject,
        subjectLabel,
        subjectCode,
        teacherLabel,
      };
    }),
    [subjects, subjectDetailQueries, subjectDirectory, teacherDirectory],
  );
  const liveSubjectDirectory = useMemo(() => {
    const directory = { ...subjectDirectory };
    subjectOptions.forEach((subject) => {
      directory[subject.subjectId] = subject.subjectLabel;
    });
    return directory;
  }, [subjectDirectory, subjectOptions]);
  const [form, setForm] = useState({
    classId,
    sectionId,
    subjectId: subjects[0]?.subjectId ?? '',
    teacherId: subjects[0]?.teacherId ?? '',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '09:40',
  });
  const selectedSubject = subjectOptions.find((subject) => subject.subjectId === form.subjectId) ?? subjectOptions[0];
  const linkedTeacherId = selectedSubject?.teacherId ?? '';
  const linkedTeacherName = resolveTeacherName(linkedTeacherId, employees, teacherDirectory);
  useEffect(() => {
    if (linkedTeacherId && form.teacherId !== linkedTeacherId) {
      setForm((current) => ({ ...current, teacherId: linkedTeacherId }));
    }
  }, [linkedTeacherId, form.teacherId]);
  const save = useMutation({
    mutationFn: () => Academic.timetable.addSlot(form),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Timetable slot created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create slot'),
  });

  return (
    <Modal
      title="Add timetable slot"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.subjectId || !form.teacherId} className="btn-primary">
            {save.isPending ? 'Creating...' : 'Create slot'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Subject linked to section</label>
          <select
            className="input mt-2"
            value={form.subjectId}
            onChange={(event) => {
              const selected = subjects.find((subject) => subject.subjectId === event.target.value);
              setForm({ ...form, subjectId: event.target.value, teacherId: selected?.teacherId || form.teacherId });
            }}
          >
            <option value="">Select subject</option>
            {subjects.map((subject) => {
              const subjectLabel = liveSubjectDirectory[subject.subjectId] || `Subject ${compactId(subject.subjectId)}`;
              const teacherLabel = subject.teacherId ? teacherDirectory[subject.teacherId] || 'Teacher' : 'Teacher';
              return (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subjectLabel} - {teacherLabel}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="label">Teacher name</label>
          <input
            className="input mt-2"
            value={linkedTeacherName || 'Teacher not linked'}
            readOnly
            disabled
          />
          <p className="mt-1 text-[11px] text-ink-400">
            The teacher is linked from the selected subject and sent as the real teacher ID.
          </p>
        </div>
        <div>
          <label className="label">Day</label>
          <select className="input mt-2" value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value })}>
            {DAYS.map((day) => <option key={day} value={day}>{prettyDay(day)}</option>)}
          </select>
        </div>
        <Input label="Start time" type="time" value={form.startTime} onChange={(startTime) => setForm({ ...form, startTime })} />
        <Input label="End time" type="time" value={form.endTime} onChange={(endTime) => setForm({ ...form, endTime })} />
      </div>
      {!subjects.length && <p className="mt-3 text-xs text-warning">This section has no linked subject IDs in `/classes`; link subjects before creating slots.</p>}
    </Modal>
  );
}


function SlotCard({ slot, tone, teacherLabel }: { slot: any; tone: string; teacherLabel: string }) {
  return (
    <div className={clsx('min-h-[82px] rounded-xl p-3 transition-all hover:scale-[1.01]', tone)}>
      <div className="text-[12px] font-semibold">{subjectName(slot.subjectId)}</div>
      <div className="mt-1 text-[10px] opacity-75">{teacherLabel || 'Teacher not linked'}</div>
      <div className="mt-2 text-[10px] opacity-70">{textOf(slot, ['startTime'])} to {textOf(slot, ['endTime'])}</div>
    </div>
  );
}

function subjectName(value: any) {
  return textOf(value, ['subjectName', 'name'], compactId(value));
}

function teacherName(value: any) {
  return fullName(value, compactId(value));
}

function prettyDay(day: string) {
  if (!day) return '—';
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function dedupeSubjects(subjects: { subjectId: string; teacherId?: string }[]) {
  const seen = new Set<string>();
  return subjects.filter((subject) => {
    if (!subject.subjectId || seen.has(subject.subjectId)) return false;
    seen.add(subject.subjectId);
    return true;
  });
}

function buildTeacherDirectory(slots: any[]) {
  const directory: Record<string, string> = {};
  slots.forEach((slot) => {
    const teacherId = idOf(slot.teacherId);
    const label = teacherLabel(slot.teacherId);
    if (teacherId && label) directory[teacherId] = label;
  });
  return directory;
}

function buildSubjectDirectory(slots: any[]) {
  const directory: Record<string, string> = {};
  slots.forEach((slot) => {
    const subjectId = idOf(slot.subjectId);
    const label = textOf(slot.subjectId, ['subjectName', 'name'], '');
    if (subjectId && label) directory[subjectId] = label;
  });
  return directory;
}

function teacherLabel(value: any) {
  if (!value || typeof value === 'string') return '';
  return fullName(value, textOf(value, ['email'], ''));
}

function resolveTeacherName(teacherId: string, employees: any[], teacherDirectory: Record<string, string>) {
  if (!teacherId) return '';
  const liveTeacher = employees.find((employee) => (employee.userId || employee.id) === teacherId || employee.id === teacherId);
  if (liveTeacher) return fullName(liveTeacher, liveTeacher.email || compactId(teacherId));
  return teacherDirectory[teacherId] || compactId(teacherId);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

