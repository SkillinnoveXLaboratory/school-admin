import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Icon } from '@/components/Icon';
import { Analytics } from '@/lib/api/services';
import { useAuthStore } from '@/lib/stores/auth';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#0EA5E9', '#EF4444', '#8B5CF6'];

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['school-dashboard'],
    queryFn: () => Analytics.schoolDashboard(),
  });

  const kpis = data?.kpis ?? FALLBACK.kpis;
  const trend = data?.trend ?? FALLBACK.trend;
  const attendance = data?.attendance ?? FALLBACK.attendance;
  const collections = data?.collections ?? FALLBACK.collections;

  return (
    <div className="space-y-8">
      <header>
        <p className="label">School overview</p>
        <h1 className="font-display text-[32px] font-bold tracking-tight mt-1">
          {greeting()}, {user?.firstName ?? 'there'}.
        </h1>
        <p className="text-ink-500 mt-1.5">Here's how your school is doing today.</p>
      </header>

      {error && (
        <div className="card border-warning bg-warning-bg/30 p-4 text-warning text-sm">
          Couldn't reach the API. Showing sample values. <span className="opacity-70">({String(error)})</span>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled students', value: kpis.students, sub: `${kpis.newAdmissions} new this month`, icon: 'students', tone: 'brand'   },
          { label: 'Today\'s attendance', value: `${kpis.attendancePct}%`, sub: `${kpis.absent} absent`, icon: 'attendance', tone: 'success' },
          { label: 'Outstanding fees', value: `₹${(kpis.outstanding/1000).toFixed(1)}K`, sub: `${kpis.invoicesDue} invoices due`, icon: 'finance', tone: 'warning' },
          { label: 'Staff on duty', value: kpis.staffOnDuty, sub: `${kpis.staffTotal} total`, icon: 'teacher', tone: 'info' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: [0.2, 0, 0, 1] }}>
            <div className="flex items-start justify-between">
              <p className="label">{s.label}</p>
              <div className={`h-9 w-9 rounded-xl grid place-items-center ${toneBg(s.tone)}`}>
                <Icon name={s.icon as any} size={18} className={toneText(s.tone)} />
              </div>
            </div>
            <div className="mt-3 font-display text-[30px] font-bold tracking-tight">
              {isLoading ? <span className="inline-block w-16 h-7 bg-muted rounded-md animate-pulse" /> : s.value}
            </div>
            <p className="text-xs text-ink-400 mt-1">{s.sub}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card p-6 xl:col-span-2">
          <h2 className="font-display text-lg font-semibold">Fee collections</h2>
          <p className="text-xs text-ink-400">Last 8 weeks · cash + invoices</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="d-cash" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4}/><stop offset="100%" stopColor="#4F46E5" stopOpacity={0}/></linearGradient>
                  <linearGradient id="d-inv"  x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.32}/><stop offset="100%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#E2E8F0" vertical={false}/>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#94A3B8" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94A3B8" />
                <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="cash"    name="Cash"     stroke="#4F46E5" strokeWidth={2.5} fill="url(#d-cash)" />
                <Area type="monotone" dataKey="invoice" name="Invoices" stroke="#10B981" strokeWidth={2.5} fill="url(#d-inv)"  />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Attendance breakdown</h2>
          <p className="text-xs text-ink-400">Today</p>
          <div className="h-56 mt-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={attendance} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                  {attendance.map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today's collections</h2>
            <a href="/fees" className="text-sm text-brand-600 font-medium">Open ledger →</a>
          </div>
          <table className="w-full mt-4">
            <thead className="text-left text-ink-400">
              <tr className="text-[11px] uppercase tracking-wider">
                <th className="pb-2">Receipt</th><th>Student</th><th>Class</th><th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c:any) => (
                <tr key={c.id} className="border-t border-line/60 text-sm">
                  <td className="py-3 font-mono text-xs">{c.id}</td>
                  <td>{c.student}</td>
                  <td className="text-ink-500">{c.class}</td>
                  <td className="text-right font-semibold">₹{c.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <QA to="/students"     icon="upload"       label="Bulk import students" />
            <QA to="/attendance"   icon="attendance"   label="Mark today's attendance" />
            <QA to="/fees"         icon="finance"      label="Collect cash payment" />
            <QA to="/announcements"icon="announcement" label="Send circular" />
            <QA to="/exams"        icon="exam"         label="Publish report cards" />
            <QA to="/library"      icon="library"      label="Issue library book" />
          </div>
        </div>
      </section>
    </div>
  );
}

function QA({ icon, label, to }: { icon: any; label: string; to: string }) {
  return (
    <Link to={to} className="p-4 rounded-xl border border-line bg-surface text-left hover:border-brand-300 hover:bg-brand-50 transition-colors block">
      <div className="h-9 w-9 rounded-lg bg-brand-50 grid place-items-center text-brand-600 mb-3"><Icon name={icon}/></div>
      <div className="text-[13px] font-semibold">{label}</div>
    </Link>
  );
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function toneBg(t: any) { return ({brand:'bg-brand-50',info:'bg-info-bg',success:'bg-success-bg',warning:'bg-warning-bg'})[t]; }
function toneText(t: any) { return ({brand:'text-brand-600',info:'text-info',success:'text-success',warning:'text-warning'})[t]; }

const FALLBACK = {
  kpis: { students: 1142, newAdmissions: 38, attendancePct: 94, absent: 68, outstanding: 412_000, invoicesDue: 27, staffOnDuty: 82, staffTotal: 92 },
  trend: ['W-7','W-6','W-5','W-4','W-3','W-2','W-1','Now'].map((l,i)=>({ label: l, cash: 60+i*7+Math.round(Math.random()*15), invoice: 80+i*6+Math.round(Math.random()*12) })),
  attendance: [
    { name: 'Present', value: 1052 },
    { name: 'Absent',  value:   68 },
    { name: 'Leave',   value:   22 },
  ],
  collections: [
    { id: 'RC-3401', student: 'Aanya Sharma',     class: 'Gr 6 · A', amount: 12000 },
    { id: 'RC-3402', student: 'Rohit Kumar',      class: 'Gr 8 · B', amount:  9500 },
    { id: 'RC-3403', student: 'Pranavi Reddy',    class: 'Gr 5 · C', amount: 11000 },
    { id: 'RC-3404', student: 'Imran Ahmed',      class: 'Gr 9 · A', amount: 13500 },
    { id: 'RC-3405', student: 'Sasha Mathew',     class: 'Gr 4 · D', amount:  8000 },
  ],
};
