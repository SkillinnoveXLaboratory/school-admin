import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic } from '@/lib/api/services';

const SAMPLE = [
  { id: '1', name: 'Grade 1', sections: ['A','B','C'],          studentCount: 82  },
  { id: '2', name: 'Grade 2', sections: ['A','B','C','D'],      studentCount: 108 },
  { id: '3', name: 'Grade 3', sections: ['A','B','C'],          studentCount: 90  },
  { id: '4', name: 'Grade 6', sections: ['A','B'],              studentCount: 64  },
  { id: '5', name: 'Grade 9', sections: ['A','B','C'],          studentCount: 78  },
  { id: '6', name: 'Grade 10',sections: ['A','B'],              studentCount: 60  },
];

export function ClassesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<any>(null);
  const { data = [] } = useQuery<any[]>({ queryKey: ['classes'], queryFn: () => Academic.classes.list() as any });
  const rows = data.length ? data : SAMPLE;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 5" title="Classes & sections"
        subtitle="Set up grade levels, sections, and subject assignments."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={16}/> Add class</button>} />

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((c:any) => (
          <article key={c.id ?? c.name} onClick={() => setOpen(c)} className="card p-5 cursor-pointer hover:border-brand-300 hover:shadow-pop transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">{c.shift ?? 'Morning'}</p>
                <h3 className="font-display text-xl font-semibold mt-1">{c.name}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-brand-50 grid place-items-center text-brand-600"><Icon name="school" /></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(c.sections ?? ['A','B','C']).map((s:string) => <span key={s} className="chip-brand">Sec {s}</span>)}
            </div>
            <div className="mt-4 text-sm text-ink-500 flex items-center justify-between">
              <span>{c.studentCount ?? 78} students</span>
              <span className="btn-ghost text-xs px-3 py-1.5">Manage <Icon name="arrow-right" size={12}/></span>
            </div>
          </article>
        ))}
      </section>

      <AnimatePresence>
        {creating && <ClassFormModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['classes'] }); setCreating(false); }}/>}
        {open && <ClassDetailModal cls={open} onClose={() => setOpen(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['classes'] })}/>}
      </AnimatePresence>
    </div>
  );
}

function ClassFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', shift: 'Morning', sections: 'A,B' });
  const save = useMutation({
    mutationFn: async () => {
      const created: any = await Academic.classes.create({ name: form.name, shift: form.shift });
      const sections = form.sections.split(',').map(s => s.trim()).filter(Boolean);
      for (const s of sections) {
        await Academic.classes.addSection(created.id, { name: s });
      }
      return created;
    },
    onSuccess: () => { toast.success('Class created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Add class" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !form.name} className="btn-primary">{save.isPending ? 'Creating…' : 'Create class'}</button>
      </>}>
      <div className="space-y-3">
        <div><label className="label">Class name</label><input className="input mt-2" placeholder="Grade 11" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}/></div>
        <div><label className="label">Shift</label>
          <select className="input mt-2" value={form.shift} onChange={(e) => setForm(f => ({ ...f, shift: e.target.value }))}>
            <option>Morning</option><option>Afternoon</option><option>Evening</option>
          </select>
        </div>
        <div><label className="label">Sections (comma-separated)</label><input className="input mt-2" placeholder="A, B, C" value={form.sections} onChange={(e) => setForm(f => ({ ...f, sections: e.target.value }))}/></div>
      </div>
    </Modal>
  );
}

function ClassDetailModal({ cls, onClose, onChanged }: { cls: any; onClose: () => void; onChanged: () => void }) {
  const [newSection, setNewSection] = useState('');
  const addSection = useMutation({
    mutationFn: () => Academic.classes.addSection(cls.id, { name: newSection }),
    onSuccess: () => { toast.success('Section added'); setNewSection(''); onChanged(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title={cls.name} onClose={onClose} size="lg"
      footer={<button onClick={onClose} className="btn-ghost">Close</button>}>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-brand-gradient text-white grid place-items-center"><Icon name="school" /></div>
        <div>
          <h3 className="font-display text-lg font-semibold">{cls.name}</h3>
          <p className="text-sm text-ink-500">{cls.studentCount ?? 0} students · {(cls.sections ?? []).length} sections</p>
        </div>
      </div>
      <hr className="border-line my-5"/>
      <h4 className="label">Sections</h4>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(cls.sections ?? []).map((s: string) => (
          <div key={s} className="card p-3 flex items-center justify-between">
            <span className="font-semibold">Sec {s}</span>
            <button className="text-xs text-ink-400 hover:text-ink-900">Open →</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input className="input" placeholder="New section (e.g. D)" value={newSection} onChange={(e) => setNewSection(e.target.value)}/>
        <button onClick={() => addSection.mutate()} disabled={!newSection || addSection.isPending} className="btn-primary"><Icon name="plus" size={14}/></button>
      </div>
    </Modal>
  );
}
