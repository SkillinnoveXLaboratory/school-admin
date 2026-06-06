import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { HR, Sports, Students } from '@/lib/api/services';
import type { HREmployee, Student } from '@/lib/api/types';
import { compactId, fullName, idOf, rowsFrom, statusClass, textOf } from '@/lib/viewUtils';

export function SportsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<any>(null);

  const sportsQuery = useQuery({ queryKey: ['sports'], queryFn: () => Sports.list() });
  const employeesQuery = useQuery({ queryKey: ['hr-employees', 'sports'], queryFn: () => HR.employees.list({ page: 1, limit: 100 }) });
  const studentsQuery = useQuery({ queryKey: ['students', 'sports'], queryFn: () => Students.list({ page: 1, limit: 100 }) });

  const rows = rowsFrom<any>(sportsQuery.data, ['sportsActivities', 'data']);
  const employees = employeesQuery.data?.employees ?? [];
  const students = studentsQuery.data?.students ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 6"
        title="Sports & activities"
        subtitle="Live sports activity catalog, instructors, and student assignment."
        actions={<button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={16} /> New activity</button>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Activities" value={rows.length} tone="chip-brand" />
        <Stat label="Instructors" value={new Set(rows.map((row) => idOf(row.instructorId)).filter(Boolean)).size} tone="chip-success" />
        <Stat label="Assigned students" value={rows.reduce((total, row) => total + rowsFrom(row, ['assignedStudentIds']).length, 0)} tone="chip-warning" />
        <Stat label="Staff loaded" value={employees.length} tone="chip-brand" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((sport, index) => (
          <motion.button
            key={idOf(sport)}
            onClick={() => setActive(sport)}
            className="card p-4 sm:p-5 text-left transition-all hover:border-brand-300 hover:shadow-pop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-info-bg text-info">
                <Icon name="sports" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-semibold truncate">{textOf(sport, ['activityName'])}</h3>
                <p className="mt-1 text-sm text-ink-500 truncate">Instructor: {instructorName(sport.instructorId, employees)}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="label">Assigned</p>
                <p className="mt-1 font-semibold text-ink-900">{rowsFrom(sport, ['assignedStudentIds']).length}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="label">Activity ID</p>
                <p className="mt-1 font-mono text-[11px] text-ink-600">{compactId(sport)}</p>
              </div>
            </div>
          </motion.button>
        ))}
        {!rows.length && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-400 sm:col-span-2 xl:col-span-3">
            {sportsQuery.isLoading ? 'Loading sports activities...' : 'No sports activities returned by the API.'}
          </div>
        )}
      </section>

      <AnimatePresence>
        {creating && <SportFormModal employees={employees} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['sports'] }); }} />}
        {active && (
          <SportDetailModal
            sport={active}
            employees={employees}
            students={students}
            onClose={() => setActive(null)}
            onChanged={() => qc.invalidateQueries({ queryKey: ['sports'] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SportFormModal({ sport, employees, onClose, onSaved }: { sport?: any; employees: HREmployee[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    activityName: textOf(sport, ['activityName'], ''),
    instructorId: idOf(sport?.instructorId) || employees[0]?.userId || employees[0]?.id || '',
  });
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        activityName: form.activityName,
        ...(form.instructorId ? { instructorId: form.instructorId } : {}),
      };
      return sport ? Sports.update(idOf(sport), payload) : Sports.create(payload);
    },
    onSuccess: (body: any) => {
      toast.success(body?.message || (sport ? 'Sports activity updated' : 'Sports activity created'));
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save activity'),
  });

  return (
    <Modal
      title={sport ? 'Edit sports activity' : 'New sports activity'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.activityName} className="btn-primary">
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Activity name" value={form.activityName} onChange={(activityName) => setForm({ ...form, activityName })} />
        <div>
          <label className="label">Instructor</label>
          <select className="input mt-2" value={form.instructorId} onChange={(event) => setForm({ ...form, instructorId: event.target.value })}>
            <option value="">No instructor</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.userId || employee.id}>
                {employee.firstName || employee.username || employee.email || compactId(employee.id)} {employee.lastName} · {employee.role}
              </option>
            ))}
          </select>
        </div>
        {!employees.length && <p className="text-xs text-warning">No staff records returned. Create an employee first, then select that staff user here.</p>}
      </div>
    </Modal>
  );
}

