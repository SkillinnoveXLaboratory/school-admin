import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic } from '@/lib/api/services';

const SAMPLE = [
  { id: '1', subject: 'Mathematics',  title: 'Algebra worksheet 4',   classLabel: 'Gr 9 · A', description: 'Solve linear equations 1.1 to 1.18.', dueDate: 'Tomorrow', submitted: 22, total: 34 },
  { id: '2', subject: 'Science',      title: 'Photosynthesis lab',    classLabel: 'Gr 7 · B', description: 'Leaf experiment + observation report.', dueDate: 'Fri 28 May', submitted: 9, total: 38 },
  { id: '3', subject: 'English',      title: 'Book report — Wonder',  classLabel: 'Gr 6 · C', description: 'Write a 250-word reflection.', dueDate: 'Mon 1 Jun', submitted: 18, total: 36 },
];

export function HomeworkPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<any>(null);
  const { data = [] } = useQuery<any[]>({ queryKey: ['homework'], queryFn: () => Academic.homework.list() as any });
  const rows = data.length ? data : SAMPLE;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 5" title="Homework"
        subtitle="Assignments across classes. Track submissions and grades."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={16}/> Publish assignment</button>} />

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((h:any, i:number) => (
          <motion.article key={h.id ?? i} onClick={() => setOpen(h)} className="card p-5 cursor-pointer hover:shadow-pop hover:border-brand-300 transition-all"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">{h.subject}</p>
                <h3 className="font-display text-base font-semibold mt-1">{h.title}</h3>
              </div>
              <span className="chip-brand">{h.classLabel}</span>
            </div>
            <p className="text-sm text-ink-500 mt-3 line-clamp-2">{h.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
              <span>Due {h.dueDate}</span>
              <span>{h.submitted}/{h.total} submitted</span>
            </div>
            <div className="h-1.5 mt-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${(h.submitted/h.total)*100}%` }}/>
            </div>
          </motion.article>
        ))}
      </section>

      <AnimatePresence>
        {creating && <PublishModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['homework'] }); setCreating(false); }}/>}
        {open && <SubmissionsModal homework={open} onClose={() => setOpen(null)}/>}
      </AnimatePresence>
    </div>
  );
}

function PublishModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: '', subject: '', classId: '', sectionId: '', description: '', dueDate: '' });
  const save = useMutation({
    mutationFn: () => Academic.homework.publish(f),
    onSuccess: () => { toast.success('Homework published'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Publish homework" onClose={onClose} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.title} className="btn-primary">{save.isPending ? 'Publishing…' : 'Publish'}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title" value={f.title} onChange={v => setF({ ...f, title: v })} required/>
        <Field label="Subject" value={f.subject} onChange={v => setF({ ...f, subject: v })}/>
        <Field label="Class ID" value={f.classId} onChange={v => setF({ ...f, classId: v })}/>
        <Field label="Section ID" value={f.sectionId} onChange={v => setF({ ...f, sectionId: v })}/>
        <Field label="Due date" type="date" value={f.dueDate} onChange={v => setF({ ...f, dueDate: v })}/>
      </div>
      <div className="mt-3"><label className="label">Description</label>
        <textarea className="input mt-2 min-h-[120px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}/>
      </div>
    </Modal>
  );
}

function SubmissionsModal({ homework, onClose }: { homework: any; onClose: () => void }) {
  // Demo submissions; real backend exposes via /homework/{id}/submissions on retrieval
  const submissions = Array.from({ length: 6 }).map((_, i) => ({
    id: `sub${i}`, student: ['Aanya','Karan','Riya','Vihaan','Sara','Aditi'][i], status: i < 3 ? 'GRADED' : 'SUBMITTED', score: i < 3 ? Math.floor(Math.random() * 30) + 70 : null,
  }));
  return (
    <Modal title={homework.title} onClose={onClose} size="lg"
      footer={<button onClick={onClose} className="btn-ghost">Close</button>}>
      <div>
        <span className="chip-brand">{homework.classLabel}</span>
        <p className="text-sm text-ink-500 mt-3">{homework.description}</p>
      </div>
      <hr className="border-line my-4"/>
      <h4 className="label">Submissions ({homework.submitted}/{homework.total})</h4>
      <table className="w-full mt-3">
        <thead><tr>
          <th className="table-header">Student</th><th className="table-header">Status</th><th className="table-header">Score</th><th className="table-header text-right pr-4"></th>
        </tr></thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="hover:bg-muted/30">
              <td className="table-cell">{s.student}</td>
              <td className="table-cell">{s.status === 'GRADED' ? <span className="chip-success">Graded</span> : <span className="chip-warning">Pending</span>}</td>
              <td className="table-cell font-mono">{s.score ?? '—'}</td>
              <td className="table-cell text-right pr-4">
                <button onClick={() => toast('Opening submission…')} className="btn-ghost py-1 px-2 text-xs">{s.status === 'GRADED' ? 'View' : 'Evaluate'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

function Field({ label, value, onChange, type='text', required }: { label: string; value: string; onChange: (v: string)=>void; type?: string; required?: boolean }) {
  return <div><label className="label">{label}</label>
    <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} className="input mt-2"/></div>;
}
