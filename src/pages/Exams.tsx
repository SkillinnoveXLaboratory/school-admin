import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic, Students } from '@/lib/api/services';
import type { AcademicClass, Student } from '@/lib/api/types';
import { compactId, formatDate, fullName, idOf, numberValue, rowsFrom, statusClass, textOf } from '@/lib/viewUtils';

type ExamRecord = Record<string, any>;

export function ExamsPage() {
  const [createdExams, setCreatedExams] = useState<ExamRecord[]>([]);
  const [defining, setDefining] = useState(false);
  const [schedulingExam, setSchedulingExam] = useState<ExamRecord | null>(null);
  const [marksOpen, setMarksOpen] = useState(false);
  const [reportStudentId, setReportStudentId] = useState('');

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => Academic.classes.list() });
  const studentsQuery = useQuery({ queryKey: ['students', 'exams'], queryFn: () => Students.list({ page: 1, limit: 100 }) });
  const examsQuery = useQuery({ queryKey: ['exams'], queryFn: () => Academic.exams.list() });
  const reportQuery = useQuery({
    queryKey: ['exam-report-card', reportStudentId],
    queryFn: () => Academic.exams.reportCard(reportStudentId),
    enabled: Boolean(reportStudentId),
  });

  const classes = classesQuery.data?.classes ?? [];
  const students = studentsQuery.data?.students ?? [];
  const liveExams = rowsFrom<any>(examsQuery.data, ['exams', 'data']);
  const examCards = useMemo(() => {
    const merged: ExamRecord[] = [];
    for (const exam of [...liveExams, ...createdExams]) {
      const id = idOf(exam);
      if (id && merged.some((item) => idOf(item) === id)) continue;
      merged.push(exam);
    }
    return merged;
  }, [createdExams, liveExams]);
  const schedules = useMemo(
    () =>
      examCards.flatMap((exam) =>
        rowsFrom<any>(exam, ['schedules']).map((schedule) => ({
          ...schedule,
          examId: idOf(exam),
          examName: textOf(exam, ['examName']),
        })),
      ),
    [examCards],
  );
  const reportExams = rowsFrom<any>(reportQuery.data, ['reportCard', 'data']);
  const reportStudent = reportQuery.data?.student;
  const reportRows = useMemo(
    () =>
      reportExams.flatMap((exam) =>
        rowsFrom<any>(exam, ['subjects']).map((subject) => ({
          ...subject,
          examId: idOf(exam),
          examName: textOf(exam, ['examName', 'term'], 'Exam'),
          term: textOf(exam, ['term']),
          summary: exam.summary,
        })),
      ),
    [reportExams],
  );

  const upsertExam = (exam: ExamRecord) => {
    setCreatedExams((current) => {
      const id = idOf(exam);
      if (!id) return current;
      const next = current.filter((item) => idOf(item) !== id);
      return [exam, ...next];
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 5"
        title="Exams & marks"
        subtitle="Define exams, add paper schedules, submit marks, and fetch report cards from the live API."
        actions={
          <>
            <button onClick={() => setMarksOpen(true)} className="btn-outline"><Icon name="check" size={16} /> Enter marks</button>
            <button onClick={() => setDefining(true)} className="btn-primary"><Icon name="plus" size={16} /> Define exam</button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Live exams" value={examCards.length} tone="chip-brand" />
        <Stat label="Known schedules" value={schedules.length} tone="chip-success" />
        <Stat label="Students loaded" value={students.length} tone="chip-warning" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Exam structures</h2>
              <p className="text-sm text-ink-500">Loaded live from `/exams`.</p>
            </div>
            <button onClick={() => setDefining(true)} className="btn-outline px-3 py-2 text-xs">Define</button>
          </div>
          <div className="space-y-3 p-4">
            {examCards.map((exam, index) => (
              <motion.article key={idOf(exam)} className="rounded-2xl border border-line bg-surface p-4 shadow-soft" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{textOf(exam, ['examName'])}</h3>
                    <p className="text-xs text-ink-400">{textOf(exam, ['term'])} · {compactId(exam)} · {rowsFrom(exam, ['schedules']).length} schedules</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSchedulingExam(exam)} className="btn-ghost px-3 py-1.5 text-xs">Add schedule</button>
                    <button onClick={() => setMarksOpen(true)} className="btn-outline px-3 py-1.5 text-xs">Enter marks</button>
                  </div>
                </div>
                {rowsFrom<any>(exam, ['schedules']).length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {rowsFrom<any>(exam, ['schedules']).map((schedule) => (
                      <div key={idOf(schedule)} className="rounded-xl bg-muted/40 p-3">
                        <p className="font-semibold text-ink-900">
                          {textOf(schedule.subjectId, ['subjectName', 'name'], `Subject ${compactId(schedule.subjectId)}`)}
                        </p>
                        <p className="text-xs text-ink-500">
                          {textOf(schedule.subjectId, ['subjectCode'], '')}
                          {textOf(schedule.subjectId, ['subjectCode'], '') ? ' · ' : ''}
                          {formatDate(textOf(schedule, ['examDate'], ''))} · Max {textOf(schedule, ['maxMarks'], '0')}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-ink-400">{idOf(schedule)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.article>
            ))}
            {!examCards.length && (
              <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-400">
                No exams returned by the live API yet. Define an exam or refresh the page to load data.
              </div>
            )}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-display text-lg font-semibold">Report card lookup</h2>
          <p className="text-sm text-ink-500">Uses `/exams/report-card/student/{`id`}`.</p>
          <select className="input mt-4" value={reportStudentId} onChange={(event) => setReportStudentId(event.target.value)}>
            <option value="">Select student</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
          </select>
          {reportStudent && (
            <div className="mt-4 rounded-xl border border-line bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-bold">Selected student</p>
              <p className="mt-1 font-semibold text-ink-900">{reportStudent.firstName} {reportStudent.lastName}</p>
              <p className="mt-0.5 text-xs text-ink-500">{reportStudent.studentId}</p>
            </div>
          )}
          <div className="mt-5 space-y-3">
            {reportRows.map((row, index) => (
              <div key={idOf(row) || index} className="rounded-xl border border-line bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{textOf(row, ['subjectName', 'name'], `Subject ${index + 1}`)}</p>
                    <p className="text-xs text-ink-500">{textOf(row, ['subjectCode'], '')}{textOf(row, ['subjectCode'], '') ? ' · ' : ''}{textOf(row, ['examName', 'term'], 'Report row')}</p>
                  </div>
                  <span className={statusClass(textOf(row, ['grade', 'status'], 'RECORDED'))}>{textOf(row, ['grade', 'status'], 'Recorded')}</span>
                </div>
                <p className="mt-2 text-sm text-ink-600">
                  Marks: {textOf(row, ['marksObtained', 'marks', 'score'], '—')} / {textOf(row, ['maxMarks'], '—')}
                  {row.percentage !== undefined && row.percentage !== null ? ` · ${row.percentage}%` : ''}
                </p>
                {row.summary && (
                  <p className="mt-1 text-xs text-ink-400">
                    Exam total: {textOf(row.summary, ['totalObtained'], '—')} / {textOf(row.summary, ['totalMax'], '—')}
                  </p>
                )}
              </div>
            ))}
            {reportStudentId && !reportRows.length && !reportQuery.isLoading && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">No report card rows returned for this student.</p>}
            {!reportStudentId && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">Choose a student to view report card data.</p>}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {defining && <ExamFormModal onClose={() => setDefining(false)} onCreated={(exam) => { upsertExam(exam); setDefining(false); }} />}
        {schedulingExam && (
          <ScheduleModal
            exam={schedulingExam}
            classes={classes}
            onClose={() => setSchedulingExam(null)}
            onScheduled={(exam) => {
              upsertExam(exam);
              setSchedulingExam(null);
            }}
          />
        )}
        {marksOpen && <MarksEntryModal schedules={schedules} students={students} onClose={() => setMarksOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function ExamFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: (exam: ExamRecord) => void }) {
  const [form, setForm] = useState({ examName: '', term: 'TERM_1' });
  const save = useMutation({
    mutationFn: () => Academic.exams.create(form),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Exam defined');
      if (body?.exam) onCreated(body.exam);
      else onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to define exam'),
  });
  return (
    <Modal
      title="Define exam"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.examName || !form.term} className="btn-primary">
            {save.isPending ? 'Defining...' : 'Define exam'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Exam name" value={form.examName} onChange={(examName) => setForm({ ...form, examName })} />
        <Select label="Term" value={form.term} onChange={(term) => setForm({ ...form, term })}>
          <option value="TERM_1">TERM_1</option>
          <option value="TERM_2">TERM_2</option>
          <option value="TERM_3">TERM_3</option>
          <option value="UNIT_TEST">UNIT_TEST</option>
          <option value="FINAL">FINAL</option>
        </Select>
      </div>
    </Modal>
  );
}

function ScheduleModal({ exam, classes, onClose, onScheduled }: { exam: ExamRecord; classes: AcademicClass[]; onClose: () => void; onScheduled: (exam: ExamRecord) => void }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const selectedClass = classes.find((item) => item.id === classId);
  const sections = selectedClass?.sections ?? [];
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const selectedSection = sections.find((section) => section.id === sectionId);
  const subjects = useMemo(() => dedupeSubjects(selectedSection?.subjects ?? []), [selectedSection]);
  const [form, setForm] = useState({ subjectId: subjects[0]?.subjectId ?? '', examDate: '', maxMarks: '100' });

  useEffect(() => {
    if (!selectedClass) return;
    if (!sectionId || !selectedClass.sections.some((section) => section.id === sectionId)) setSectionId(selectedClass.sections[0]?.id ?? '');
  }, [selectedClass, sectionId]);

  useEffect(() => {
    if (!form.subjectId || !subjects.some((subject) => subject.subjectId === form.subjectId)) {
      setForm((current) => ({ ...current, subjectId: subjects[0]?.subjectId ?? '' }));
    }
  }, [subjects, form.subjectId]);

  const save = useMutation({
    mutationFn: () => Academic.exams.addSchedule(idOf(exam), { classId, sectionId, subjectId: form.subjectId, examDate: form.examDate, maxMarks: numberValue(form.maxMarks, 100) }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Exam schedule added');
      if (body?.exam) onScheduled(body.exam);
      else onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add schedule'),
  });

  return (
    <Modal
      title={`Schedule ${textOf(exam, ['examName'])}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !classId || !sectionId || !form.subjectId || !form.examDate} className="btn-primary">
            {save.isPending ? 'Scheduling...' : 'Add schedule'}
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
        <Select label="Subject" value={form.subjectId} onChange={(subjectId) => setForm({ ...form, subjectId })}>
          <option value="">Select subject</option>
          {subjects.map((subject) => <option key={subject.subjectId} value={subject.subjectId}>Subject {compactId(subject.subjectId)}</option>)}
        </Select>
        <Input label="Exam date" type="date" value={form.examDate} onChange={(examDate) => setForm({ ...form, examDate })} />
        <Input label="Max marks" type="number" value={form.maxMarks} onChange={(maxMarks) => setForm({ ...form, maxMarks })} />
      </div>
      {!subjects.length && <p className="mt-3 text-xs text-warning">The selected section has no linked subjects in `/classes`.</p>}
    </Modal>
  );
}

function MarksEntryModal({ schedules, students, onClose }: { schedules: any[]; students: Student[]; onClose: () => void }) {
  const [scheduleId, setScheduleId] = useState(idOf(schedules[0]) || '');
  const [manualScheduleId, setManualScheduleId] = useState('');
  const [rows, setRows] = useState(() => students.slice(0, 40).map((student) => ({ studentId: student.id, name: `${student.firstName} ${student.lastName}`, marksObtained: '' })));
  const [prefillLoading, setPrefillLoading] = useState(false);
  const effectiveScheduleId = manualScheduleId || scheduleId;
  const selectedSchedule = useMemo(() => schedules.find((schedule) => idOf(schedule) === effectiveScheduleId), [schedules, effectiveScheduleId]);
  const save = useMutation({
    mutationFn: () => Academic.exams.submitMarks(effectiveScheduleId, {
      marksList: rows
        .filter((row) => row.studentId && row.marksObtained !== '')
        .map((row) => ({ studentId: row.studentId, marksObtained: numberValue(row.marksObtained, 0) })),
    }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Marks recorded');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to submit marks'),
  });

  useEffect(() => {
    let alive = true;
    const roster = students.slice(0, 40).map((student) => ({ studentId: student.id, name: `${student.firstName} ${student.lastName}`, marksObtained: '' }));

    async function preload() {
      if (!effectiveScheduleId || !selectedSchedule) {
        setRows(roster);
        setPrefillLoading(false);
        return;
      }

      const examId = idOf(selectedSchedule.examId);
      const subjectId = idOf(selectedSchedule.subjectId);
      if (!examId || !subjectId) {
        setRows(roster);
        setPrefillLoading(false);
        return;
      }

      setPrefillLoading(true);
      try {
        const nextRows = await Promise.all(
          roster.map(async (row) => {
            try {
              const reportBody = await Academic.exams.reportCard(row.studentId);
              const reportExams = rowsFrom<any>(reportBody, ['reportCard', 'data']);
              const matchedExam = reportExams.find((exam) => textOf(exam, ['examId', 'id', '_id']) === examId);
              const matchedSubject = matchedExam ? rowsFrom<any>(matchedExam, ['subjects']).find((subject) => idOf(subject.subjectId) === subjectId) : null;
              const marks = matchedSubject?.marksObtained;
              return { ...row, marksObtained: marks === undefined || marks === null ? '' : String(marks) };
            } catch {
              return row;
            }
          }),
        );

        if (!alive) return;
        setRows(nextRows);
      } finally {
        if (alive) setPrefillLoading(false);
      }
    }

    preload();
    return () => {
      alive = false;
    };
  }, [students, effectiveScheduleId, selectedSchedule]);

  return (
    <Modal
      title="Bulk marks entry"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || prefillLoading || !effectiveScheduleId || rows.every((row) => row.marksObtained === '')} className="btn-primary">
            {save.isPending ? 'Submitting...' : 'Submit marks'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Schedule from created exams" value={scheduleId} onChange={setScheduleId}>
          <option value="">Select schedule</option>
          {schedules.map((schedule) => <option key={idOf(schedule)} value={idOf(schedule)}>{schedule.examName} · {formatDate(textOf(schedule, ['examDate'], ''))} · {compactId(schedule)}</option>)}
        </Select>
        <Input label="Or paste schedule ID" value={manualScheduleId} onChange={setManualScheduleId} />
      </div>
      {prefillLoading && <p className="mt-3 text-xs text-ink-400">Loading existing marks from the live report-card API...</p>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-muted/60"><tr><th className="table-header">Student</th><th className="table-header">Marks</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.studentId}>
                <td className="table-cell font-medium text-ink-900">{row.name}<p className="font-mono text-[11px] text-ink-400">{row.studentId}</p></td>
                <td className="table-cell"><input className="input py-2" type="number" value={row.marksObtained} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, marksObtained: event.target.value } : item))} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={2} className="px-4 py-10 text-center text-sm text-ink-400">No students loaded for marks entry.</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  );
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
