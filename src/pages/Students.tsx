import { FormEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Icon } from '@/components/Icon';
import { Lottie } from '@/components/Lottie';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { Students as StudentsApi, Data } from '@/lib/api/services';
import type { Student } from '@/lib/api/types';

export function StudentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'ALL'|'ENROLLED'|'GRADUATED'|'INACTIVE'>('ALL');
  const [active, setActive] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const { data = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students', q, status],
    queryFn: () => StudentsApi.list({ q: q || undefined }) as any,
  });
  const rows = data.filter(s => status === 'ALL' || s.status === status);

  const remove = useMutation({
    mutationFn: (id: string) => StudentsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setActive(null); toast.success('Student de-enrolled'); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  const importMut = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('file', file); return Data.importStudents(fd); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Import queued'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <input ref={importRef} type="file" accept=".csv,.xlsx" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importMut.mutate(f); e.currentTarget.value = ''; }}/>

      <PageHeader eyebrow="Module 3" title="Students"
        subtitle={`${rows.length} student${rows.length === 1 ? '' : 's'} matching filters`}
        actions={<>
          <button onClick={() => importRef.current?.click()} className="btn-outline">
            <Icon name="upload" size={16}/> {importMut.isPending ? 'Uploading…' : 'Bulk import'}
          </button>
          <button onClick={() => Data.exportStudents().then(() => toast.success('Export ready')).catch(()=>toast.error('Failed'))}
            className="btn-outline">
            <Icon name="download" size={16}/> Export
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={16}/> Add student</button>
        </>} />

      <div className="card p-4 flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, enrollment #…" className="input pl-9" />
        </div>
        <div className="flex bg-muted p-1 rounded-xl">
          {(['ALL','ENROLLED','GRADUATED','INACTIVE'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={clsx('px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                status === s ? 'bg-surface shadow-soft text-ink-900' : 'text-ink-500 hover:text-ink-900')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-14 bg-muted/60 rounded-xl animate-pulse"/>)}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 grid place-items-center text-center">
            <Lottie src="/lottie/empty-quiet.json" className="w-44" />
            <h3 className="font-display text-lg font-semibold mt-2">No students match</h3>
            <p className="text-ink-500 text-sm max-w-sm mt-1">Try adjusting filters or import a roster.</p>
            <button onClick={() => setCreating(true)} className="btn-primary mt-5"><Icon name="plus" size={16}/> Add student</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/60">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Enrollment</th>
                <th className="table-header">Class</th>
                <th className="table-header">Parent contact</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right pr-6"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <motion.tr key={s.id} onClick={() => setActive(s)}
                  className="hover:bg-muted/40 transition-colors group cursor-pointer"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-brand-gradient text-white grid place-items-center font-semibold text-xs">
                        {s.firstName?.[0]}{s.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{s.firstName} {s.lastName}</div>
                        <div className="text-xs text-ink-400">{s.gender} · DOB {s.dateOfBirth?.slice(0,10)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs">{s.enrollmentNumber}</td>
                  <td className="table-cell text-ink-700">{(s as any).className ?? '—'}</td>
                  <td className="table-cell">
                    <div className="text-sm">{s.parentContact?.fatherName ?? s.parentContact?.motherName ?? '—'}</div>
                    <div className="text-xs text-ink-400">{s.parentContact?.primaryPhone}</div>
                  </td>
                  <td className="table-cell">
                    {s.status === 'ENROLLED' ? <span className="chip-success">●&nbsp;Enrolled</span>
                      : s.status === 'GRADUATED' ? <span className="chip-brand">Graduated</span>
                      : <span className="chip-warning">{s.status}</span>}
                  </td>
                  <td className="table-cell text-right pr-6">
                    <button onClick={(e) => { e.stopPropagation(); setActive(s); }} className="btn-ghost py-1.5 px-3 text-xs">Profile</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {creating && <StudentFormModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['students'] }); setCreating(false); }}/>}
        {active && (
          <StudentDetailModal student={active} onClose={() => setActive(null)}
            onDelete={() => remove.mutate(active.id)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['students'] }); setActive(null); }}/>
        )}
      </AnimatePresence>
    </div>
  );
}

