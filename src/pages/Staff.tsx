import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { HR } from '@/lib/api/services';
import type { HREmployee, HRPayrollRecord } from '@/lib/api/types';

const ROLE_OPTIONS = ['ALL', 'TEACHER', 'ACCOUNTANT', 'LIBRARIAN', 'DRIVER'] as const;
const EDIT_ROLES = ['TEACHER', 'ACCOUNTANT', 'LIBRARIAN', 'DRIVER'] as const;

export function StaffPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>('ALL');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<HREmployee | null>(null);
  const [runningPayroll, setRunningPayroll] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ['employees', role, page],
    queryFn: () => HR.employees.list({ role: role === 'ALL' ? undefined : role, page, limit: 12 }),
  });
  const historyQuery = useQuery({
    queryKey: ['payroll-history', page],
    queryFn: () => HR.payroll.history({ page, limit: 12 }),
  });

  const employees = employeesQuery.data?.employees ?? [];
  const meta = employeesQuery.data?.meta ?? { total: 0, page: 1, limit: 12, pages: 1 };
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.employeeId,
        employee.role,
        employee.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [employees, q]);

  const stats = useMemo(() => {
    const activeCount = employees.filter((employee) => employee.status === 'ACTIVE').length;
    const totalSalary = employees.reduce((sum, employee) => sum + (employee.baseSalary ?? 0), 0);
    return { activeCount, totalSalary };
  }, [employees]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 9"
        title="Staff & HR"
        subtitle={`Live employees: ${meta.total} total · ${filtered.length} shown`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRunningPayroll(true)} className="btn-outline">
              <Icon name="finance" size={16} /> Run payroll
            </button>
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Icon name="plus" size={16} /> Onboard employee
            </button>
          </div>
        )}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Employees" value={meta.total} />
        <StatCard label="Active" value={stats.activeCount} />
        <StatCard label="Monthly base" value={formatCurrency(stats.totalSalary)} />
        <StatCard label="Payroll logs" value={historyQuery.data?.meta.total ?? 0} />
      </section>

      <section className="card p-4 sm:p-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, employee ID, email, role..."
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setRole(opt);
                setPage(1);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                role === opt ? 'bg-surface shadow-soft text-ink-900' : 'bg-muted text-ink-500 hover:text-ink-900',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      <div className="card overflow-hidden">
        {employeesQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => <div key={idx} className="h-16 rounded-2xl bg-muted/60 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <h3 className="font-display text-xl font-semibold">No employees found</h3>
            <p className="text-sm text-ink-500 mt-1">Create the first employee or change role/search filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-muted/60">
                  <tr>
                    <Th>Employee</Th>
                    <Th>Employee ID</Th>
                    <Th>Role</Th>
                    <Th>Base Salary</Th>
                    <Th>Status</Th>
                    <Th className="text-right pr-6">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => setActive(employee)}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand-gradient text-white grid place-items-center text-xs font-semibold">
                            {initials(employee.firstName, employee.lastName)}
                          </div>
                          <div>
                            <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
                            <div className="text-xs text-ink-400">{employee.email}</div>
                          </div>
                        </div>
                      </Td>
                      <Td mono>{employee.employeeId || '—'}</Td>
                      <Td><span className="chip-brand">{employee.role || '—'}</span></Td>
                      <Td mono>{formatCurrency(employee.baseSalary)}</Td>
                      <Td><StatusChip status={employee.status} /></Td>
                      <Td className="text-right pr-6">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setActive(employee);
                          }}
                          className="btn-ghost py-1.5 px-3 text-xs"
                        >
                          Open
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-line/60">
              {filtered.map((employee) => (
                <button key={employee.id} onClick={() => setActive(employee)} className="w-full text-left p-4 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
                      <div className="text-xs text-ink-400 mt-1">{employee.email}</div>
                    </div>
                    <StatusChip status={employee.status} />
                  </div>
                  <div className="mt-2 text-xs text-ink-500">
                    {employee.role} · {employee.employeeId || 'No employee ID'} · {formatCurrency(employee.baseSalary)}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Payroll history</h3>
          <span className="text-xs text-ink-500">Live from `/hr/payroll/history`</span>
        </div>
        {(historyQuery.data?.history ?? []).length === 0 ? (
          <p className="text-sm text-ink-500 mt-3">No payroll records yet for this tenant.</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="w-full">
              <thead className="bg-muted/60">
                <tr>
                  <Th>Record</Th>
                  <Th>Month</Th>
                  <Th>Net Salary</Th>
                  <Th>Status</Th>
                  <Th className="text-right pr-3">Pay</Th>
                </tr>
              </thead>
              <tbody>
                {historyQuery.data?.history.map((record) => (
                  <PayrollRow key={record.id} record={record} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between text-sm text-ink-500">
        <span>Page {meta.page} of {Math.max(meta.pages, 1)}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1} className="btn-outline py-2 px-3 text-xs">Prev</button>
          <button onClick={() => setPage((prev) => Math.min(prev + 1, Math.max(meta.pages, 1)))} disabled={page >= Math.max(meta.pages, 1)} className="btn-outline py-2 px-3 text-xs">Next</button>
        </div>
      </div>

      <AnimatePresence>
        {creating && (
          <EmployeeOnboardModal
            onClose={() => setCreating(false)}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['employees'] });
              setCreating(false);
            }}
          />
        )}
        {active && (
          <EmployeeDetailModal
            employee={active}
            onClose={() => setActive(null)}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ['employees'] });
              qc.invalidateQueries({ queryKey: ['payroll-history'] });
            }}
          />
        )}
        {runningPayroll && (
          <PayrollRunModal
            onClose={() => setRunningPayroll(false)}
            onDone={() => {
              qc.invalidateQueries({ queryKey: ['payroll-history'] });
              setRunningPayroll(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmployeeOnboardModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'TEACHER',
    baseSalary: 45000,
    phone: '',
    department: 'Science',
    qualificationsText: '',
  });
  const save = useMutation({
    mutationFn: () => HR.employees.create({
      username: form.username,
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
      baseSalary: form.baseSalary,
      phone: form.phone || undefined,
      department: form.department || undefined,
      qualifications: parseQualifications(form.qualificationsText),
    }),
    onSuccess: (res) => {
      toast.success(res.message || 'Employee onboarded');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to onboard employee'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <Modal
      title="Onboard employee"
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button onClick={submit} disabled={save.isPending} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
            {save.isPending ? 'Saving...' : 'Onboard'}
          </button>
        </div>
      )}
    >
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Username" value={form.username} required onChange={(v) => setForm((f) => ({ ...f, username: v }))} />
        <Field label="Email" type="email" value={form.email} required onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
        <Field label="First name" value={form.firstName} required onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
        <Field label="Last name" value={form.lastName} required onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
        <Field label="Department" value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} />
        <div>
          <label className="label">Role</label>
          <select className="input mt-2" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.filter((r) => r !== 'ALL').map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <Field label="Base salary (INR)" type="number" value={String(form.baseSalary)} onChange={(v) => setForm((f) => ({ ...f, baseSalary: Number(v) }))} />
        <div className="sm:col-span-2">
          <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Qualifications</label>
          <textarea
            className="input mt-2 min-h-[120px]"
            placeholder="One qualification per line or comma-separated"
            value={form.qualificationsText}
            onChange={(e) => setForm((f) => ({ ...f, qualificationsText: e.target.value }))}
          />
          <p className="mt-1 text-xs text-ink-400">Submitted as an array. Leave empty if not applicable.</p>
        </div>
      </form>
    </Modal>
  );
}

function EmployeeDetailModal({
  employee,
  onClose,
  onChanged,
}: {
  employee: HREmployee;
  onClose: () => void;
  onChanged: () => void;
}) {
  const detailQuery = useQuery({
    queryKey: ['employee', employee.id],
    queryFn: () => HR.employees.get(employee.id),
  });
  const current = detailQuery.data ?? employee;
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(current.firstName);
  const [lastName, setLastName] = useState(current.lastName);
  const [role, setRole] = useState(current.role);
  const [baseSalary, setBaseSalary] = useState(current.baseSalary ?? 0);
  const [phone, setPhone] = useState(current.phone ?? '');
  const [department, setDepartment] = useState(current.department ?? '');
  const [qualificationsText, setQualificationsText] = useState((current.qualifications ?? []).join('\n'));

  useEffect(() => {
    setFirstName(current.firstName);
    setLastName(current.lastName);
    setRole(current.role);
    setBaseSalary(current.baseSalary ?? 0);
    setPhone(current.phone ?? '');
    setDepartment(current.department ?? '');
    setQualificationsText((current.qualifications ?? []).join('\n'));
  }, [current.id, current.firstName, current.lastName, current.role, current.baseSalary, current.phone, current.department, current.qualifications]);

  const update = useMutation({
    mutationFn: () => HR.employees.update(current.id, {
      firstName,
      lastName,
      role,
      baseSalary,
      phone,
      department,
      qualifications: parseQualifications(qualificationsText),
    }),
    onSuccess: (res) => {
      toast.success(res.message || 'Employee updated');
      if (res.employee) {
        qc.setQueryData(['employee', current.id], res.employee);
      }
      onChanged();
      setEditing(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to update employee'),
  });

  return (
    <Modal
      title={`${current.firstName} ${current.lastName}`}
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Close</button>
          {editing ? (
            <button onClick={() => update.mutate()} disabled={update.isPending} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
              {update.isPending ? 'Saving...' : 'Save changes'}
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Edit</button>
          )}
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-gradient text-white grid place-items-center font-semibold">
              {initials(current.firstName, current.lastName)}
            </div>
            <div>
              <div className="font-semibold">{current.firstName} {current.lastName}</div>
              <div className="text-xs text-ink-400">{current.email}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Info label="Employee ID" value={current.employeeId || '—'} mono />
          <Info label="Role" value={current.role || '—'} />
          <Info label="Status" value={current.status || '—'} />
          <Info label="Base salary" value={formatCurrency(current.baseSalary)} />
          <Info label="Joining date" value={formatDate(current.joiningDate)} />
          <Info label="Department" value={current.department || '—'} />
          <Info label="Qualifications" value={current.qualifications?.length ? current.qualifications.join(', ') : '—'} />
        </div>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
            <Field label="Department" value={department} onChange={setDepartment} />
            <div>
              <label className="label">Role</label>
              <select className="input mt-2" value={role} onChange={(e) => setRole(e.target.value)}>
                {EDIT_ROLES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <Field label="Base salary (INR)" type="number" value={String(baseSalary)} onChange={(v) => setBaseSalary(Number(v))} />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <div className="sm:col-span-2">
              <label className="label">Qualifications</label>
              <textarea
                className="input mt-2 min-h-[120px]"
                placeholder="One qualification per line or comma-separated"
                value={qualificationsText}
                onChange={(e) => setQualificationsText(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Info label="Phone" value={current.phone || '—'} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function parseQualifications(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function PayrollRunModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const run = useMutation({
    mutationFn: () => HR.payroll.calculate({ month, year }),
    onSuccess: (res) => {
      toast.success(res.message || 'Payroll calculation triggered');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to calculate payroll'),
  });

  return (
    <Modal
      title="Run payroll calculation"
      onClose={onClose}
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button onClick={() => run.mutate()} disabled={run.isPending} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
            {run.isPending ? 'Running...' : 'Calculate'}
          </button>
        </div>
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Month" type="number" value={String(month)} onChange={(v) => setMonth(Number(v))} />
        <Field label="Year" type="number" value={String(year)} onChange={(v) => setYear(Number(v))} />
      </div>
    </Modal>
  );
}

function PayrollRow({ record }: { record: HRPayrollRecord }) {
  const pay = useMutation({
    mutationFn: () => HR.payroll.pay(record.id),
    onSuccess: (res) => toast.success(res.message || `Marked as ${res.status || 'PAID'}`),
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to mark payroll paid'),
  });

  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <Td mono>{record.id}</Td>
      <Td>{record.month && record.year ? `${record.month}/${record.year}` : '—'}</Td>
      <Td mono>{formatCurrency(record.netSalary)}</Td>
      <Td>{record.status || '—'}</Td>
      <Td className="text-right pr-3">
        <button onClick={() => pay.mutate()} disabled={pay.isPending || record.status === 'PAID'} className="btn-ghost py-1.5 px-3 text-xs">
          {pay.isPending ? 'Paying...' : 'Mark paid'}
        </button>
      </Td>
    </tr>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="input mt-2" />
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={clsx('mt-1 text-sm text-ink-900 break-all', mono && 'font-mono text-xs')}>{value || '—'}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="stat-card">
      <p className="label">{label}</p>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </article>
  );
}

function StatusChip({ status }: { status?: string }) {
  if (status === 'ACTIVE') return <span className="chip-success">Active</span>;
  if (status === 'PAID') return <span className="chip-brand">Paid</span>;
  return <span className="chip-warning">{status || 'Unknown'}</span>;
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx('table-header', className)}>{children}</th>;
}

function Td({ children, className = '', mono = false }: { children: React.ReactNode; className?: string; mono?: boolean }) {
  return <td className={clsx('table-cell', mono && 'font-mono text-xs', className)}>{children}</td>;
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'E';
}

function formatCurrency(amount?: number) {
  if (typeof amount !== 'number') return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}
