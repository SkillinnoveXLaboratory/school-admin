import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Sports } from '@/lib/api/services';

const SAMPLE = [
  { id: 's1', name: 'Football',   coach: 'Vinay Kumar',  players: 36, weekly: 6, colorA: '#10B981', colorB: '#0EA5E9' },
  { id: 's2', name: 'Basketball', coach: 'Aakash Singh', players: 24, weekly: 4, colorA: '#F59E0B', colorB: '#EF4444' },
  { id: 's3', name: 'Cricket',    coach: 'Suresh Rao',   players: 28, weekly: 5, colorA: '#4F46E5', colorB: '#8B5CF6' },
  { id: 's4', name: 'Athletics',  coach: 'Rita Menon',   players: 42, weekly: 5, colorA: '#7C3AED', colorB: '#EC4899' },
  { id: 's5', name: 'Chess',      coach: 'Karthik V.',   players: 18, weekly: 2, colorA: '#0F172A', colorB: '#475569' },
  { id: 's6', name: 'Swimming',   coach: 'Maya Iyer',    players: 22, weekly: 3, colorA: '#0EA5E9', colorB: '#4F46E5' },
];

export function SportsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<any>(null);
  const { data = [] } = useQuery<any[]>({ queryKey: ['sports'], queryFn: () => Sports.list() as any });
  const rows = data.length ? data : SAMPLE;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 6" title="Sports & activities"
        subtitle="Categories, coaches, and student assignments."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={16}/> New category</button>} />

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((s:any, i:number) => (
          <motion.article key={s.id} onClick={() => setActive(s)} className="card p-5 overflow-hidden relative cursor-pointer hover:shadow-pop hover:border-brand-300 transition-all"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}>
            <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-20" style={{ background: `linear-gradient(135deg, ${s.colorA}, ${s.colorB})` }} />
            <div className="relative">
              <div className="h-11 w-11 rounded-xl text-white grid place-items-center" style={{ background: `linear-gradient(135deg, ${s.colorA}, ${s.colorB})` }}><Icon name="sports" /></div>
              <h3 className="font-display text-lg font-semibold mt-3">{s.name}</h3>
              <p className="text-sm text-ink-500">Coach: {s.coach}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
                <span>{s.players} players</span>
                <span>{s.weekly}h / week</span>
              </div>
            </div>
          </motion.article>
        ))}
      </section>

      <AnimatePresence>
        {creating && <SportFormModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['sports'] }); setCreating(false); }}/>}
        {active && <SportDetailModal sport={active} onClose={() => setActive(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['sports'] })}/>}
      </AnimatePresence>
    </div>
  );
}

function SportFormModal({ sport, onClose, onSaved }: { sport?: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: sport?.name ?? '', coach: sport?.coach ?? '', weekly: sport?.weekly ?? 4 });
  const save = useMutation({
    mutationFn: () => sport ? Sports.update(sport.id, f) : Sports.create(f),
    onSuccess: () => { toast.success(sport ? 'Updated' : 'Category created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title={sport ? `Edit ${sport.name}` : 'New sport category'} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.name} className="btn-primary">{save.isPending ? 'Saving…' : 'Save'}</button>
      </>}>
      <div className="space-y-3">
        <div><label className="label">Name</label><input className="input mt-2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}/></div>
        <div><label className="label">Coach</label><input className="input mt-2" value={f.coach} onChange={(e) => setF({ ...f, coach: e.target.value })}/></div>
        <div><label className="label">Hours / week</label><input type="number" className="input mt-2" value={f.weekly} onChange={(e) => setF({ ...f, weekly: Number(e.target.value) })}/></div>
      </div>
    </Modal>
  );
}

function SportDetailModal({ sport, onClose, onChanged }: { sport: any; onClose: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [studentId, setStudentId] = useState('');
  const assign = useMutation({
    mutationFn: () => Sports.assign(sport.id, { studentId }),
    onSuccess: () => { toast.success('Player assigned'); setStudentId(''); onChanged(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  const remove = useMutation({
    mutationFn: () => Sports.remove(sport.id),
    onSuccess: () => { toast.success('Removed'); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  if (editing) return <SportFormModal sport={sport} onClose={() => setEditing(false)} onSaved={() => { onChanged(); setEditing(false); }}/>;
  return (
    <Modal title={sport.name} onClose={onClose} size="lg"
      footer={<>
        <button onClick={() => { if (confirm('Delete this sport?')) remove.mutate(); }} className="btn-ghost text-danger hover:bg-danger-bg">Delete</button>
        <button onClick={onClose} className="btn-ghost">Close</button>
        <button onClick={() => setEditing(true)} className="btn-primary">Edit</button>
      </>}>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl text-white grid place-items-center" style={{ background: `linear-gradient(135deg, ${sport.colorA}, ${sport.colorB})` }}><Icon name="sports"/></div>
        <div>
          <h3 className="font-display text-xl font-semibold">{sport.name}</h3>
          <p className="text-sm text-ink-500">Coach: {sport.coach} · {sport.players} players</p>
        </div>
      </div>
      <hr className="border-line my-5"/>
      <h4 className="label">Assign player</h4>
      <div className="mt-3 flex gap-2">
        <input className="input" placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)}/>
        <button onClick={() => assign.mutate()} disabled={!studentId || assign.isPending} className="btn-primary">{assign.isPending ? 'Adding…' : 'Assign'}</button>
      </div>
      <hr className="border-line my-5"/>
      <h4 className="label">Roster</h4>
      <div className="mt-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {Array.from({ length: Math.min(sport.players ?? 6, 12) }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-brand-gradient text-white text-xs grid place-items-center font-semibold">P{i+1}</div>
              <span className="text-sm">Player {i+1}</span>
            </div>
            <button onClick={() => Sports.unassign(sport.id, { studentId: 'demo' }).then(() => toast.success('Removed'))} className="text-xs text-danger hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
