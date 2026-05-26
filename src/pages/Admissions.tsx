import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Admissions } from '@/lib/api/services';

const SAMPLE = [
  { id: 'a1', firstName: 'Ananya', lastName: 'Iyer',  email: 'parent@x.com',  classApplied: 'Grade 1', stage: 'VERIFIED', submittedAt: '2026-05-11' },
  { id: 'a2', firstName: 'Vihaan', lastName: 'Singh', email: 'parent@y.com',  classApplied: 'Grade 6', stage: 'APPROVED', submittedAt: '2026-05-09' },
  { id: 'a3', firstName: 'Diya',   lastName: 'Khan',  email: 'parent@z.com',  classApplied: 'Grade 9', stage: 'RECEIVED', submittedAt: '2026-05-12' },
];

export function AdmissionsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<any>(null);
  const { data: list = [] } = useQuery<any[]>({ queryKey: ['admissions'], queryFn: () => Admissions.list() as any });
  const rows = list.length ? list : SAMPLE;

  const advance = (id: string, action: 'verify'|'approve'|'enroll') => async () => {
    try {
      if (action === 'verify') await Admissions.verify(id);
      if (action === 'approve') await Admissions.approve(id);
      if (action === 'enroll') await Admissions.enroll(id, {});
      qc.invalidateQueries({ queryKey: ['admissions'] });
      toast.success(`Application ${action === 'enroll' ? 'enrolled' : action + 'd'}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 2" title="Admissions" subtitle="Track applications from received to enrolled."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={16}/> New application</button>} />

      <section className="grid sm:grid-cols-4 gap-3">
        {[{label:'Received',v:rows.length},{label:'Verified',v:rows.filter((r:any)=>r.stage==='VERIFIED').length},{label:'Approved',v:rows.filter((r:any)=>r.stage==='APPROVED').length},{label:'Enrolled',v:rows.filter((r:any)=>r.stage==='ENROLLED').length}].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs uppercase tracking-wider text-ink-400">{s.label}</p>
            <p className="font-display text-[28px] font-bold mt-1">{s.v}</p>
          </div>
        ))}
      </section>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/60">
            <tr><th className="table-header">Applicant</th><th className="table-header">Class applied</th><th className="table-header">Stage</th><th className="table-header">Submitted</th><th className="table-header text-right pr-6"></th></tr>
          </thead>
          <tbody>
            {rows.map((a:any) => (
              <tr key={a.id} onClick={() => setActive(a)} className="hover:bg-muted/40 transition-colors cursor-pointer">
                <td className="table-cell">
                  <div className="font-semibold">{a.firstName} {a.lastName}</div>
                  <div className="text-xs text-ink-400">{a.contactEmail ?? a.email}</div>
                </td>
                <td className="table-cell">{a.classApplied ?? '—'}</td>
                <td className="table-cell"><span className="chip-brand">{a.stage ?? 'RECEIVED'}</span></td>
                <td className="table-cell text-ink-500 text-xs">{(a.submittedAt ?? '').slice(0,10)}</td>
                <td className="table-cell text-right pr-6 space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={advance(a.id,'verify')}  className="btn-ghost py-1.5 px-3 text-xs">Verify</button>
                  <button onClick={advance(a.id,'approve')} className="btn-ghost py-1.5 px-3 text-xs">Approve</button>
                  <button onClick={advance(a.id,'enroll')}  className="btn-primary py-1.5 px-3 text-xs">Enroll</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {creating && <ApplicationFormModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admissions'] }); setCreating(false); }}/>}
        {active && <ApplicationDetailModal app={active} onClose={() => setActive(null)} onAdvance={advance}/>}
      </AnimatePresence>
    </div>
  );
}

function ApplicationFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', classApplied: '', dateOfBirth: '' });
  const save = useMutation({
    mutationFn: () => Admissions.apply(f),
    onSuccess: () => { toast.success('Application submitted'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="New admission application" onClose={onClose} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.firstName} className="btn-primary">{save.isPending ? 'Submitting…' : 'Submit'}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        {[['firstName','First name'],['lastName','Last name'],['email','Parent email'],['phone','Phone'],['classApplied','Class applied for'],['dateOfBirth','Child DOB']].map(([k,l]) => (
          <div key={k}>
            <label className="label">{l}</label>
            <input type={k === 'dateOfBirth' ? 'date' : k === 'email' ? 'email' : 'text'}
              className="input mt-2"
              value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value } as any)}/>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ApplicationDetailModal({ app, onClose, onAdvance }: { app: any; onClose: () => void; onAdvance: any }) {
  return (
    <Modal title={`${app.firstName} ${app.lastName}`} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Close</button>
        <button onClick={onAdvance(app.id, 'verify')}  className="btn-outline">Verify</button>
        <button onClick={onAdvance(app.id, 'approve')} className="btn-outline">Approve</button>
        <button onClick={onAdvance(app.id, 'enroll')}  className="btn-primary"><Icon name="check" size={14}/> Enroll</button>
      </>}>
      <span className="chip-brand">{app.stage ?? 'RECEIVED'}</span>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mt-4">
        <Row label="Parent email" value={app.email}/>
        <Row label="Class applied" value={app.classApplied}/>
        <Row label="Phone" value={app.phone ?? '—'}/>
        <Row label="Submitted" value={(app.submittedAt ?? '').slice(0,10)}/>
      </dl>
      <hr className="border-line my-5"/>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => toast('Upload doc UI coming…')} className="btn-outline justify-start"><Icon name="upload" size={14}/> Upload document</button>
        <button onClick={() => toast('Print confirmation')} className="btn-outline justify-start"><Icon name="download" size={14}/> Print confirmation</button>
      </div>
    </Modal>
  );
}
function Row({ label, value }: { label: string; value: any }) {
  return <div><dt className="text-ink-400 text-xs uppercase tracking-wider">{label}</dt><dd className="text-ink-900 mt-0.5">{String(value || '—')}</dd></div>;
}
