import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Attendance as Att } from '@/lib/api/services';

type Status = 'PRESENT' | 'ABSENT' | 'LEAVE';

const STUDENTS = Array.from({ length: 32 }).map((_, i) => ({
  id: `s${i + 1}`,
  name: ['Aanya Sharma','Rohan Pillai','Krishna Iyer','Sara Khan','Aditi Verma','Yash Mehta','Mira Joshi','Ahmed Ali'][i % 8] + ` ${i+1}`,
  roll: `R-${1000 + i}`,
  initials: ['AS','RP','KI','SK','AV','YM','MJ','AA'][i % 8],
}));

export function AttendancePage() {
  const qc = useQueryClient();
  const [marks, setMarks] = useState<Record<string, Status>>(
    Object.fromEntries(STUDENTS.map(s => [s.id, 'PRESENT']))
  );
  const counts = Object.values(marks).reduce<Record<Status, number>>((a, m) => ({ ...a, [m]: (a[m] || 0) + 1 }), { PRESENT: 0, ABSENT: 0, LEAVE: 0 });

  const submit = useMutation({
    mutationFn: () => Att.record({ date: new Date().toISOString().slice(0,10), classId: 'demo', records: marks }),
    onSuccess: () => { toast.success('Attendance recorded'); qc.invalidateQueries({ queryKey: ['attendance'] }); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 4" title="Attendance"
        subtitle={`Marking for Grade 9 · Section A · ${new Date().toDateString()}`}
        actions={<>
          <button className="btn-outline"><Icon name="download" size={16}/> Export sheet</button>
          <button onClick={() => submit.mutate()} disabled={submit.isPending} className="btn-primary">
            <Icon name="check" size={16}/> {submit.isPending ? 'Saving…' : 'Submit attendance'}
          </button>
        </>} />

      <section className="grid sm:grid-cols-3 gap-3">
        {(['PRESENT','ABSENT','LEAVE'] as Status[]).map(s => (
          <div key={s} className="card p-4">
            <p className="text-xs uppercase tracking-wider text-ink-400">{s}</p>
            <div className="flex items-end justify-between mt-1">
              <p className="font-display text-[28px] font-bold">{counts[s]}</p>
              <span className={clsx('chip', s === 'PRESENT' ? 'chip-success' : s === 'ABSENT' ? 'chip-danger' : 'chip-warning')}>
                {((counts[s] / STUDENTS.length) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </section>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/60">
            <tr><th className="table-header">Student</th><th className="table-header">Roll</th><th className="table-header">Mark</th></tr>
          </thead>
          <tbody>
            {STUDENTS.map((s, i) => (
              <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i*0.01 }}
                className="hover:bg-muted/40 transition-colors">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-gradient text-white text-xs grid place-items-center font-semibold">{s.initials}</div>
                    <span>{s.name}</span>
                  </div>
                </td>
                <td className="table-cell font-mono text-xs">{s.roll}</td>
                <td className="table-cell">
                  <div className="inline-flex bg-muted p-1 rounded-xl">
                    {(['PRESENT','ABSENT','LEAVE'] as Status[]).map(opt => (
                      <button key={opt} onClick={() => setMarks(m => ({ ...m, [s.id]: opt }))}
                        className={clsx('px-3 py-1 rounded-lg text-[11px] font-semibold transition-all',
                          marks[s.id] === opt
                            ? (opt === 'PRESENT' ? 'bg-success text-white shadow-soft'
                             : opt === 'ABSENT'  ? 'bg-danger text-white shadow-soft'
                                                 : 'bg-warning text-white shadow-soft')
                            : 'text-ink-500 hover:text-ink-900')}>
                        {opt[0] + opt.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