function StudentFormModal({ student, onClose, onSaved }: { student?: Student; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: student?.firstName ?? '',
    lastName:  student?.lastName ?? '',
    dateOfBirth: student?.dateOfBirth ?? '',
    gender: student?.gender ?? 'MALE',
    enrollmentNumber: student?.enrollmentNumber ?? '',
    classId: student?.classId ?? '',
    sectionId: student?.sectionId ?? '',
    emergencyContact: student?.emergencyContact ?? '',
    fatherName: student?.parentContact?.fatherName ?? '',
    motherName: student?.parentContact?.motherName ?? '',
    primaryPhone: student?.parentContact?.primaryPhone ?? '',
    homeAddress: student?.parentContact?.homeAddress ?? '',
  });
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        firstName: form.firstName, lastName: form.lastName, dateOfBirth: form.dateOfBirth,
        gender: form.gender, enrollmentNumber: form.enrollmentNumber,
        classId: form.classId, sectionId: form.sectionId, emergencyContact: form.emergencyContact,
        parentContact: { fatherName: form.fatherName, motherName: form.motherName, primaryPhone: form.primaryPhone, homeAddress: form.homeAddress },
      };
      return student ? StudentsApi.update(student.id, payload) : StudentsApi.create(payload);
    },
    onSuccess: () => { toast.success(student ? 'Student updated' : 'Student added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  function submit(e: FormEvent) { e.preventDefault(); save.mutate(); }

  return (
    <Modal title={student ? `Edit ${student.firstName} ${student.lastName}` : 'Add student'} onClose={onClose}
      size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={save.isPending} className="btn-primary">
          <Icon name="check" size={14}/> {save.isPending ? 'Saving…' : (student ? 'Save changes' : 'Add student')}
        </button>
      </>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} required/>
          <Field label="Last name"  value={form.lastName}  onChange={v => setForm(f => ({ ...f, lastName: v }))} required/>
          <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))}/>
          <div><label className="label">Gender</label>
            <select className="input mt-2" value={form.gender} onChange={e=>setForm(f=>({...f, gender: e.target.value as any}))}>
              {['MALE','FEMALE','OTHER'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <Field label="Enrollment number" value={form.enrollmentNumber} onChange={v => setForm(f => ({ ...f, enrollmentNumber: v }))} required/>
          <Field label="Emergency contact" value={form.emergencyContact} onChange={v => setForm(f => ({ ...f, emergencyContact: v }))}/>
          <Field label="Class ID"   value={form.classId}   onChange={v => setForm(f => ({ ...f, classId: v }))}/>
          <Field label="Section ID" value={form.sectionId} onChange={v => setForm(f => ({ ...f, sectionId: v }))}/>
        </div>
        <hr className="border-line"/>
        <h3 className="label">Parent / Guardian</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Father" value={form.fatherName} onChange={v => setForm(f => ({ ...f, fatherName: v }))}/>
          <Field label="Mother" value={form.motherName} onChange={v => setForm(f => ({ ...f, motherName: v }))}/>
          <Field label="Primary phone" value={form.primaryPhone} onChange={v => setForm(f => ({ ...f, primaryPhone: v }))}/>
          <Field label="Home address" value={form.homeAddress} onChange={v => setForm(f => ({ ...f, homeAddress: v }))}/>
        </div>
      </form>
    </Modal>
  );
}

function StudentDetailModal({ student, onClose, onDelete, onSaved }: { student: Student; onClose: () => void; onDelete: () => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <StudentFormModal student={student} onClose={() => setEditing(false)} onSaved={onSaved}/>;
  return (
    <Modal title={`${student.firstName} ${student.lastName}`} onClose={onClose} size="lg"
      footer={<>
        <button onClick={() => { if (confirm('De-enroll this student?')) onDelete(); }}
          className="btn-ghost text-danger hover:bg-danger-bg">De-enroll</button>
        <button onClick={onClose} className="btn-ghost">Close</button>
        <button onClick={() => setEditing(true)} className="btn-primary"><Icon name="settings" size={14}/> Edit</button>
      </>}>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-brand-gradient text-white grid place-items-center font-display font-bold text-lg">
          {student.firstName[0]}{student.lastName[0]}
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold">{student.firstName} {student.lastName}</h3>
          <p className="text-sm text-ink-500 font-mono">{student.enrollmentNumber}</p>
        </div>
        <div className="ml-auto">
          {student.status === 'ENROLLED' ? <span className="chip-success">●&nbsp;Enrolled</span> : <span className="chip-warning">{student.status}</span>}
        </div>
      </div>
      <hr className="border-line my-5"/>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Row label="Gender" value={student.gender}/>
        <Row label="Date of birth" value={student.dateOfBirth?.slice(0,10) ?? '—'}/>
        <Row label="Class ID" value={student.classId} mono/>
        <Row label="Section ID" value={student.sectionId} mono/>
        <Row label="Emergency contact" value={student.emergencyContact}/>
        <Row label="School ID" value={student.schoolId} mono/>
      </dl>
      <hr className="border-line my-5"/>
      <h4 className="label">Parent / Guardian</h4>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mt-3">
        <Row label="Father" value={student.parentContact?.fatherName ?? '—'}/>
        <Row label="Mother" value={student.parentContact?.motherName ?? '—'}/>
        <Row label="Primary phone" value={student.parentContact?.primaryPhone ?? '—'}/>
        <Row label="Home address" value={student.parentContact?.homeAddress ?? '—'}/>
      </dl>
      <hr className="border-line my-5"/>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => toast('Opening attendance log…')} className="btn-outline justify-start"><Icon name="attendance" size={14}/> Attendance log</button>
        <button onClick={() => toast('Opening report card…')} className="btn-outline justify-start"><Icon name="exam" size={14}/> Report card</button>
        <button onClick={() => toast('Opening fee ledger…')} className="btn-outline justify-start"><Icon name="finance" size={14}/> Fee ledger</button>
        <button onClick={() => toast('Generating ID card PDF…')} className="btn-outline justify-start"><Icon name="download" size={14}/> ID card PDF</button>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, type='text', required }: { label: string; value: string; onChange: (v: string)=>void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} className="input mt-2" />
    </div>
  );
}
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-ink-400 text-xs uppercase tracking-wider">{label}</dt>
      <dd className={`text-ink-900 mt-0.5 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</dd>
    </div>
  );
}
