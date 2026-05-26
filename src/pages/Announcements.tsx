import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Communication } from '@/lib/api/services';

export function AnnouncementsPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery<any[]>({ queryKey: ['ann'], queryFn: () => Communication.announcements.list() as any });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'ALL'|'PARENTS'|'STAFF'|'CLASS'>('ALL');
  const send = useMutation({
    mutationFn: () => Communication.announcements.create({ title, body, audience }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ann'] }); toast.success('Sent'); setTitle(''); setBody(''); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 7" title="Announcements" subtitle="Send circulars to parents, staff, or specific classes." />
      <div className="grid lg:grid-cols-5 gap-6">
        <motion.form onSubmit={(e: FormEvent) => { e.preventDefault(); send.mutate(); }}
          className="card p-6 space-y-4 lg:col-span-2"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div><label className="label">Title</label><input className="input mt-2" required value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div><label className="label">Body</label><textarea className="input mt-2 min-h-[140px]" required value={body} onChange={e=>setBody(e.target.value)}/></div>
          <div>
            <label className="label">Audience</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {(['ALL','PARENTS','STAFF','CLASS'] as const).map(a => (
                <button key={a} type="button" onClick={() => setAudience(a)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${audience === a ? 'bg-brand-gradient text-white' : 'bg-muted text-ink-500 hover:text-ink-900'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={send.isPending} className="btn-primary w-full"><Icon name="announcement" size={16}/> {send.isPending ? 'Sending…' : 'Publish'}</button>
        </motion.form>
        <div className="lg:col-span-3 space-y-3">
          {(items.length ? items : SAMPLE).map((a:any, i:number) => (
            <motion.article key={a.id ?? i} className="card p-5"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}>
              <div className="flex justify-between items-start gap-3">
                <div><h3 className="font-display text-base font-semibold">{a.title}</h3>
                  <p className="text-sm text-ink-500 mt-1.5">{a.body}</p></div>
                <span className="chip-brand">{a.audience}</span>
              </div>
              <div className="text-[11px] text-ink-400 mt-3">{a.when}</div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
const SAMPLE = [
  { title: 'PTM on Saturday',                 body: 'Parent-teacher meetings 09:00–12:00. Bring your child\'s diary.', audience: 'PARENTS', when: '2 hours ago' },
  { title: 'No school 31 May',                 body: 'Holiday declared due to civic elections.',                       audience: 'ALL',     when: 'Yesterday' },
  { title: 'Sports trials — Grade 9',          body: 'Trials for school football team on Friday after lunch.',         audience: 'CLASS',   when: '3 days ago' },
];