function SportDetailModal({ sport, employees, students, onClose, onChanged }: { sport: any; employees: HREmployee[]; students: Student[]; onClose: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const detailQuery = useQuery({ queryKey: ['sports', idOf(sport)], queryFn: () => Sports.get(idOf(sport)), enabled: Boolean(idOf(sport)) });
  const liveSport = detailQuery.data?.sportsActivity ?? detailQuery.data?.data ?? sport;
  const assigned = rowsFrom<any>(liveSport, ['assignedStudentIds']);

  const assign = useMutation({
    mutationFn: () => Sports.assign(idOf(liveSport), { studentIds: [studentId] }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Student assigned');
      onChanged();
      detailQuery.refetch();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to assign student'),
  });
  const unassign = useMutation({
    mutationFn: (id: string) => Sports.unassign(idOf(liveSport), { studentIds: [id] }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Student removed');
      onChanged();
      detailQuery.refetch();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove student'),
  });
  const remove = useMutation({
    mutationFn: () => Sports.remove(idOf(liveSport)),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Sports activity removed');
      onChanged();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete activity'),
  });

  if (editing) {
    return (
      <SportFormModal
        sport={liveSport}
        employees={employees}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChanged();
          detailQuery.refetch();
        }}
      />
    );
  }

  return (
    <Modal
      title={textOf(liveSport, ['activityName'])}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={() => { if (confirm('Delete this sports activity?')) remove.mutate(); }} disabled={remove.isPending} className="btn-ghost text-danger hover:bg-danger-bg">Delete</button>
          <button onClick={onClose} className="btn-ghost">Close</button>
          <button onClick={() => setEditing(true)} className="btn-primary">Edit</button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-info-bg text-info"><Icon name="sports" size={24} /></div>
        <div>
          <h3 className="font-display text-xl font-semibold">{textOf(liveSport, ['activityName'])}</h3>
          <p className="text-sm text-ink-500">Instructor: {instructorName(liveSport.instructorId, employees)}</p>
          <p className="mt-1 text-xs text-ink-400">Activity ID {idOf(liveSport)}</p>
        </div>
      </div>

      <hr className="my-5 border-line" />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="label">Assign student</label>
          <select className="input mt-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.status}</option>
            ))}
          </select>
        </div>
        <button onClick={() => assign.mutate()} disabled={assign.isPending || !studentId} className="btn-primary self-end">
          {assign.isPending ? 'Assigning...' : 'Assign'}
        </button>
      </div>

      <div className="mt-5">
        <h4 className="label">Assigned students</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {assigned.map((item) => {
            const assignedId = idOf(item) || String(item);
            const student = students.find((candidate) => candidate.id === assignedId);
            return (
              <div key={assignedId} className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                <div>
                  <p className="font-semibold text-ink-900">{student ? `${student.firstName} ${student.lastName}` : fullName(item, compactId(assignedId))}</p>
                  <p className="text-xs text-ink-400">{assignedId}</p>
                </div>
                <button onClick={() => unassign.mutate(assignedId)} disabled={unassign.isPending} className="btn-ghost px-2 py-1 text-xs text-danger hover:bg-danger-bg">Remove</button>
              </div>
            );
          })}
          {!assigned.length && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400 sm:col-span-2">No students assigned to this activity yet.</p>}
        </div>
      </div>
    </Modal>
  );
}

function instructorName(instructor: any, employees: HREmployee[]) {
  const instructorId = idOf(instructor);
  if (instructorId) {
    const employee = employees.find((item) => item.userId === instructorId || item.id === instructorId);
    if (employee) return `${employee.firstName || employee.username || employee.email} ${employee.lastName || ''}`.trim();
  }
  return fullName(instructor, instructorId ? compactId(instructorId) : 'Not assigned');
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

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
