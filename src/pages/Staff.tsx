import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { HR } from '@/lib/api/services';

const SAMPLE = [
  { id: '1', firstName: 'Anuradha', lastName: 'Rao',    email: 'anuradha@s.edu', role: 'TEACHER', department: 'Mathematics', salary: 58000, status: 'ACTIVE' },
  { id: '2', firstName: 'Rahul',    lastName: 'Patel',  email: 'rahul@s.edu',    role: 'FINANCE', department: 'Accounts',    salary: 72000, status: 'ACTIVE' },
  { id: '3', firstName: 'Meera',    lastName: 'Joshi',  email: 'meera@s.edu',    role: 'LIBRARY', department: 'Library',     salary: 42000, status: 'ACTIVE' },
  { id: '4', firstName: 'Vinay',    lastName: 'Kumar',  email: 'vinay@s.edu',    role: 'SPORTS',  department: 'Athletics',   salary: 50000, status: 'ACTIVE' },
];

export function StaffPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [payroll, setPayroll] = useState(false);
  const { data = [] } = useQuery<any[]>({ queryKey: ['employees'], queryFn: () => HR.employees.list() as any });
  const rows = data.length ? data : SAMPLE;

  const calc = useMutation({
    mutationFn: () => HR.payroll.calculate({ month: new Date().toISOString().slice(0,7) }),
    onSuccess: () => { toast.success('Payroll calculation queued'); setPayroll(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 9" title="Staff & HR" subtitle="Onboard employees, run payroll, manage roles."
        actions={<>
          <button onClick={() => setPayroll(true)} className="btn-outline"><Icon name="finance" size={16}/> Run payroll</button>
          <button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={16}/> Onboard employee</button>
        </>} />
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/60"><tr>
            <th className="table-header">Employee</th><th className="table-header">Role</th><th className="table-header">Department</th><th className="table-header">Salary</th><th className="table-header">Status</th><th className="table-header text-right pr-6"></th>
          </tr></thead>
          <tbody>
            {rows.map((e: any) => (
              <tr key={e.id} onClick={() => setActive(e)} className="hover:bg-muted/40 transition-colors cursor-pointer">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand-gradient text-white grid place-items-center font-semibold text-xs">
                      {e.firstName?.[0]}{e.lastName?.[0]}
                    </div>
                    <div><div className="font-semibold">{e.firstName} {e.lastName}</div><div className="text-xs text-ink-400">{e.email}</div></div>
                  </div>
                </td>
                <td className="table-cell"><span className="chip-brand">{e.role}</span></td>
                <td className="table-cell">{e.department}</td>
                <td className="table-cell font-mono text-xs">₹{e.salary?.toLocaleString() ?? '—'}</td>
                <td className="table-cell"><span className="chip-success">●&nbsp;{e.status ?? 'ACTIVE'}</span></td>
                <td className="table-cell text-right pr-6">
                  <button onClick={(ev) => { ev.stopPropagation(); setActive(e); }} className="btn-ghost py-1.5 px-3 text-xs">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {creating && <EmployeeFormModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['employees'] }); setCreating(false); }}/>}
        {active && <EmployeeDetailModal employee={active} onClose={() => setActive(null)}/>}
        {payroll && (
          <Modal title="Run payroll" onClose={() => setPayroll(false)}
            footer={<>
              <button onClick={() => setPayroll(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => calc.mutate()} disabled={calc.isPending} className="btn-primary">
                {calc.isPending ? 'Queuing…' : 'Calculate payroll'}
              </button>
            </>}>
            <p className="text-sm text-ink-500">Calculates monthly payroll for all active employees, applying salary, allowances, and deductions per policy.</p>
            <p className="text-sm text-ink-500 mt-3">Month: <strong>{new Date().toLocaleString(undefined,{month:'long', year:'numeric'})}</strong></p>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmployeeFormModal({ employee, onClose, onSaved }: { employee?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: employee?.firstName ?? '', lastName: employee?.lastName ?? '',
    email: employee?.email ?? '', phone: employee?.phone ?? '',
    role: employee?.role ?? 'TEACHER', department: employee?.department ?? '',
    salary: employee?.salary ?? 50000, joinDate: employee?.joinDate ?? new Date().toISOString().slice(0,10),
  });
  const save = useMutation({
    mutationFn: () => employee ? HR.employees.update(employee.id, form) : HR.employees.create(form),
    onSuccess: () => { toast.success(employee ? 'Updated' : 'Employee onboarded'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title={employee ? `Edit ${employee.firstName} ${employee.lastName}` : 'Onboard employee'} onClose={onClose} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
          {save.isPending ? 'Saving…' : (employee ? 'Save' : 'Onboard')}
        </button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" value={form.firstName} onChange={(v) => setForm(f => ({ ...f, firstName: v }))} required/>
        <Field label="Last name"  value={form.lastName}  onChange={(v) => setForm(f => ({ ...f, lastName: v }))} required/>
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} required/>
        <Field label="Phone" value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))}/>
        <div>
          <label className="label">Role</label>
          <select className="input mt-2" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
            {['TEACHER','FINANCE','SPORTS','LIBRARY','HR','ADMIN','OTHER'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <Field label="Department" value={form.department} onChange={(v) => setForm(f => ({ ...f, department: v }))}/>
        <Field label="Monthly salary (₹)" type="number" value={String(form.salary)} onChange={(v) => setForm(f => ({ ...f, salary: Number(v) }))}/>
        <Field label="Join date" type="date" value={form.joinDate} onChange={(v) => setForm(f => ({ ...f, joinDate: v }))}/>
      </div>
    </Modal>
  );
}

function EmployeeDetailModal({ employee, onClose }: { employee: any; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <EmployeeFormModal employee={employee} onClose={() => setEditing(false)} onSaved={onClose}/>;
  return (
    <Modal title={`${employee.firstName} ${employee.lastName}`} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Close</button>
        <button onClick={() => setEditing(true)} className="btn-primary">Edit</button>
      </>}>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-brand-gradient text-white grid place-items-center font-display font-bold">{employee.firstName?.[0]}{employee.lastName?.[0]}</div>
        <div>
          <h3 className="font-display text-lg font-semibold">{employee.firstName} {employee.lastName}</h3>
          <p className="text-sm text-ink-500">{employee.email}</p>
        </div>
      </div>
      <hr className="border-line my-5"/>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Row label="Role"        value={employee.role}/>
        <Row label="Department"  value={employee.department}/>
        <Row label="Salary"      value={`₹${employee.salary?.toLocaleString()}`}/>
        <Row label="Status"      value={employee.status ?? 'ACTIVE'}/>
        <Row label="Phone"       value={employee.phone ?? '—'}/>
        <Row label="Join date"   value={employee.joinDate ?? '—'}/>
      </dl>
      <hr className="border-line my-5"/>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => toast('Payslip generated')}  className="btn-outline justify-start"><Icon name="download" size={14}/> Latest payslip</button>
        <button onClick={() => toast('Opening attendance')} className="btn-outline justify-start"><Icon name="attendance" size={14}/> Attendance</button>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, type='text', required }: { label: string; value: string; onChange: (v: string)=>void; type?: string; required?: boolean }) {
  return <div><label className="label">{label}</label>
    <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} className="input mt-2"/></div>;
}
function Row({ label, value }: { label: string; value: any }) {
  return <div><dt className="text-ink-400 text-xs uppercase tracking-wider">{label}</dt><dd className="text-ink-900 mt-0.5">{String(value || '—')}</dd></div>;
}
