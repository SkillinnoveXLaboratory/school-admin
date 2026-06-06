import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic, HR } from '@/lib/api/services';
import type { AcademicClass, AcademicSubject, AcademicSubjectLink, HREmployee } from '@/lib/api/types';
import { compactId, fullName } from '@/lib/viewUtils';

export function ClassesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<AcademicClass | null>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'classes' | 'subjects'>('classes');
  const [latestSubject, setLatestSubject] = useState<AcademicSubject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [linkClassId, setLinkClassId] = useState('');
  const [linkSectionId, setLinkSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => Academic.classes.list(),
  });
  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => Academic.subjects.list(),
  });
  const staffQuery = useQuery({
    queryKey: ['hr-employees', 'classes'],
    queryFn: () => HR.employees.list({ page: 1, limit: 100 }),
  });

  const classes = classesQuery.data?.classes ?? [];
  const subjects = subjectsQuery.data?.subjects ?? [];
  const teacherEmployees = useMemo(
    () => (staffQuery.data?.employees ?? []).filter((employee) => employee.role?.toUpperCase() === 'TEACHER'),
    [staffQuery.data?.employees],
  );
  const teacherDirectory = useMemo(() => buildTeacherDirectory(teacherEmployees), [teacherEmployees]);
  const selectedLinkClass = useMemo(
    () => classes.find((cls) => cls.id === linkClassId),
    [classes, linkClassId],
  );
  const selectedLinkSection = useMemo(
    () => selectedLinkClass?.sections?.find((section) => section.id === linkSectionId),
    [selectedLinkClass, linkSectionId],
  );

  useEffect(() => {
    setLinkSectionId('');
    setTeacherId('');
  }, [linkClassId]);

  useEffect(() => {
    if (selectedLinkSection?.classTeacherId) {
      setTeacherId(selectedLinkSection.classTeacherId);
    }
  }, [selectedLinkSection]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter((cls) => {
      const haystack = [
        cls.name,
        cls.numericLevel,
        cls.id,
        ...(cls.sections ?? []).map((section) => [section.name, section.sectionName, section.roomNumber, section.classTeacherId].filter(Boolean).join(' ')),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [classes, query]);

  const stats = useMemo(() => {
    const sectionTotal = classes.reduce((sum, cls) => sum + (cls.sections?.length ?? 0), 0);
    const withTeachers = classes.reduce(
      (sum, cls) => sum + (cls.sections ?? []).filter((section) => Boolean(section.classTeacherId)).length,
      0,
    );
    return {
      classCount: classes.length,
      sectionTotal,
      withTeachers,
    };
  }, [classes]);

  const createSubjectMut = useMutation({
    mutationFn: () => Academic.subjects.create({ subjectName, subjectCode }),
    onSuccess: (res) => {
      toast.success(res.message || 'Subject created');
      const created = res.subject ?? res.data ?? null;
      if (created) {
        setLatestSubject(created);
        setSubjectId(created.id);
      }
      setSubjectName('');
      setSubjectCode('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to create subject'),
  });

  const linkSubjectMut = useMutation({
    mutationFn: () => {
      if (!linkClassId || !linkSectionId || !subjectId || !teacherId) {
        throw new Error('Class, section, subject and teacher are required');
      }
      return Academic.subjects.linkToSection(linkClassId, linkSectionId, {
        subjectId,
        teacherId,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Subject linked to section');
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to link subject'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 5"
        title="Classes & sections"
        subtitle="Manage class levels and append sections under each class from the live tenant API."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-line bg-surface p-1 shadow-soft">
              {([
                { key: 'classes', label: 'Classes' },
                { key: 'subjects', label: 'Subjects' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setView(tab.key)}
                  className={clsx(
                    'px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors',
                    view === tab.key ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {view === 'classes' ? (
              <button onClick={() => setCreating(true)} className="btn-primary">
                <Icon name="plus" size={16} /> Add class
              </button>
            ) : (
              <button onClick={() => setView('subjects')} className="btn-primary">
                <Icon name="plus" size={16} /> Create / link subject
              </button>
            )}
          </div>
        )}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Classes', value: stats.classCount, tone: 'brand' },
          { label: 'Sections', value: stats.sectionTotal, tone: 'info' },
          { label: 'Teacher-linked', value: stats.withTeachers, tone: 'success' },
          { label: 'Filtered', value: filtered.length, tone: 'warning' },
        ].map((stat) => (
          <article key={stat.label} className="stat-card">
            <p className="label">{stat.label}</p>
            <div className="mt-2 font-display text-3xl font-bold">{stat.value}</div>
          </article>
        ))}
      </section>

      <section className="card p-4 sm:p-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search class, section, room or teacher ID..."
            className="input pl-9"
          />
        </div>
        <div className="text-sm text-ink-500">
          Showing <span className="font-semibold text-ink-900">{filtered.length}</span> of {classes.length} classes
        </div>
      </section>

      {classesQuery.error && (
        <div className="card p-4 border-warning bg-warning-bg/30 text-warning text-sm">
          Couldn&apos;t load classes. <span className="opacity-70">({String(classesQuery.error)})</span>
        </div>
      )}

      {view === 'classes' && (
      <div className="card overflow-hidden">
        {classesQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-muted/60 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center">
              <Icon name="school" size={28} />
            </div>
            <h3 className="font-display text-xl font-semibold mt-4">No classes found</h3>
            <p className="text-ink-500 text-sm mt-1 max-w-md mx-auto">
              Create a class level first, then add sections under it.
            </p>
            <button onClick={() => setCreating(true)} className="btn-primary mt-5">
              <Icon name="plus" size={16} /> Add class
            </button>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full">
                <thead className="bg-muted/60">
                  <tr>
                    <Th>Class</Th>
                    <Th>Sections</Th>
                    <Th>Teacher-linked</Th>
                    <Th>Updated</Th>
                    <Th className="text-right pr-6">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cls) => (
                    <tr key={cls.id} onClick={() => setOpen(cls)} className="hover:bg-muted/40 transition-colors cursor-pointer">
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-brand-gradient text-white grid place-items-center text-xs font-semibold shrink-0">
                            {initials(cls.name)}
                          </div>
                          <div>
                            <div className="font-semibold">{cls.name}</div>
                            <div className="text-xs text-ink-400">
                              {cls.numericLevel !== undefined ? `Level ${cls.numericLevel}` : 'No numeric level'} | ID: {cls.id}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          {(cls.sections ?? []).length > 0
                            ? cls.sections.map((section) => (
                                <span key={section.id} className="chip-brand">
                                  {sectionLabel(section)}
                                </span>
                              ))
                            : <span className="text-sm text-ink-400">No sections yet</span>}
                        </div>
                      </Td>
                      <Td>{countTeacherLinked(cls)}</Td>
                      <Td className="text-ink-500 text-xs">{formatDate(cls.updatedAt)}</Td>
                      <Td className="text-right pr-6">
                        <button onClick={(e) => { e.stopPropagation(); setOpen(cls); }} className="btn-ghost py-1.5 px-3 text-xs">
                          Manage
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden p-3">
              {filtered.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setOpen(cls)}
                  className="rounded-2xl border border-line bg-surface p-4 text-left hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{cls.name}</div>
                      <div className="text-xs text-ink-400 mt-1">
                        {cls.numericLevel !== undefined ? `Level ${cls.numericLevel}` : 'No numeric level'} | {cls.id.slice(0, 8)}...
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-brand-50 grid place-items-center text-brand-600">
                      <Icon name="school" />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(cls.sections ?? []).length > 0
                      ? cls.sections.map((section) => (
                          <span key={section.id} className="chip-brand">
                            {sectionLabel(section)}
                          </span>
                        ))
                      : <span className="text-xs text-ink-400">No sections yet</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                    <span>{(cls.sections ?? []).length} sections</span>
                    <span>{countTeacherLinked(cls)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      )}

      {view === 'subjects' && (
        <SubjectsPanel
          classes={classes}
          subjects={subjects}
          teacherOptions={teacherEmployees}
          latestSubject={latestSubject}
          subjectName={subjectName}
          setSubjectName={setSubjectName}
          subjectCode={subjectCode}
          setSubjectCode={setSubjectCode}
          createPending={createSubjectMut.isPending}
          onCreateSubject={() => createSubjectMut.mutate()}
          subjectId={subjectId}
          setSubjectId={setSubjectId}
          linkClassId={linkClassId}
          setLinkClassId={setLinkClassId}
          linkSectionId={linkSectionId}
          setLinkSectionId={setLinkSectionId}
          teacherId={teacherId}
          setTeacherId={setTeacherId}
          onLinkSubject={() => linkSubjectMut.mutate()}
          linkPending={linkSubjectMut.isPending}
        />
      )}

      <AnimatePresence>
        {creating && (
          <ClassFormModal
            onClose={() => setCreating(false)}
            onSaved={(created) => {
              qc.invalidateQueries({ queryKey: ['classes'] });
              setCreating(false);
              if (created) setOpen(created);
            }}
          />
        )}
        {open && (
          <ClassManagerModal
            cls={open}
            teacherDirectory={teacherDirectory}
            teacherOptions={teacherEmployees}
            onClose={() => setOpen(null)}
            onChanged={(updated) => {
              qc.invalidateQueries({ queryKey: ['classes'] });
              if (updated) setOpen(updated);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClassFormModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (created?: AcademicClass) => void;
}) {
  const [className, setClassName] = useState('');
  const createMut = useMutation({
    mutationFn: () => Academic.classes.create({ className }),
    onSuccess: (res) => {
      toast.success(res.message || 'Class created');
      onSaved(res.class);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to create class'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    createMut.mutate();
  }

  return (
    <Modal
      title="Add class"
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button
            onClick={submit}
            disabled={createMut.isPending || !className.trim()}
            className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto"
          >
            {createMut.isPending ? 'Creating...' : 'Create class'}
          </button>
        </div>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Academic level</p>
          <div className="mt-4">
            <label className="label">Class name</label>
            <input
              className="input mt-2"
              placeholder="Grade 11"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          <p className="text-xs text-ink-400 mt-3">
            The API only requires the class name. Numeric level and sections are managed separately.
          </p>
        </section>
      </form>
    </Modal>
  );
}

function ClassDetailModal({
  cls,
  teacherDirectory,
  teacherOptions,
  onClose,
  onChanged,
}: {
  cls: AcademicClass;
  teacherDirectory: Record<string, string>;
  teacherOptions: HREmployee[];
  onClose: () => void;
  onChanged: (updated?: AcademicClass) => void;
}) {
  const [newSection, setNewSection] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [viewingSectionId, setViewingSectionId] = useState<string | null>(null);
  const addSection = useMutation({
    mutationFn: () => Academic.classes.addSection(cls.id, {
      sectionName: newSection,
      classTeacherId: classTeacherId.trim() || undefined,
    }),
    onSuccess: (res) => {
      toast.success(res.message || 'Section added');
      if (res.class) onChanged(res.class);
      setNewSection('');
      setClassTeacherId('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to add section'),
  });

  return (
    <Modal
      title={cls.name}
      onClose={onClose}
      size="xl"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Close</button>
        </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <section className="rounded-3xl border border-line bg-gradient-to-br from-brand-50 via-white to-canvas p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-brand-600 font-bold">Class</p>
              <h3 className="font-display text-2xl font-semibold mt-2">{cls.name}</h3>
              <p className="text-sm text-ink-500 mt-1">ID: <span className="font-mono">{cls.id}</span></p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-brand-gradient text-white grid place-items-center">
              <Icon name="school" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Numeric level" value={cls.numericLevel !== undefined ? String(cls.numericLevel) : '—'} />
            <MiniStat label="Sections" value={String(cls.sections?.length ?? 0)} />
            <MiniStat label="Updated" value={formatDate(cls.updatedAt)} />
            <MiniStat label="Teacher-linked" value={String(countTeacherLinked(cls))} />
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Sections</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(cls.sections ?? []).length > 0 ? (
                cls.sections.map((section) => (
                  <article key={section.id} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-brand-600 font-bold">Section</p>
                          <h4 className="mt-1 text-lg font-semibold text-ink-900">{sectionLabel(section)}</h4>
                          <p className="mt-1 text-xs text-ink-400 break-all">Section ID: {section.id}</p>
                        </div>
                        <span className="chip-brand shrink-0">{section.subjects?.length ?? 0} subjects</span>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-line bg-canvas px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">Room</p>
                          <p className="mt-1 text-sm font-semibold text-ink-900">{section.roomNumber || 'Not assigned'}</p>
                        </div>
                        <div className="rounded-2xl border border-line bg-canvas px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">Class teacher</p>
                          <p className="mt-1 text-sm font-semibold text-ink-900">
                            {resolveTeacherName(section.classTeacherId, teacherDirectory)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-line bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <p className="text-xs text-ink-500">
                        {viewingSectionId === section.id
                          ? 'Linked subjects are shown below.'
                          : 'Open this section to review the live subject links.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setViewingSectionId((current) => (current === section.id ? null : section.id))}
                        className="btn-ghost w-full sm:w-auto px-3 py-2 text-xs"
                      >
                        {viewingSectionId === section.id ? 'Hide subjects' : 'View subjects'}
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {viewingSectionId === section.id && (
                        <SectionSubjectsPanel
                          key={section.id}
                          classId={cls.id}
                          section={section}
                          teacherDirectory={teacherDirectory}
                        />
                      )}
                    </AnimatePresence>
                  </article>
                ))
              ) : (
                <div className="text-sm text-ink-500">No sections added yet.</div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Add section</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Section name</label>
                <input
                  className="input mt-2"
                  placeholder="Section A"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Class teacher</label>
                <select
                  className="input mt-2"
                  value={classTeacherId}
                  onChange={(e) => setClassTeacherId(e.target.value)}
                >
                  <option value="">No class teacher</option>
                  {teacherOptions.map((teacher) => {
                    const teacherId = teacher.id || teacher.userId || '';
                    return (
                      <option key={teacherId} value={teacherId}>
                        {fullName(teacher, teacher.email || compactId(teacherId))}
                      </option>
                    );
                  })}
                </select>
                {!teacherOptions.length && (
                  <p className="mt-2 text-xs text-ink-400">No TEACHER employees are available yet.</p>
                )}
              </div>
              <button
                onClick={() => addSection.mutate()}
                disabled={addSection.isPending || !newSection.trim()}
                className="btn-primary w-full"
              >
                <Icon name="plus" size={16} /> {addSection.isPending ? 'Saving...' : 'Add section'}
              </button>
            </div>
            <p className="text-xs text-ink-400 mt-3">
              The API supports optional class teacher assignment when creating a section.
            </p>
          </div>

        </aside>
      </div>
    </Modal>
  );
}

function ClassManagerModal({
  cls,
  teacherDirectory,
  teacherOptions,
  onClose,
  onChanged,
}: {
  cls: AcademicClass;
  teacherDirectory: Record<string, string>;
  teacherOptions: HREmployee[];
  onClose: () => void;
  onChanged: (updated?: AcademicClass) => void;
}) {
  const [viewingSectionId, setViewingSectionId] = useState<string | null>(cls.sections?.[0]?.id ?? null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const sections = cls.sections ?? [];

  useEffect(() => {
    setViewingSectionId(cls.sections?.[0]?.id ?? null);
    setAddSectionOpen(false);
  }, [cls.id]);

  return (
    <>
      <Modal title={`Manage ${cls.name}`} onClose={onClose} size="full" closeLabel="Back to classes">
        <div className="space-y-5">
          <section className="rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-white to-canvas p-5 sm:p-6 shadow-soft">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-600 font-bold">Class manager</p>
                <h3 className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-ink-900">{cls.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-500">
                  <span className="chip-brand">ID: {cls.id}</span>
                  <span className="chip-brand">{cls.numericLevel !== undefined ? `Level ${cls.numericLevel}` : 'No numeric level'}</span>
                  <span className="chip-brand">{sections.length} sections</span>
                  <span className="chip-brand">{countTeacherLinked(cls)} teacher-linked</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setAddSectionOpen(true)} className="btn-primary w-full sm:w-auto">
                  <Icon name="plus" size={16} /> Add section
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="Numeric level" value={cls.numericLevel !== undefined ? String(cls.numericLevel) : '-'} />
              <MiniStat label="Sections" value={String(sections.length)} />
              <MiniStat label="Updated" value={formatDate(cls.updatedAt)} />
              <MiniStat label="Teacher-linked" value={String(countTeacherLinked(cls))} />
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <section className="rounded-[2rem] border border-line bg-surface p-4 sm:p-5 shadow-soft">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Sections</p>
                  <h4 className="mt-1 text-lg font-semibold text-ink-900">Live section cards</h4>
                </div>
                <span className="chip-brand">{sections.length} total</span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <article key={section.id} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-600 font-bold">Section</p>
                            <h4 className="mt-1 text-lg font-semibold text-ink-900">{sectionLabel(section)}</h4>
                            <p className="mt-1 text-xs text-ink-400 break-all">Section ID: {section.id}</p>
                          </div>
                          <span className="chip-brand shrink-0">{section.subjects?.length ?? 0} subjects</span>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-2xl border border-line bg-canvas px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">Room</p>
                            <p className="mt-1 text-sm font-semibold text-ink-900">{section.roomNumber || 'Not assigned'}</p>
                          </div>
                          <div className="rounded-2xl border border-line bg-canvas px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">Class teacher</p>
                            <p className="mt-1 text-sm font-semibold text-ink-900">
                              {resolveTeacherName(section.classTeacherId, teacherDirectory)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-line bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <p className="text-xs text-ink-500">
                          {viewingSectionId === section.id
                            ? 'Linked subjects are shown below.'
                            : 'Open this section to review the live subject links.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setViewingSectionId((current) => (current === section.id ? null : section.id))}
                          className="btn-ghost w-full sm:w-auto px-3 py-2 text-xs"
                        >
                          {viewingSectionId === section.id ? 'Hide subjects' : 'View subjects'}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {viewingSectionId === section.id && (
                          <SectionSubjectsPanel
                            key={section.id}
                            classId={cls.id}
                            section={section}
                            teacherDirectory={teacherDirectory}
                          />
                        )}
                      </AnimatePresence>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-line bg-white/70 p-5 text-sm text-ink-500">
                    No sections added yet. Use Add section to create the first one.
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-[2rem] border border-line bg-surface p-4 sm:p-5 shadow-soft">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Quick actions</p>
                <div className="mt-4 space-y-3 text-sm text-ink-600">
                  <p>Open a section to review linked subjects and teacher assignments.</p>
                  <p>The add section form is now separate, so this view stays clean on mobile and desktop.</p>
                </div>
                <button onClick={() => setAddSectionOpen(true)} className="btn-primary w-full mt-5">
                  <Icon name="plus" size={16} /> Add section
                </button>
              </div>

              <div className="rounded-[2rem] border border-line bg-brand-50/40 p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Class overview</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MiniStat label="Sections" value={String(sections.length)} />
                  <MiniStat label="Teachers" value={String(countTeacherLinked(cls))} />
                </div>
                <p className="mt-3 text-xs text-ink-500">
                  Use Back to classes to return to the list, or stay here and manage sections in full screen.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {addSectionOpen && (
          <AddSectionModal
            cls={cls}
            teacherOptions={teacherOptions}
            onClose={() => setAddSectionOpen(false)}
            onSaved={(updated) => {
              if (updated) onChanged(updated);
              setAddSectionOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function AddSectionModal({
  cls,
  teacherOptions,
  onClose,
  onSaved,
}: {
  cls: AcademicClass;
  teacherOptions: HREmployee[];
  onClose: () => void;
  onSaved: (updated?: AcademicClass) => void;
}) {
  const [newSection, setNewSection] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const addSection = useMutation({
    mutationFn: () => Academic.classes.addSection(cls.id, {
      sectionName: newSection,
      classTeacherId: classTeacherId.trim() || undefined,
    }),
    onSuccess: (res) => {
      toast.success(res.message || 'Section added');
      if (res.class) onSaved(res.class);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to add section'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    addSection.mutate();
  }

  return (
    <Modal
      title={`Add section to ${cls.name}`}
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button
            onClick={submit}
            disabled={addSection.isPending || !newSection.trim()}
            className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto"
          >
            <Icon name="plus" size={16} /> {addSection.isPending ? 'Saving...' : 'Add section'}
          </button>
        </div>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">New section</p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Section name</label>
              <input
                className="input mt-2"
                placeholder="Section A"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Class teacher</label>
              <select
                className="input mt-2"
                value={classTeacherId}
                onChange={(e) => setClassTeacherId(e.target.value)}
              >
                <option value="">No class teacher</option>
                {teacherOptions.map((teacher) => {
                  const teacherId = teacher.id || teacher.userId || '';
                  return (
                    <option key={teacherId} value={teacherId}>
                      {fullName(teacher, teacher.email || compactId(teacherId))}
                    </option>
                  );
                })}
              </select>
              {!teacherOptions.length && (
                <p className="mt-2 text-xs text-ink-400">No TEACHER employees are available yet.</p>
              )}
            </div>
          </div>
          <p className="text-xs text-ink-400 mt-3">
            The API supports optional class teacher assignment when creating a section.
          </p>
        </section>
      </form>
    </Modal>
  );
}

function SectionSubjectsPanel({
  classId,
  section,
  teacherDirectory,
}: {
  classId: string;
  section: AcademicClass['sections'][number];
  teacherDirectory: Record<string, string>;
}) {
  const subjectLinks = useMemo(() => uniqueSectionSubjects(section.subjects ?? []), [section.subjects]);
  const subjectQueries = useQueries({
    queries: subjectLinks.map((link) => ({
      queryKey: ['subject-detail', link.subjectId],
      queryFn: () => Academic.subjects.get(link.subjectId),
      enabled: Boolean(link.subjectId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const subjectRows = useMemo(() => {
    return subjectLinks.map((link, index) => {
      const query = subjectQueries[index] as { data?: { subject?: AcademicSubject; data?: AcademicSubject }; isLoading?: boolean } | undefined;
      const detail = query?.data?.subject ?? query?.data?.data;
      const teacherId = link.teacherId || undefined;
      return {
        subjectId: link.subjectId,
        subjectName: detail?.subjectName || `Subject ${compactId(link.subjectId)}`,
        subjectCode: detail?.subjectCode || '',
        teacherId,
        teacherLabel: resolveTeacherName(teacherId, teacherDirectory),
        isLoading: Boolean(query?.isLoading),
        loaded: Boolean(detail),
      };
    });
  }, [subjectLinks, subjectQueries, teacherDirectory]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -8 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="overflow-hidden border-t border-brand-100 bg-brand-50/30"
    >
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-600 font-bold">View subjects</p>
            <h5 className="mt-1 text-sm font-semibold text-ink-900">Subjects linked to this section</h5>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-ink-500">
            <span className="chip-brand">{subjectRows.length} linked</span>
            <span className="chip-brand">{subjectRows.filter((row) => row.loaded).length} loaded</span>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {subjectRows.length > 0 ? (
            subjectRows.map((row) => (
              <article key={row.subjectId} className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-ink-900">{row.subjectName}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-500">
                      {row.subjectCode ? <span>Code: {row.subjectCode}</span> : null}
                      <span>Teacher: {row.teacherLabel}</span>
                    </div>
                  </div>
                  <span className="chip-brand shrink-0">{row.teacherLabel}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-white/70 p-4 text-sm text-ink-500">
              No subject links were returned for this section yet.
            </div>
          )}
        </div>

        <p className="mt-3 text-[11px] text-ink-400">
          Each subject card is loaded from /subjects/:id, so the modal shows the live catalog subject name instead of a raw ID.
        </p>
      </div>
    </motion.div>
  );
}

function SubjectsPanel({
  classes,
  subjects,
  latestSubject,
  subjectName,
  setSubjectName,
  subjectCode,
  setSubjectCode,
  createPending,
  onCreateSubject,
  subjectId,
  setSubjectId,
  linkClassId,
  setLinkClassId,
  linkSectionId,
  setLinkSectionId,
  teacherId,
  setTeacherId,
  onLinkSubject,
  linkPending,
  teacherOptions,
}: {
  classes: AcademicClass[];
  subjects: AcademicSubject[];
  teacherOptions: HREmployee[];
  latestSubject: AcademicSubject | null;
  subjectName: string;
  setSubjectName: (value: string) => void;
  subjectCode: string;
  setSubjectCode: (value: string) => void;
  createPending: boolean;
  onCreateSubject: () => void;
  subjectId: string;
  setSubjectId: (value: string) => void;
  linkClassId: string;
  setLinkClassId: (value: string) => void;
  linkSectionId: string;
  setLinkSectionId: (value: string) => void;
  teacherId: string;
  setTeacherId: (value: string) => void;
  onLinkSubject: () => void;
  linkPending: boolean;
}) {
  const selectedClass = classes.find((cls) => cls.id === linkClassId);
  const sectionOptions = selectedClass?.sections ?? [];
  const selectedSubject = subjects.find((subject) => subject.id === subjectId);

  return (
    <section className="space-y-4">
      <div className="card p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">Subjects</p>
          <h3 className="font-display text-xl font-semibold mt-1">Subject catalog and section linking</h3>
          <p className="text-sm text-ink-500 mt-1">
            Create catalog subjects first, then assign them to a class section and teacher.
          </p>
        </div>
        <div className="text-xs text-ink-500">
          Live classes: <span className="font-semibold text-ink-900">{classes.length}</span>
        </div>
      </div>

      {latestSubject && (
        <div className="card p-4 border-brand-200 bg-brand-50/40 text-sm">
          <p className="text-[10px] uppercase tracking-[0.18em] text-brand-600 font-bold">Latest subject</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="chip-brand">{latestSubject.subjectName}</span>
            <span className="chip-brand">{latestSubject.subjectCode}</span>
            <span className="text-ink-500">ID: {latestSubject.id}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Create catalog entry</p>
          <div className="grid gap-3 mt-4">
            <div>
              <label className="label">Subject name</label>
              <input
                className="input mt-2"
                placeholder="Physics"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Subject code</label>
              <input
                className="input mt-2"
                placeholder="PHY-10"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
              />
            </div>
            <button
              onClick={onCreateSubject}
              disabled={createPending || !subjectName.trim() || !subjectCode.trim()}
              className="btn-primary w-full"
            >
              <Icon name="plus" size={16} /> {createPending ? 'Creating...' : 'Create subject'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Link to section</p>
          <div className="grid gap-3 mt-4">
            <div>
              <label className="label">Class</label>
              <select
                className="input mt-2"
                value={linkClassId}
                onChange={(e) => setLinkClassId(e.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Section</label>
              <select
                className="input mt-2"
                value={linkSectionId}
                onChange={(e) => setLinkSectionId(e.target.value)}
                disabled={!selectedClass}
              >
                <option value="">Select section</option>
                {sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {sectionLabel(section)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <select
                className="input mt-2"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subjectName} ({subject.subjectCode}) - {subject.id}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-500">
                {selectedSubject ? (
                  <>
                    <span>Selected: {selectedSubject.subjectName} ({selectedSubject.subjectCode})</span>
                    <span className="font-mono">{selectedSubject.id}</span>
                  </>
                ) : latestSubject ? (
                  <>
                    <span>Latest: {latestSubject.subjectName} ({latestSubject.subjectCode})</span>
                    <button
                      type="button"
                      onClick={() => setSubjectId(latestSubject.id)}
                      className="font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Use latest subject
                    </button>
                  </>
                ) : (
                  <span>No subject selected</span>
                )}
              </div>
            </div>
            <div>
              <label className="label">Teacher</label>
              <select
                className="input mt-2"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Select teacher</option>
                {teacherOptions.map((teacher) => {
                  const teacherValue = teacher.id || teacher.userId || '';
                  return (
                    <option key={teacherValue} value={teacherValue}>
                      {fullName(teacher, teacher.email || compactId(teacherValue))}
                    </option>
                  );
                })}
              </select>
              {!teacherOptions.length && (
                <p className="mt-2 text-xs text-ink-400">No TEACHER employees are available yet.</p>
              )}
            </div>
            <button
              onClick={onLinkSubject}
              disabled={linkPending || !linkClassId || !linkSectionId || !subjectId || !teacherId}
              className="btn-primary w-full"
            >
              <Icon name="check" size={16} /> {linkPending ? 'Linking...' : 'Link subject to section'}
            </button>
          </div>

          <p className="text-xs text-ink-400 mt-3">
            If the selected section already has a class teacher, the teacher ID is filled automatically.
          </p>
        </div>
      </div>
    </section>
  );
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={clsx('table-header', className)}>{children}</th>;
}

function Td({ children, className = '', mono = false }: { children: ReactNode; className?: string; mono?: boolean }) {
  return <td className={clsx('table-cell', mono && 'font-mono text-xs', className)}>{children}</td>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900 break-words">{value || '—'}</p>
    </div>
  );
}

function sectionLabel(section: { name: string; sectionName?: string }) {
  return section.sectionName || section.name || 'Section';
}

function countTeacherLinked(cls: AcademicClass) {
  return (cls.sections ?? []).filter((section) => Boolean(section.classTeacherId)).length;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toLocaleDateString();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '');
}

function uniqueSectionSubjects(subjects: AcademicSubjectLink[]) {
  const seen = new Set<string>();
  return subjects.filter((subject) => {
    if (!subject.subjectId || seen.has(subject.subjectId)) return false;
    seen.add(subject.subjectId);
    return true;
  });
}

function buildTeacherDirectory(
  employees: Array<{ id?: string; userId?: string; firstName?: string; lastName?: string; email?: string }>,
) {
  const directory: Record<string, string> = {};
  employees.forEach((employee) => {
    const label = teacherDisplayName(employee);
    [employee.id, employee.userId].filter(Boolean).forEach((teacherId) => {
      directory[String(teacherId)] = label;
    });
  });
  return directory;
}

function teacherDisplayName(employee: { id?: string; firstName?: string; lastName?: string; email?: string }) {
  return fullName(employee, employee.email || compactId(employee.id));
}

function resolveTeacherName(teacherId: string | undefined, teacherDirectory: Record<string, string>, fallback?: unknown) {
  if (!teacherId) return fullName(fallback, '-');
  return teacherDirectory[teacherId] || fullName(fallback, compactId(teacherId));
}




