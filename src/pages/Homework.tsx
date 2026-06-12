import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic, Students } from '@/lib/api/services';
import type { AcademicClass } from '@/lib/api/types';
import { compactId, formatDate, fullName, idOf, inputDate, numberValue, rowsFrom, statusClass, textOf } from '@/lib/viewUtils';

export function HomeworkPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<any>(null);
  const homeworkQuery = useQuery({ queryKey: ['homework'], queryFn: () => Academic.homework.list({ page: 1, limit: 50 }) });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => Academic.classes.list() });
  const studentsQuery = useQuery({ queryKey: ['students', 'homework'], queryFn: () => Students.list({ page: 1, limit: 100 }) });
  const rows = rowsFrom<any>(homeworkQuery.data, ['homeworks', 'data']);
  const classes = classesQuery.data?.classes ?? [];
  const students = studentsQuery.data?.students ?? [];
  const dueSoon = rows.filter((item) => {
    const due = new Date(textOf(item, ['dueDate'], ''));
    const now = Date.now();
    return !Number.isNaN(due.getTime()) && due.getTime() >= now && due.getTime() <= now + 7 * 24 * 60 * 60 * 1000;
  });
  const submissions = rows.reduce((total, item) => total + rowsFrom(item, ['submissions']).length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 5"
        title="Homework"
        subtitle="Live assignment publishing, due dates, and submission evaluation."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Assignments" value={rows.length} tone="chip-brand" />
        <Stat label="Due this week" value={dueSoon.length} tone={dueSoon.length ? 'chip-warning' : 'chip-success'} />
        <Stat label="Submissions" value={submissions} tone="chip-success" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((homework, index) => (
          <motion.button
            key={idOf(homework)}
            onClick={() => setOpen(homework)}
            className="card p-5 text-left transition-all hover:border-brand-300 hover:shadow-pop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">{subjectName(homework.subjectId)}</p>
                <h3 className="mt-1 font-display text-base font-semibold">{textOf(homework, ['title'])}</h3>
              </div>
              <span className="chip-brand">{classLabel(homework, classes)}</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-ink-500">{textOf(homework, ['description'])}</p>
            <div className="mt-5 flex items-center justify-between text-xs text-ink-400">
              <span>Due {formatDate(textOf(homework, ['dueDate'], ''))}</span>
              <span>{rowsFrom(homework, ['submissions']).length} submissions</span>
            </div>
          </motion.button>
        ))}
        {!rows.length && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-400 md:col-span-2 xl:col-span-3">
            {homeworkQuery.isLoading ? 'Loading homework...' : 'No homework assignments returned by the API.'}
          </div>
        )}
      </section>

      <AnimatePresence>
        {creating && (
          <PublishModal
            classes={classes}
            onClose={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              qc.invalidateQueries({ queryKey: ['homework'] });
            }}
          />
        )}
        {open && (
          <SubmissionsModal
            homework={open}
            classes={classes}
            students={students}
            onClose={() => setOpen(null)}
            onChanged={() => qc.invalidateQueries({ queryKey: ['homework'] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PublishModal({ classes, onClose, onSaved }: { classes: AcademicClass[]; onClose: () => void; onSaved: () => void }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const selectedClass = classes.find((item) => item.id === classId);
  const sections = selectedClass?.sections ?? [];
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const selectedSection = sections.find((section) => section.id === sectionId);
  const subjects = useMemo(() => dedupeSubjects(selectedSection?.subjects ?? []), [selectedSection]);
  const [form, setForm] = useState({ subjectId: subjects[0]?.subjectId ?? '', title: '', description: '', dueDate: inputDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) });

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  useEffect(() => {
    if (!selectedClass) return;
    if (!sectionId || !selectedClass.sections.some((section) => section.id === sectionId)) {
      setSectionId(selectedClass.sections[0]?.id ?? '');
    }
  }, [selectedClass, sectionId]);

  useEffect(() => {
    if (!form.subjectId || !subjects.some((subject) => subject.subjectId === form.subjectId)) {
      setForm((current) => ({ ...current, subjectId: subjects[0]?.subjectId ?? '' }));
    }
  }, [subjects, form.subjectId]);

  const save = useMutation({
    mutationFn: () => Academic.homework.publish({ classId, sectionId, subjectId: form.subjectId, title: form.title, description: form.description, dueDate: form.dueDate }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Homework published');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to publish homework'),
  });

  return (
    <Modal
      title="Publish homework"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !classId || !sectionId || !form.subjectId || !form.title || !form.description} className="btn-primary">
            {save.isPending ? 'Publishing...' : 'Publish'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Class" value={classId} onChange={(value) => { setClassId(value); setSectionId(''); }}>
          <option value="">Select class</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select label="Section" value={sectionId} onChange={setSectionId}>
          <option value="">Select section</option>
          {sections.map((section) => <option key={section.id} value={section.id}>{section.name || section.sectionName || compactId(section.id)}</option>)}
        </Select>
        <Select label="Subject ID linked to section" value={form.subjectId} onChange={(subjectId) => setForm({ ...form, subjectId })}>
          <option value="">Select subject</option>
          {subjects.map((subject) => <option key={subject.subjectId} value={subject.subjectId}>Subject {compactId(subject.subjectId)}</option>)}
        </Select>
        <Input label="Due date" type="date" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
        <Input label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
      </div>
      <div className="mt-3">
        <label className="label">Description</label>
        <textarea className="input mt-2 min-h-[130px]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </div>
      {!subjects.length && <p className="mt-3 text-xs text-warning">This class section has no linked subject IDs, so homework cannot be published for it.</p>}
    </Modal>
  );
}

function SubmissionsModal({ homework, classes, students, onClose, onChanged }: { homework: any; classes: AcademicClass[]; students: any[]; onClose: () => void; onChanged: () => void }) {
  const submissions = rowsFrom<any>(homework, ['submissions']);
  const [activeSubmission, setActiveSubmission] = useState<any>(null);

  return (
    <Modal title={textOf(homework, ['title'])} onClose={onClose} size="xl" footer={<button onClick={onClose} className="btn-ghost">Close</button>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Class" value={classLabel(homework, classes)} />
        <Info label="Subject" value={subjectName(homework.subjectId)} />
        <Info label="Due date" value={formatDate(textOf(homework, ['dueDate'], ''))} />
      </div>
      <p className="mt-4 text-sm text-ink-600">{textOf(homework, ['description'])}</p>
      <hr className="my-5 border-line" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-muted/60">
            <tr><th className="table-header">Student</th><th className="table-header">Submitted</th><th className="table-header">Score</th><th className="table-header">Status</th><th className="table-header text-right">Action</th></tr>
          </thead>
          <tbody>
            {submissions.map((submission) => {
              const student = students.find((item) => item.id === idOf(submission.studentId) || item.id === textOf(submission, ['studentId'], ''));
              return (
                <tr key={idOf(submission)} className="hover:bg-muted/40">
                  <td className="table-cell font-medium text-ink-900">{student ? `${student.firstName} ${student.lastName}` : fullName(submission.studentId, compactId(submission.studentId))}</td>
                  <td className="table-cell">{formatDate(textOf(submission, ['submittedAt', 'createdAt'], ''))}</td>
                  <td className="table-cell">{textOf(submission, ['score', 'marks'], '—')}</td>
                  <td className="table-cell"><span className={statusClass(textOf(submission, ['status'], 'SUBMITTED'))}>{textOf(submission, ['status'], 'SUBMITTED')}</span></td>
                  <td className="table-cell text-right"><button onClick={() => setActiveSubmission(submission)} className="btn-ghost px-3 py-1.5 text-xs">Evaluate</button></td>
                </tr>
              );
            })}
            {!submissions.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-400">No submissions are attached to this homework record yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <AnimatePresence>
        {activeSubmission && (
          <EvaluateModal
            homeworkId={idOf(homework)}
            submission={activeSubmission}
            onClose={() => setActiveSubmission(null)}
            onSaved={() => {
              setActiveSubmission(null);
              onChanged();
            }}
          />
        )}
      </AnimatePresence>
    </Modal>
  );
}

function EvaluateModal({ homeworkId, submission, onClose, onSaved }: { homeworkId: string; submission: any; onClose: () => void; onSaved: () => void }) {
  const [score, setScore] = useState(textOf(submission, ['score', 'marks'], ''));
  const [feedback, setFeedback] = useState(textOf(submission, ['feedback', 'remarks'], ''));
  const save = useMutation({
    mutationFn: () => Academic.homework.evaluate(homeworkId, idOf(submission), { score: numberValue(score, 0), feedback }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Submission evaluated');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to evaluate submission'),
  });
  return (
    <Modal
      title="Evaluate submission"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !idOf(submission)} className="btn-primary">
            {save.isPending ? 'Saving...' : 'Save evaluation'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Score" type="number" value={score} onChange={setScore} />
        <div>
          <label className="label">Feedback</label>
          <textarea className="input mt-2 min-h-[120px]" value={feedback} onChange={(event) => setFeedback(event.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function subjectName(value: any) {
  return textOf(value, ['subjectName', 'name'], compactId(value));
}

function classLabel(homework: any, classes: AcademicClass[]) {
  const cls = classes.find((item) => item.id === textOf(homework, ['classId'], ''));
  const section = cls?.sections.find((item) => item.id === textOf(homework, ['sectionId'], ''));
  return [cls?.name ?? compactId(textOf(homework, ['classId'], '')), section?.name || section?.sectionName || compactId(textOf(homework, ['sectionId'], ''))].filter(Boolean).join(' · ');
}

function dedupeSubjects(subjects: { subjectId: string; teacherId?: string }[]) {
  const seen = new Set<string>();
  return subjects.filter((subject) => {
    if (!subject.subjectId || seen.has(subject.subjectId)) return false;
    seen.add(subject.subjectId);
    return true;
  });
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-bold">{value}</p>
        <span className={tone}>live</span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="label">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
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

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </div>
  );
}
