import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic } from '@/lib/api/services';

const EXAMS = [
  { id: 'e1', name: 'Term 1 — Midterm',     status: 'COMPLETED',   schedules: 8, marksEntered: 8, reportCardsReady: true },
  { id: 'e2', name: 'Unit Test 3',          status: 'IN_PROGRESS', schedules: 6, marksEntered: 4, reportCardsReady: false },
  { id: 'e3', name: 'Term 2 — Final',       status: 'SCHEDULED',   schedules: 0, marksEntered: 0, reportCardsReady: false },
];

export function ExamsPage() {
  const [defining, setDefining] = useState(false);
  const [marksFor, setMarksFor] = useState<string | null>(null);
  const [schedFor, setSchedFor] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 5" title="Exams & marks"
        subtitle="Define exam structure, enter marks in bulk, generate report cards."
        actions={<>
          <button onClick={() => toast('Export coming soon')} className="btn-outline"><Icon name="download" size={16}/> Export marks</button>
          <button onClick={() => setDefining(true)} className="btn-primary"><Icon name="plus" size={16}/> Define exam</button>
        </>} />

      <section className="space-y-4">
        {EXAMS.map((e, i) => (
          <motion.article key={e.id} className="card p-5"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-lg font-semibold">{e.name}</h3>
                <p className="text-xs text-ink-400">{e.schedules} schedules · {e.marksEntered} marks entered</p>
              </div>
              {e.status === 'COMPLETED'   && <span className="chip-success">●&nbsp;Completed</span>}
              {e.status === 'IN_PROGRESS' && <span className="chip-warning">●&nbsp;In progress</span>}
              {e.status === 'SCHEDULED'   && <span className="chip-brand">●&nbsp;Scheduled</span>}
              <div className="flex gap-2">
                <button onClick={() => setSchedFor(e.id)} className="btn-ghost text-xs px-3 py-1.5">Manage schedules</button>
                <button onClick={() => setMarksFor(e.id)} className="btn-ghost text-xs px-3 py-1.5">Enter marks</button>
                <button onClick={() => toast.success('Generating report cards…')} disabled={!e.reportCardsReady}
                  className="btn-outline text-xs px-3 py-1.5 disabled:opacity-40">
                  <Icon name="exam" size={12}/> Report cards
                </button>
              </div>
            </div>
            <div className="h-1.5 mt-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${(e.marksEntered / Math.max(e.schedules,1)) * 100}%` }}/>
            </div>
          </motion.article>
        ))}
      </section>

      <AnimatePresence>
        {defining && <ExamFormModal onClose={() => setDefining(false)}/>}
        {schedFor && <SchedulesModal examId={schedFor} onClose={() => setSchedFor(null)}/>}
        {marksFor && <MarksEntryModal scheduleId={marksFor} onClose={() => setMarksFor(null)}/>}
      </AnimatePresence>
    </div>
  );
}

function ExamFormModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: '', term: 'TERM_1', startDate: '', endDate: '' });
  const save = useMutation({
    mutationFn: () => Academic.exams.create(f),
    onSuccess: () => { toast.success('Exam defined'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Define exam" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.name} className="btn-primary">{save.isPending ? 'Saving…' : 'Define'}</button>
      </>}>
      <div className="space-y-3">
        <div><label className="label">Name</label><input className="input mt-2" placeholder="Term 1 — Midterm" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}/></div>
        <div><label className="label">Term</label>
          <select className="input mt-2" value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })}>
            <option value="TERM_1">Term 1</option><option value="TERM_2">Term 2</option><option value="UNIT">Unit test</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Start date</label><input type="date" className="input mt-2" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })}/></div>
          <div><label className="label">End date</label><input type="date" className="input mt-2" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })}/></div>
        </div>
      </div>
    </Modal>
  );
}

function SchedulesModal({ examId, onClose }: { examId: string; onClose: () => void }) {
  const [f, setF] = useState({ subject: '', date: '', startTime: '09:00', duration: 120, classId: '', sectionId: '' });
  const save = useMutation({
    mutationFn: () => Academic.exams.addSchedule(examId, f),
    onSuccess: () => { toast.success('Schedule added'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Add exam schedule" onClose={onClose} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.subject} className="btn-primary">{save.isPending ? 'Saving…' : 'Add schedule'}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Subject</label><input className="input mt-2" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}/></div>
        <div><label className="label">Date</label><input type="date" className="input mt-2" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}/></div>
        <div><label className="label">Start time</label><input type="time" className="input mt-2" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })}/></div>
        <div><label className="label">Duration (min)</label><input type="number" className="input mt-2" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}/></div>
        <div><label className="label">Class ID</label><input className="input mt-2" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}/></div>
        <div><label className="label">Section ID</label><input className="input mt-2" value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value })}/></div>
      </div>
    </Modal>
  );
}

function MarksEntryModal({ scheduleId, onClose }: { scheduleId: string; onClose: () => void }) {
  const students = Array.from({ length: 12 }).map((_, i) => ({ id: `s${i}`, name: `Student ${i+1}`, marks: '' as string }));
  const [rows, setRows] = useState(students);
  const save = useMutation({
    mutationFn: () => Academic.exams.submitMarks(scheduleId, { records: rows.map(r => ({ studentId: r.id, marks: Number(r.marks) || 0 })) }),
    onSuccess: () => { toast.success('Marks submitted'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Bulk marks entry" onClose={onClose} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">{save.isPending ? 'Submitting…' : 'Submit marks'}</button>
      </>}>
      <table className="w-full">
        <thead><tr><th className="table-header">Student</th><th className="table-header w-32">Marks /100</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="table-cell">{r.name}</td>
              <td className="table-cell">
                <input type="number" min={0} max={100} className="input py-1.5"
                  value={r.marks}
                  onChange={(e) => setRows(rs => rs.map((row, j) => j === i ? { ...row, marks: e.target.value } : row))}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
