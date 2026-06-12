import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { API_BASE_URL } from '@/lib/api/client';
import { Academic, Students as StudentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/stores/auth';
import type { AcademicClass, Student, StudentBirthdayTriggerReport, StudentIdCard, StudentProfileUpdate } from '@/lib/api/types';

type StatusFilter = 'ALL' | 'ENROLLED' | 'GRADUATED' | 'TRANSFERRED' | 'DE-ENROLLED' | 'INACTIVE';

interface StudentEditForm extends StudentProfileUpdate {
  firstName: string;
  lastName: string;
  email: string;
  classId: string;
  sectionId: string;
  emergencyContact: string;
}

export function StudentsPage() {
  const qc = useQueryClient();
  const { activeSchoolId } = useAuthStore();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [mode, setMode] = useState<'student' | 'edit' | 'parent' | null>(null);
  const [birthdayNotificationsEnabled, setBirthdayNotificationsEnabled] = useState(false);
  const [birthdayReport, setBirthdayReport] = useState<StudentBirthdayTriggerReport | null>(null);

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['students', activeSchoolId, q, page],
    enabled: Boolean(activeSchoolId),
    queryFn: () => StudentsApi.list({ page, limit: 12, q: q || undefined }),
  });

  const classesQuery = useQuery({
    queryKey: ['classes', activeSchoolId],
    enabled: Boolean(activeSchoolId),
    queryFn: () => Academic.classes.list(),
  });

  const students = data?.students ?? [];
  const meta = data?.meta ?? { total: 0, page, limit: 12, pages: 1 };
  const classLookup = useMemo(
    () => new Map((classesQuery.data?.classes ?? []).map((cls) => [cls.id, cls])),
    [classesQuery.data],
  );
  const rows = useMemo(() => {
    return students.filter((student) => {
      const matchesStatus = status === 'ALL' || normalizeStatus(student.status) === status;
      const haystack = [
        student.firstName,
        student.lastName,
        student.enrollmentNumber,
        student.email,
        student.parentContact?.fatherName,
        student.parentContact?.motherName,
        student.parentContact?.primaryPhone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = !q.trim() || haystack.includes(q.trim().toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [students, q, status]);

  const deleteStudent = useMutation({
    mutationFn: (id: string) => StudentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setActiveStudent(null);
      setMode(null);
      toast.success('Student de-enrolled');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to de-enroll student'),
  });

  const triggerBirthdays = useMutation({
    mutationFn: () => StudentsApi.triggerBirthdays(),
    onSuccess: (res) => {
      setBirthdayNotificationsEnabled(true);
      setBirthdayReport(res.report ?? null);
      toast.success(res.message || 'Birthday notifications triggered');
    },
    onError: (e: any) => {
      setBirthdayNotificationsEnabled(false);
      toast.error(e?.response?.data?.message || e?.message || 'Failed to trigger birthday notifications');
    },
  });

  function toggleBirthdayNotifications() {
    if (birthdayNotificationsEnabled) {
      setBirthdayNotificationsEnabled(false);
      toast.success('Birthday notifications turned off');
      return;
    }

    triggerBirthdays.mutate();
  }

  if (!activeSchoolId) {
    return (
      <div className="card p-6">
        <h1 className="font-display text-2xl font-bold">Students</h1>
        <p className="text-ink-500 mt-2">No school is connected to this session yet. Please sign in again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 3"
        title="Students"
        subtitle={`${meta.total} total · ${rows.length} shown${isFetching ? ' · updating…' : ''}`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-outline">
              <Icon name="arrow-right" size={16} className="rotate-180" /> Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page >= meta.pages} className="btn-outline">
              Next <Icon name="arrow-right" size={16} />
            </button>
          </div>
        )}
      />

      <div className="card p-4 md:p-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, enrollment #, email, parent contact…"
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'ENROLLED', 'GRADUATED', 'TRANSFERRED', 'DE-ENROLLED', 'INACTIVE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                status === s ? 'bg-surface shadow-soft text-ink-900' : 'bg-muted text-ink-500 hover:text-ink-900',
              )}
            >
              {labelStatus(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4 md:p-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="bell" size={18} className="text-brand-600" />
            <h3 className="font-display text-lg font-semibold">Birthday notifications</h3>
            <span className={birthdayNotificationsEnabled ? 'chip-success' : 'chip-warning'}>
              {birthdayNotificationsEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <p className="text-sm text-ink-500 max-w-3xl">
            When enabled, Schoolmate scans for students whose birthdays are today and sends notifications to their parents.
          </p>
          {birthdayReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <StatPill label="Scanned" value={String(birthdayReport.scannedCount ?? 0)} />
              <StatPill label="Birthdays" value={String(birthdayReport.birthdayCount ?? 0)} />
              <StatPill label="Notified" value={String(birthdayReport.notifiedCount ?? 0)} />
              <StatPill label="Errors" value={String(birthdayReport.errors?.length ?? 0)} />
            </div>
          )}
          {birthdayReport?.errors?.length ? (
            <div className="rounded-2xl border border-warning/30 bg-warning-bg/40 p-3 text-xs text-warning space-y-1">
              <p className="font-semibold">Dispatch warnings</p>
              <ul className="list-disc pl-5 space-y-1">
                {birthdayReport.errors.slice(0, 3).map((err, idx) => (
                  <li key={`${err}-${idx}`}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:items-stretch">
          <button
            type="button"
            onClick={toggleBirthdayNotifications}
            disabled={triggerBirthdays.isPending}
            className={clsx(
              'px-4 py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center justify-center gap-2',
              birthdayNotificationsEnabled ? 'btn-outline' : 'btn-primary',
            )}
          >
            <Icon name="bell" size={16} />
            {birthdayNotificationsEnabled
              ? 'Turn off'
              : triggerBirthdays.isPending
                ? 'Turning on...'
                : 'Turn on'}
          </button>
          <p className="text-xs text-ink-400 lg:text-center">
            {birthdayNotificationsEnabled ? 'Enabled for this session.' : 'Click to trigger today\'s birthday scan.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-warning bg-warning-bg/30 text-warning text-sm">
          Couldn&apos;t load students. Showing what is currently available. <span className="opacity-70">({String(error)})</span>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-muted/60 rounded-xl animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 grid place-items-center text-center px-6">
            <h3 className="font-display text-lg font-semibold mt-2">No students found</h3>
            <p className="text-ink-500 text-sm max-w-sm mt-1">Try another search term or filter.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-muted/60">
                  <tr>
                    <Th>Student</Th>
                    <Th>Email</Th>
                    <Th>Parent</Th>
                    <Th>Status</Th>
                    <Th className="text-right pr-6">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      onClick={() => {
                        setActiveStudent(student);
                        setMode('student');
                      }}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Td>
                        <StudentCell student={student} />
                      </Td>
                      <Td>{student.email || '—'}</Td>
                      <Td>
                        <div className="text-sm">{student.parentContact?.fatherName || student.parentContact?.motherName || '—'}</div>
                        <div className="text-xs text-ink-400">{student.parentContact?.primaryPhone || '—'}</div>
                      </Td>
                      <Td>
                        <StatusChip status={student.status} />
                      </Td>
                      <Td className="text-right pr-6">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStudent(student);
                              setMode('student');
                            }}
                            className="btn-ghost py-1.5 px-3 text-xs"
                          >
                            Profile
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStudent(student);
                              setMode('student');
                            }}
                            className="btn-ghost py-1.5 px-3 text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      </Td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-line/60">
              {rows.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setActiveStudent(student);
                    setMode('student');
                  }}
                  className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-full bg-brand-gradient text-white grid place-items-center font-semibold text-xs shrink-0">
                      {initials(student.firstName, student.lastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold leading-tight" title={`${student.firstName} ${student.lastName}`}>
                            {truncateText(`${student.firstName} ${student.lastName}`, 10)}
                          </div>
                          <div className="text-xs text-ink-400 mt-1">{student.enrollmentNumber || '—'}</div>
                        </div>
                        <StatusChip status={student.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-500">
                        <span className="truncate">Email: {student.email || '—'}</span>
                        <span className="truncate">Parent: {student.parentContact?.primaryPhone || '—'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {activeStudent && mode === 'student' && (
          <StudentDetailModal
            student={activeStudent}
            classLookup={classLookup}
            onClose={() => setMode(null)}
            onEdit={() => setMode('edit')}
            onParentEdit={() => setMode('parent')}
            onDelete={() => deleteStudent.mutate(activeStudent.id)}
          />
        )}
        {activeStudent && mode === 'edit' && (
          <StudentEditModal
            student={activeStudent}
            classes={classesQuery.data?.classes ?? []}
            onClose={() => setMode('student')}
            onSaved={(updated, values) => {
              if (updated) setActiveStudent(updated);
              else if (values) {
                setActiveStudent((current) => (current ? ({ ...current, ...values } as Student) : current));
              }
              qc.invalidateQueries({ queryKey: ['students'] });
              setMode('student');
            }}
            onDelete={() => deleteStudent.mutate(activeStudent.id)}
          />
        )}
        {activeStudent && mode === 'parent' && (
          <ParentModal
            student={activeStudent}
            onClose={() => setMode('student')}
            onSaved={(updated) => {
              if (updated) setActiveStudent(updated);
              qc.invalidateQueries({ queryKey: ['students'] });
              setMode('student');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StudentDetailModal({
  student,
  classLookup,
  onClose,
  onEdit,
  onParentEdit,
  onDelete,
}: {
  student: Student;
  classLookup: Map<string, { id: string; name: string; sections?: { id: string; name: string; sectionName?: string }[] }>;
  onClose: () => void;
  onEdit: () => void;
  onParentEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal
      title={`${student.firstName} ${student.lastName}`}
      onClose={onClose}
      size="full"
      closeLabel="Back to students"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onParentEdit} className="btn-outline text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
            <Icon name="parent" size={14} /> Edit parent
          </button>
          <button
            onClick={() => {
              if (confirm('De-enroll this student?')) onDelete();
            }}
            className="btn-ghost text-danger hover:bg-danger-bg text-xs md:text-sm px-3 py-2 w-full sm:w-auto"
          >
            De-enroll
          </button>
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button onClick={onEdit} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
            <Icon name="settings" size={14} /> Edit profile
          </button>
        </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-brand-50 via-white to-canvas border border-line">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-gradient text-white grid place-items-center font-display font-bold text-lg shrink-0 shadow-pop-30">
                {initials(student.firstName, student.lastName)}
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-semibold truncate">{student.firstName} {student.lastName}</h3>
                <p className="text-sm text-ink-500 font-mono truncate">{formatAge(student.dateOfBirth)}</p>
                <div className="mt-2"><StatusChip status={student.status} /></div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <StatPill label="Student ID" value={student.id} mono />
              <StatPill label="Gender" value={student.gender} />
              <StatPill label="DOB" value={formatDate(student.dateOfBirth)} />
              <StatPill label="Class" value={classLookup.get(student.classId)?.name || '—'} />
              <StatPill label="Section" value={resolveSectionName(classLookup.get(student.classId), student.sectionId) || '—'} />
            </div>
          </div>

        </div>

        <div className="space-y-4">
          <InfoCard title="Contact">
            <InfoRow label="Student ID" value={student.id} mono />
            <InfoRow label="Email" value={student.email || '—'} />
            <InfoRow label="Primary phone" value={student.parentContact?.primaryPhone ?? '—'} />
            <InfoRow label="Emergency contact" value={student.emergencyContact ?? '—'} />
            <InfoRow label="School ID" value={student.schoolId} mono />
            <InfoRow label="Class" value={classLookup.get(student.classId)?.name || '—'} />
            <InfoRow label="Section" value={resolveSectionName(classLookup.get(student.classId), student.sectionId) || '—'} />
          </InfoCard>

          <InfoCard
            title="Parent / Guardian"
            action={<button onClick={onParentEdit} className="btn-outline py-2 px-3 text-xs">Edit parent</button>}
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Row label="Father" value={student.parentContact?.fatherName ?? '—'} />
              <Row label="Mother" value={student.parentContact?.motherName ?? '—'} />
              <Row label="Primary phone" value={student.parentContact?.primaryPhone ?? '—'} />
              <Row label="Parent email" value={student.parentContact?.parentEmail ?? student.parentContact?.email ?? '—'} />
              <div className="sm:col-span-2">
                <Row label="Home address" value={student.parentContact?.address?.homeAddress ?? student.parentContact?.homeAddress ?? '—'} />
              </div>
            </dl>
          </InfoCard>
        </div>
      </div>
    </Modal>
  );
}

function StudentEditModal({
  student,
  classes,
  onClose,
  onSaved,
  onDelete,
}: {
  student: Student;
  classes: AcademicClass[];
  onClose: () => void;
  onSaved: (updated?: Student, values?: StudentEditForm) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<StudentEditForm>({
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email ?? '',
    classId: student.classId ?? '',
    sectionId: student.sectionId ?? '',
    emergencyContact: student.emergencyContact ?? '',
  });

  const selectedClass = classes.find((cls) => cls.id === form.classId);
  const availableSections = selectedClass?.sections ?? [];

  useEffect(() => {
    if (!selectedClass) return;
    if (availableSections.length === 0) {
      if (form.sectionId) {
        setForm((current) => ({ ...current, sectionId: '' }));
      }
      return;
    }

    const hasSection = availableSections.some((section) => section.id === form.sectionId);
    if (!hasSection) {
      setForm((current) => ({ ...current, sectionId: availableSections[0]?.id ?? '' }));
    }
  }, [availableSections, form.sectionId, selectedClass]);

  const save = useMutation({
    mutationFn: () => StudentsApi.update(student.id, form),
    onSuccess: (updated) => {
      toast.success('Student updated');
      onSaved(updated, form);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update student'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <Modal
      title={`Edit profile · ${student.firstName} ${student.lastName}`}
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button
            onClick={() => {
              if (confirm('De-enroll this student?')) onDelete();
            }}
            className="btn-ghost text-danger hover:bg-danger-bg text-xs md:text-sm px-3 py-2 w-full sm:w-auto"
          >
            De-enroll
          </button>
          <button onClick={submit} disabled={save.isPending} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
            <Icon name="check" size={14} /> {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Editable profile</p>
          <p className="text-sm text-ink-500 mt-1">
            Update the student profile, class assignment, and section assignment here.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="First name" value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} required />
            <Field label="Last name" value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} required />
            <div className="sm:col-span-2">
              <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            </div>
            <div>
              <label className="label">Class</label>
              <select
                className="input mt-2"
                value={form.classId}
                onChange={(e) => {
                  const nextClassId = e.target.value;
                  const nextClass = classes.find((cls) => cls.id === nextClassId);
                  const nextSectionId = nextClass?.sections?.[0]?.id ?? '';
                  setForm((current) => ({
                    ...current,
                    classId: nextClassId,
                    sectionId: nextSectionId,
                  }));
                }}
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {formatClassLabel(cls)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Section</label>
              <select
                className="input mt-2"
                value={form.sectionId}
                disabled={!selectedClass}
                onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
              >
                <option value="">{selectedClass ? 'Select section' : 'Select class first'}</option>
                {availableSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.sectionName || section.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Emergency contact" value={form.emergencyContact} onChange={(v) => setForm((f) => ({ ...f, emergencyContact: v }))} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ParentModal({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: (updated?: Student) => void }) {
  const [form, setForm] = useState({
    fatherName: student.parentContact?.fatherName ?? '',
    motherName: student.parentContact?.motherName ?? '',
    primaryPhone: student.parentContact?.primaryPhone ?? '',
  });

  const save = useMutation({
    mutationFn: () => StudentsApi.updateParent(student.id, form),
    onSuccess: (updated) => {
      toast.success('Parent contact updated');
      onSaved(updated);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update parent'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <Modal
      title={`Parent details · ${student.firstName} ${student.lastName}`}
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button onClick={submit} disabled={save.isPending} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
            <Icon name="check" size={14} /> {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Parent contact</p>
          <p className="text-sm text-ink-500 mt-1">Keep these details current for emergency contact and communication.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="Father name" value={form.fatherName} onChange={(v) => setForm((f) => ({ ...f, fatherName: v }))} />
            <Field label="Mother name" value={form.motherName} onChange={(v) => setForm((f) => ({ ...f, motherName: v }))} />
            <Field label="Primary phone" value={form.primaryPhone} onChange={(v) => setForm((f) => ({ ...f, primaryPhone: v }))} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function IdCardModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-id-card', student.id],
    queryFn: () => StudentsApi.idCard(student.id),
  });

  return (
    <Modal
      title="Student ID Card"
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex justify-end gap-2 w-full">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Close</button>
        </div>
      )}
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-56 rounded-2xl bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      ) : error ? (
        <div className="text-sm text-danger">Could not load ID card preview.</div>
      ) : data ? (
        <StudentIdCardPreview card={data} onDownload={() => openPrintableStudentIdCard(data)} />
      ) : null}
    </Modal>
  );
}

function StudentIdCardPreview({
  card,
  loading = false,
  onDownload,
}: {
  card?: StudentIdCard;
  loading?: boolean;
  onDownload?: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-[30px] border border-[#cfe3ff] bg-white p-4 shadow-[0_24px_60px_rgba(31,87,186,0.12)]">
        <div className="h-72 rounded-[26px] bg-muted animate-pulse" />
      </div>
    );
  }

  if (!card) return null;

  const theme = getIdCardTheme(card);
  const displayName = card.fullName || card.name || 'Student';
  const primaryPhone = card.primaryPhone || '—';
  const emergencyPhone = card.emergencyPhone || '—';
  const dob = formatDate(card.dateOfBirth);
  const barcodeValue = card.qrCodeData || card.enrollmentNumber || card.studentId || displayName;
  const bars = generateBarcodeBars(barcodeValue);
  const initialsValue = initialsFromFullName(displayName);

  return (
    <div
      className="rounded-[30px] border p-4 shadow-[0_24px_60px_rgba(31,87,186,0.12)]"
      style={{
        borderColor: hexToRgba(theme.primaryColor, 0.22),
        background: `linear-gradient(135deg, ${hexToRgba(theme.primaryColor, 0.08)} 0%, #ffffff 52%, ${hexToRgba(theme.primaryColor, 0.06)} 100%)`,
      }}
    >
      <div className="overflow-hidden rounded-[28px] border bg-white" style={{ borderColor: hexToRgba(theme.primaryColor, 0.18) }}>
        <div
          className="relative px-5 pb-16 pt-5"
          style={{ background: theme.primaryColor, color: theme.textColor }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: hexToRgba(theme.textColor, 0.8) }}>Schoolmate</p>
              <h4 className="mt-1 font-display text-xl font-semibold">Student ID Card</h4>
            </div>
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{
                borderColor: hexToRgba(theme.textColor, 0.2),
                background: hexToRgba(theme.textColor, 0.14),
                color: theme.textColor,
              }}
            >
              {theme.template}
            </span>
          </div>
          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
            <div
              className="h-28 w-28 overflow-hidden rounded-full border-[6px] border-white bg-white shadow-[0_18px_40px_rgba(15,76,191,0.25)] ring-1 ring-white/40"
            >
              {card.photoUrl ? (
                <img
                  src={resolveAssetUrl(card.photoUrl)}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-bold text-white" style={{ background: theme.primaryColor }}>
                  {initialsValue}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-16">
          <div className="text-center">
            <h5 className="font-display text-2xl font-semibold text-ink-900">{displayName}</h5>
            <p className="mt-1 text-sm text-ink-500">Blue and white student identity card</p>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="chip-brand">Template: {theme.template}</span>
            <span className="chip-brand">Barcode: {theme.barcodeType}</span>
            {card.className ? <span className="chip-brand">{card.className}</span> : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CardStat label="School ID" value={card.schoolId || '—'} mono />
            <CardStat label="Student ID" value={card.studentId || '—'} mono />
            <CardStat label="Enrollment number" value={card.enrollmentNumber} mono />
            <CardStat label="Date of birth" value={dob} />
            <CardStat label="Primary phone" value={primaryPhone} />
            <CardStat label="Emergency phone" value={emergencyPhone} />
          </div>

          <div className="mt-4 rounded-[24px] border border-dashed p-4" style={{ borderColor: hexToRgba(theme.primaryColor, 0.35), background: hexToRgba(theme.primaryColor, 0.08) }}>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border bg-white p-3 shadow-sm" style={{ borderColor: hexToRgba(theme.primaryColor, 0.12) }}>
                <BarcodeGraphic value={barcodeValue} color={theme.primaryColor} bars={bars} />
              </div>
              <div className="w-full">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.primaryColor }}>
                  Barcode value
                </p>
                <p className="mt-1 break-all rounded-2xl border bg-white px-3 py-2 font-mono text-[11px] text-ink-700 shadow-sm" style={{ borderColor: hexToRgba(theme.primaryColor, 0.16) }}>
                  {barcodeValue}
                </p>
              </div>
            </div>
          </div>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="mt-4 w-full justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-soft transition-opacity hover:opacity-95"
              style={{ background: theme.primaryColor }}
            >
              <Icon name="download" size={16} />
              Download ID card
            </button>
          )}

          <p className="mt-2 text-center text-xs text-ink-400">
            Opens the browser print dialog so you can save as PDF.
          </p>
        </div>
      </div>
    </div>
  );
}

function CardStat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className={clsx('mt-1 text-sm font-semibold text-ink-900 break-all', mono && 'font-mono text-xs font-medium')}>{value || '—'}</p>
    </div>
  );
}

function openPrintableStudentIdCard(card: StudentIdCard) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!popup) {
    toast.error('Please allow popups to download the ID card.');
    return;
  }

  const theme = getIdCardTheme(card);
  const displayName = card.fullName || card.name || 'Student';
  const printableInitials = initialsFromFullName(displayName);
  const barcodeValue = card.qrCodeData || card.enrollmentNumber || card.studentId || displayName;
  const barcodeHtml = buildBarcodeHtml(barcodeValue, theme.primaryColor);
  const dob = formatDate(card.dateOfBirth);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(card.name)} - Student ID Card</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: linear-gradient(135deg, ${hexToRgba(theme.primaryColor, 0.12)} 0%, #ffffff 52%, ${hexToRgba(theme.primaryColor, 0.08)} 100%);
        color: #0f172a;
      }
      .sheet {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      .card {
        width: 360px;
        border-radius: 28px;
        overflow: hidden;
        background: #fff;
        border: 1px solid ${hexToRgba(theme.primaryColor, 0.2)};
        box-shadow: 0 24px 80px ${hexToRgba(theme.primaryColor, 0.16)};
      }
      .hero {
        position: relative;
        padding: 22px 22px 74px;
        color: ${theme.textColor};
        background: ${theme.primaryColor};
      }
      .hero h1 {
        margin: 6px 0 0;
        font-size: 24px;
        line-height: 1.1;
      }
      .badge {
        display: inline-block;
        border: 1px solid ${hexToRgba(theme.textColor, 0.25)};
        background: ${hexToRgba(theme.textColor, 0.14)};
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .avatar {
        position: absolute;
        left: 50%;
        bottom: 0;
        transform: translate(-50%, 50%);
        width: 112px;
        height: 112px;
        border-radius: 50%;
        border: 6px solid #fff;
        overflow: hidden;
        background: ${theme.primaryColor};
        box-shadow: 0 18px 40px ${hexToRgba(theme.primaryColor, 0.22)};
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .content {
        padding: 76px 22px 24px;
      }
      .title {
        text-align: center;
      }
      .title h2 {
        margin: 0;
        font-size: 26px;
      }
      .title p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 13px;
      }
      .grid {
        margin-top: 18px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .box {
        border-radius: 18px;
        border: 1px solid ${hexToRgba(theme.primaryColor, 0.16)};
        background: ${hexToRgba(theme.primaryColor, 0.05)};
        padding: 12px;
      }
      .label {
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #64748b;
      }
      .value {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 700;
        word-break: break-word;
      }
      .qr {
        margin-top: 12px;
        border-radius: 22px;
        border: 1px dashed ${hexToRgba(theme.primaryColor, 0.4)};
        background: ${hexToRgba(theme.primaryColor, 0.08)};
        padding: 14px;
      }
      .barcode {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 2px;
        min-height: 90px;
        padding: 10px 8px 6px;
        overflow: hidden;
      }
      .barcode span { display: block; background: #111827; border-radius: 1px; }
      .qrdata {
        border-radius: 16px;
        background: #fff;
        border: 1px solid ${hexToRgba(theme.primaryColor, 0.16)};
        padding: 10px 12px;
        font-family: Consolas, monospace;
        font-size: 11px;
        word-break: break-all;
      }
      .footer {
        margin-top: 14px;
        text-align: center;
        font-size: 11px;
        color: #94a3b8;
      }
      @media print {
        body { background: #fff; }
        .sheet { padding: 0; min-height: auto; }
        .card { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="card">
        <div class="hero">
          <div class="badge">Schoolmate</div>
          <h1>Student ID Card</h1>
          <div class="avatar">
            ${card.photoUrl ? `<img src="${resolveAssetUrl(card.photoUrl)}" alt="${escapeHtml(displayName)}" />` : `<div style="width:100%;height:100%;display:grid;place-items:center;color:#fff;font-size:32px;font-weight:700;">${escapeHtml(printableInitials)}</div>`}
          </div>
        </div>
        <div class="content">
          <div class="title">
            <h2>${escapeHtml(displayName)}</h2>
            <p>Premium blue and white identity card</p>
          </div>
          <div class="grid">
            <div class="box">
              <div class="label">School ID</div>
              <div class="value">${escapeHtml(card.schoolId || '—')}</div>
            </div>
            <div class="box">
              <div class="label">Student ID</div>
              <div class="value">${escapeHtml(card.studentId || '—')}</div>
            </div>
            <div class="box">
              <div class="label">Enrollment number</div>
              <div class="value">${escapeHtml(card.enrollmentNumber)}</div>
            </div>
            <div class="box">
              <div class="label">Date of birth</div>
              <div class="value">${escapeHtml(dob)}</div>
            </div>
            <div class="box">
              <div class="label">Primary phone</div>
              <div class="value">${escapeHtml(card.primaryPhone || '—')}</div>
            </div>
            <div class="box">
              <div class="label">Emergency phone</div>
              <div class="value">${escapeHtml(card.emergencyPhone || '—')}</div>
            </div>
          </div>
          <div class="grid">
            <div class="box">
              <div class="label">Template</div>
              <div class="value">${escapeHtml(theme.template)}</div>
            </div>
            <div class="box">
              <div class="label">Barcode type</div>
              <div class="value">${escapeHtml(theme.barcodeType)}</div>
            </div>
          </div>
          <div class="qr">
            <div class="barcode">${barcodeHtml}</div>
            <div class="label">Barcode value</div>
            <div class="qrdata">${escapeHtml(barcodeValue)}</div>
          </div>
          <div class="footer">Open Print and choose Save as PDF to download.</div>
        </div>
      </div>
    </div>
  </body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  const triggerPrint = () => {
    popup.focus();
    popup.print();
  };
  if (popup.document.readyState === 'complete') {
    setTimeout(triggerPrint, 400);
  } else {
    popup.onload = () => setTimeout(triggerPrint, 400);
  }
  popup.onafterprint = () => popup.close();
}

function getIdCardTheme(card: StudentIdCard) {
  return {
    template: card.layout?.template || 'STANDARD_A1',
    primaryColor: card.layout?.primaryColor || '#1E3A8A',
    textColor: card.layout?.textColor || '#FFFFFF',
    barcodeType: card.layout?.barcodeType || 'CODE128',
  };
}

function generateBarcodeBars(value: string) {
  const seedSource = value || 'SCHOOLMATE';
  let state = 0;
  for (let i = 0; i < seedSource.length; i += 1) {
    state = (state * 31 + seedSource.charCodeAt(i)) >>> 0;
  }

  return Array.from({ length: 42 }, (_, index) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    const width = 2 + (state % 3);
    const height = 34 + (state % 22);
    const tall = index % 7 === 0 || index % 11 === 0;
    return {
      width: tall ? width + 1 : width,
      height: tall ? height + 8 : height,
    };
  });
}

function BarcodeGraphic({
  value,
  color = '#0f172a',
  bars,
}: {
  value: string;
  color?: string;
  bars?: ReturnType<typeof generateBarcodeBars>;
}) {
  const lineBars = bars ?? generateBarcodeBars(value);
  return (
    <div className="w-full">
      <div className="flex items-end justify-center gap-[2px] overflow-hidden py-2">
        {lineBars.map((bar, index) => (
          <span
            key={`${bar.width}-${bar.height}-${index}`}
            style={{ width: `${bar.width}px`, height: `${bar.height}px`, background: color }}
            className="rounded-[1px]"
          />
        ))}
      </div>
    </div>
  );
}

function buildBarcodeHtml(value: string, color: string) {
  return generateBarcodeBars(value)
    .map((bar, index) => `<span style="width:${bar.width}px;height:${bar.height}px;background:${color};border-radius:1px;display:block;${index === 0 ? 'margin-left:2px;' : ''}"></span>`)
    .join('');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return `rgba(30, 58, 138, ${alpha})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="input mt-2" />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-ink-400 text-xs uppercase tracking-wider">{label}</dt>
      <dd className={clsx('text-ink-900 mt-0.5 break-words', mono && 'font-mono text-xs')}>{value || '—'}</dd>
    </div>
  );
}

function StatPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">{label}</p>
      <p className={clsx('mt-1 text-sm font-semibold text-ink-900 break-words', mono && 'font-mono text-xs font-medium')}>{value || '—'}</p>
    </div>
  );
}

function InfoCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">Section</p>
          <h4 className="font-display text-base font-semibold mt-1">{title}</h4>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3 bg-surface">
      <p className="text-[11px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className={clsx('mt-1 text-sm text-ink-900 break-all', mono && 'font-mono text-xs')}>{value || '—'}</p>
    </div>
  );
}

function StudentCell({ student }: { student: Student }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-brand-gradient text-white grid place-items-center font-semibold text-xs">
        {initials(student.firstName, student.lastName)}
      </div>
      <div>
        <div className="font-semibold">{student.firstName} {student.lastName}</div>
        <div className="text-xs text-ink-400">{student.gender} · DOB {formatDate(student.dateOfBirth)}</div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: Student['status'] }) {
  const normalized = normalizeStatus(status);
  if (normalized === 'ENROLLED') return <span className="chip-success">● Enrolled</span>;
  if (normalized === 'GRADUATED') return <span className="chip-brand">Graduated</span>;
  if (normalized === 'TRANSFERRED') return <span className="chip-warning">Transferred</span>;
  if (normalized === 'DE-ENROLLED') return <span className="chip-warning">De-enrolled</span>;
  return <span className="chip-warning">Inactive</span>;
}

function normalizeStatus(status: string): StatusFilter {
  return status === 'DEENROLLED' ? 'DE-ENROLLED' : (status as StatusFilter);
}

function labelStatus(status: StatusFilter) {
  if (status === 'DE-ENROLLED') return 'De-enrolled';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'S';
}

function initialsFromFullName(name: string) {
  const [firstName = '', lastName = ''] = name.trim().split(/\s+/);
  return initials(firstName, lastName);
}

function truncateText(value: string, maxLength: number) {
  if (!value) return '—';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatClassLabel(cls: AcademicClass) {
  if (typeof cls.numericLevel === 'number' && Number.isFinite(cls.numericLevel)) {
    return `${cls.name} · ${cls.numericLevel}`;
  }
  return cls.name;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toLocaleDateString();
}

function formatAge(value?: string) {
  if (!value) return '—';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return '—';

  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    years -= 1;
  }

  return `${years} year${years === 1 ? '' : 's'} old`;
}

function resolveAssetUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={clsx('table-header', className)}>{children}</th>;
}

function Td({ children, mono, className = '' }: { children: ReactNode; mono?: boolean; className?: string }) {
  return <td className={clsx('table-cell', mono && 'font-mono text-xs', className)}>{children}</td>;
}

function resolveSectionName(
  cls?: { sections?: { id: string; name: string; sectionName?: string }[] },
  sectionId?: string,
) {
  if (!cls || !sectionId) return undefined;
  return cls.sections?.find((section) => section.id === sectionId)?.sectionName
    || cls.sections?.find((section) => section.id === sectionId)?.name
    || undefined;
}

