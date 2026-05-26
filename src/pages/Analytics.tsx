import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { PageHeader } from '@/components/PageHeader';

const PERF = [
  { class: 'Gr 6', avg: 78, attendance: 96 },
  { class: 'Gr 7', avg: 74, attendance: 94 },
  { class: 'Gr 8', avg: 70, attendance: 93 },
  { class: 'Gr 9', avg: 67, attendance: 91 },
  { class: 'Gr 10',avg: 73, attendance: 89 },
];
const FUNNEL = [
  { stage: 'Visits',     value: 4200 },
  { stage: 'Applied',    value: 820  },
  { stage: 'Verified',   value: 510  },
  { stage: 'Approved',   value: 380  },
  { stage: 'Enrolled',   value: 312  },
];

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 12" title="Analytics" subtitle="Class performance, attendance trends, admissions funnel." />
      <section className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Class average score</h2>
          <p className="text-xs text-ink-400">Latest examination</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <BarChart data={PERF}>
                <CartesianGrid strokeDasharray="3 6" stroke="#E2E8F0" vertical={false}/>
                <XAxis dataKey="class" fontSize={12} stroke="#94A3B8" tickLine={false} axisLine={false}/>
                <YAxis fontSize={12} stroke="#94A3B8" tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }}/>
                <Bar dataKey="avg" fill="#4F46E5" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Attendance over class</h2>
          <p className="text-xs text-ink-400">Year-to-date %</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <LineChart data={PERF}>
                <CartesianGrid strokeDasharray="3 6" stroke="#E2E8F0" vertical={false}/>
                <XAxis dataKey="class" fontSize={12} stroke="#94A3B8" tickLine={false} axisLine={false}/>
                <YAxis domain={[80, 100]} fontSize={12} stroke="#94A3B8" tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }}/>
                <Line type="monotone" dataKey="attendance" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Admissions funnel — this academic year</h2>
        <div className="mt-5 space-y-3">
          {FUNNEL.map((f, i) => (
            <div key={f.stage} className="flex items-center gap-4">
              <span className="w-24 text-sm text-ink-500">{f.stage}</span>
              <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(f.value/FUNNEL[0].value)*100}%`, background: `linear-gradient(90deg, #4F46E5, #8B5CF6)` }}/>
              </div>
              <span className="w-16 text-right font-display font-bold">{f.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
