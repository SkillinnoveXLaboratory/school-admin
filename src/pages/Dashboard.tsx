import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '@/components/Icon';
import { Analytics, Communication, Fees } from '@/lib/api/services';
import { useAuthStore } from '@/lib/stores/auth';
import { formatDate, isRecord, money, rowsFrom, textOf } from '@/lib/viewUtils';

type Tone = 'brand' | 'info' | 'success' | 'warning';

export function DashboardPage() {
  const { user } = useAuthStore();
  const dashboardQuery = useQuery({ queryKey: ['school-dashboard'], queryFn: () => Analytics.schoolDashboard() });
  const cashQuery = useQuery({ queryKey: ['daily-cash'], queryFn: () => Fees.dailyCashLedger({ date: new Date().toISOString().slice(0, 10) }) });
  const invoicesQuery = useQuery({ queryKey: ['invoices', 'dashboard'], queryFn: () => Fees.invoices.list({ page: 1, limit: 8 }) });
  const announcementsQuery = useQuery({ queryKey: ['announcements', 'dashboard'], queryFn: () => Communication.announcements.list({ page: 1, limit: 4 }) });
  const meetingsQuery = useQuery({ queryKey: ['meetings', 'dashboard'], queryFn: () => Communication.meetings.list({ status: 'SCHEDULED' }) });

  const stats = isRecord(dashboardQuery.data?.statistics) ? dashboardQuery.data.statistics : {};
  const cashSummary = isRecord(cashQuery.data?.summary) ? cashQuery.data.summary : {};
  const invoices = rowsFrom<any>(invoicesQuery.data, ['invoices', 'data']);
  const cashRows = rowsFrom<any>(cashQuery.data, ['invoices', 'data']);
  const announcements = rowsFrom<any>(announcementsQuery.data, ['announcements', 'data']);
  const meetings = rowsFrom<any>(meetingsQuery.data, ['meetings', 'data']);

  const chartRows = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const invoice of invoices) {
      const date = textOf(invoice, ['createdAt'], '');
      const key = date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unknown';
      byDay.set(key, (byDay.get(key) ?? 0) + Number(invoice.amountPaid ?? 0));
    }
    if (!byDay.size && cashRows.length) {
      for (const row of cashRows) {
        const date = textOf(row, ['createdAt'], '');
        const key = date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today';
        byDay.set(key, (byDay.get(key) ?? 0) + Number(row.amountPaid ?? 0));
      }
    }
    return [...byDay.entries()].map(([label, cash]) => ({ label, cash }));
  }, [cashRows, invoices]);

  const cards: Array<{ label: string; value: string | number; sub: string; icon: string; tone: Tone }> = [
    { label: 'Students', value: textOf(stats, ['totalStudents'], '0'), sub: 'total enrollment', icon: 'students', tone: 'brand' },
    { label: 'Teachers', value: textOf(stats, ['totalTeachers'], '0'), sub: 'live staff count', icon: 'teacher', tone: 'success' },
    { label: 'Classes', value: textOf(stats, ['totalClasses'], '0'), sub: 'academic levels', icon: 'school', tone: 'info' },
    { label: 'Cash today', value: money(cashSummary.totalCollected ?? 0), sub: `${cashSummary.transactionCount ?? 0} transactions`, icon: 'finance', tone: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-line bg-gradient-to-br from-surface via-white to-brand-50/40 p-5 sm:p-6">
        <p className="label">School overview</p>
        <h1 className="font-display text-[28px] sm:text-[32px] font-bold tracking-tight mt-1">
          {greeting()}, {user?.firstName ?? 'Admin'}.
        </h1>
        <p className="text-ink-500 mt-1.5 text-sm">Live operational snapshot from the Schoolmate API.</p>
      </header>

      {dashboardQuery.error && (
        <div className="card border-warning bg-warning-bg/30 p-4 text-warning text-sm">
          Could not load dashboard statistics. {String(dashboardQuery.error)}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            className="stat-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="label">{card.label}</p>
              <div className={`h-9 w-9 rounded-xl grid place-items-center ${toneBg(card.tone)}`}>
                <Icon name={card.icon as any} size={18} className={toneText(card.tone)} />
              </div>
            </div>
            <div className="mt-3 font-display text-[28px] font-bold tracking-tight">
              {dashboardQuery.isLoading ? <span className="inline-block h-8 w-16 rounded bg-muted animate-pulse" /> : card.value}
            </div>
            <p className="text-xs text-ink-400 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Cash collection</h2>
              <p className="text-xs text-ink-400">Built from `/fees/invoices` and daily cash ledger.</p>
            </div>
            <Link to="/fees" className="btn-outline w-full justify-center px-3 py-2 text-xs sm:w-auto">Open fees</Link>
          </div>
          <div className="h-64 mt-4">
            {chartRows.length ? (
              <ResponsiveContainer>
                <AreaChart data={chartRows}>
                  <defs>
                    <linearGradient id="cashFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
                  <Tooltip formatter={(value) => money(value)} contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="cash" name="Cash" stroke="#0EA5E9" strokeWidth={2.5} fill="url(#cashFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-400">
                No invoice cash data returned yet.
              </div>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold">Platform modules</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <MiniMetric label="Routes" value={textOf(stats, ['totalTransportRoutes'], '0')} />
            <MiniMetric label="Library books" value={textOf(stats, ['totalLibraryBooks'], '0')} />
            <MiniMetric label="Invoices" value={textOf(invoicesQuery.data?.meta, ['total'], String(invoices.length))} />
            <MiniMetric label="Meetings" value={meetings.length} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <LivePanel title="Recent invoices" action={<Link to="/fees" className="text-xs font-semibold text-brand-600">View all</Link>}>
          {invoices.map((invoice) => (
            <div key={textOf(invoice, ['_id', 'id', 'invoiceNumber'])} className="flex items-center justify-between gap-3 border-t border-line/60 py-3 first:border-t-0">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{textOf(invoice, ['invoiceNumber'])}</p>
                <p className="text-xs text-ink-400 truncate">{textOf(invoice, ['studentName'], textOf(invoice, ['studentId']))}</p>
              </div>
              <p className="font-semibold text-sm">{money(invoice.amountPaid)}</p>
            </div>
          ))}
          {!invoices.length && <EmptyLine text="No invoices returned." />}
        </LivePanel>

        <LivePanel title="Announcements and meetings" action={<Link to="/announcements" className="text-xs font-semibold text-brand-600">Open</Link>}>
          {announcements.slice(0, 2).map((item) => (
            <div key={textOf(item, ['_id', 'id', 'title'])} className="border-t border-line/60 py-3 first:border-t-0">
              <p className="font-semibold text-sm truncate">{textOf(item, ['title'])}</p>
              <p className="text-xs text-ink-400 mt-0.5 truncate">{formatDate(textOf(item, ['createdAt'], ''))}</p>
            </div>
          ))}
          {meetings.slice(0, 2).map((meeting) => (
            <div key={textOf(meeting, ['_id', 'id', 'agenda'])} className="border-t border-line/60 py-3 first:border-t-0">
              <p className="font-semibold text-sm truncate">{textOf(meeting, ['agenda'])}</p>
              <p className="text-xs text-ink-400 mt-0.5">{formatDate(textOf(meeting, ['meetingDate'], ''))}</p>
            </div>
          ))}
          {!announcements.length && !meetings.length && <EmptyLine text="No communication rows returned." />}
        </LivePanel>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QA to="/students" icon="students" label="Students" />
        <QA to="/attendance" icon="attendance" label="Attendance" />
        <QA to="/fees" icon="finance" label="Fees" />
        <QA to="/sports" icon="sports" label="Sports" />
        <QA to="/announcements" icon="announcement" label="Circulars" />
        <QA to="/analytics" icon="dashboard" label="Analytics" />
      </section>
    </div>
  );
}

function LivePanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="label">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">{text}</p>;
}

function QA({ icon, label, to }: { icon: any; label: string; to: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50">
      <div className="h-9 w-9 rounded-lg bg-brand-50 grid place-items-center text-brand-600 mb-3">
        <Icon name={icon} />
      </div>
      <div className="text-[13px] font-semibold">{label}</div>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function toneBg(t: Tone) {
  const tones: Record<Tone, string> = {
    brand: 'bg-brand-50',
    info: 'bg-info-bg',
    success: 'bg-success-bg',
    warning: 'bg-warning-bg',
  };
  return tones[t];
}

function toneText(t: Tone) {
  const tones: Record<Tone, string> = {
    brand: 'text-brand-600',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
  };
  return tones[t];
}
