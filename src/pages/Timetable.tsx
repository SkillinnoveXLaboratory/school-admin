import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat'];
const PERIODS = ['08:30','09:20','10:10','11:10','12:00','12:50','14:00','14:50'];
const SUBJECTS = ['English','Math','Science','SST','PE','Art','Music','Library'];
const HUES = ['bg-brand-50 text-brand-700','bg-info-bg text-info','bg-success-bg text-success','bg-warning-bg text-warning','bg-danger-bg text-danger'];

export function TimetablePage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 5" title="Timetable"
        subtitle="Weekly schedule grid. Drag a card to reschedule (coming soon)."
        actions={<>
          <select className="input h-10 w-44"><option>Grade 9 · Section A</option><option>Grade 10 · Section B</option></select>
          <button className="btn-primary"><Icon name="plus" size={16}/> Add slot</button>
        </>} />

      <div className="card p-4 overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: 8 }}>
          <thead>
            <tr>
              <th className="text-left text-xs text-ink-400 font-semibold pb-1 w-20">Period</th>
              {DAYS.map(d => <th key={d} className="text-xs text-ink-400 font-semibold pb-1">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p, ri) => (
              <tr key={p}>
                <td className="text-ink-400 text-xs font-mono align-middle">{p}</td>
                {DAYS.map((d, ci) => {
                  const subj = SUBJECTS[(ri + ci) % SUBJECTS.length];
                  const tone = HUES[(ri + ci) % HUES.length];
                  return (
                    <td key={`${d}-${p}`}>
                      <div className={`rounded-xl p-3 ${tone} transition-all duration-200 ease-springy hover:scale-[1.02] cursor-pointer`}>
                        <div className="text-[12px] font-semibold">{subj}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">Mrs. R · Rm {110 + ci}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
