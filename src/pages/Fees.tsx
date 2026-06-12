import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Academic, Fees } from '@/lib/api/services';
import { formatDate, idOf, isRecord, money, rowsFrom, textOf } from '@/lib/viewUtils';

export function FeesPage() {
  const qc = useQueryClient();
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [structureOpen, setStructureOpen] = useState(false);

  const invoicesQuery = useQuery({ queryKey: ['invoices'], queryFn: () => Fees.invoices.list({ page: 1, limit: 50 }) });
  const ledgerQuery = useQuery({ queryKey: ['daily-cash'], queryFn: () => Fees.dailyCashLedger({ date: new Date().toISOString().slice(0, 10) }) });
  const structuresQuery = useQuery({ queryKey: ['fee-structures'], queryFn: () => Fees.structures.list() });
  const purposesQuery = useQuery({ queryKey: ['fee-purposes'], queryFn: () => Fees.purposes.list() });

  const invoices = rowsFrom<any>(invoicesQuery.data, ['invoices', 'data']);
  const ledgerInvoices = rowsFrom<any>(ledgerQuery.data, ['invoices', 'data']);
  const structures = rowsFrom<any>(structuresQuery.data, ['structures', 'data']);
  const purposes = rowsFrom<any>(purposesQuery.data, ['purposes', 'data']);
  const summary = isRecord(ledgerQuery.data?.summary) ? ledgerQuery.data.summary : {};

  const totalInvoiced = useMemo(() => invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid ?? 0), 0), [invoices]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 8"
        title="Fees & cash"
        subtitle="Live baseline structures, cash collections, invoices, and daily ledger."
        actions={(
          <>
            <button onClick={() => setStructureOpen(true)} className="btn-outline w-full justify-center sm:w-auto">
              <Icon name="settings" size={16} /> Structures
            </button>
          </>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today's collection" value={money(summary.totalCollected ?? 0)} sub={`${summary.transactionCount ?? 0} transactions`} />
        <Stat label="Invoices" value={textOf(invoicesQuery.data?.meta, ['total'], String(invoices.length))} sub="returned by API" />
        <Stat label="Invoice cash" value={money(totalInvoiced)} sub="current page total" />
        <Stat label="Fee structures" value={structures.length} sub="baseline rows" />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line p-4 sm:p-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Fee purposes</h2>
            <p className="text-sm text-ink-500">Loaded from `/fees/purposes`.</p>
          </div>
          <span className="chip-brand w-fit">{purposes.length} purposes</span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {purposes.map((purpose) => (
              <article key={idOf(purpose)} className="rounded-2xl border border-line bg-gradient-to-br from-white to-muted/30 p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{textOf(purpose, ['name'], 'Fee purpose')}</p>
                    <p className="mt-1 text-xs text-ink-400 break-all">{idOf(purpose)}</p>
                  </div>
                  <span className={purpose.isRefundable ? 'chip-success' : 'chip-warning'}>
                    {purpose.isRefundable ? 'Refundable' : 'Non-refundable'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-600">
                  {textOf(purpose, ['description'], 'No description provided.')}
                </p>
              </article>
            ))}
            {purposesQuery.isLoading && Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
            {!purposesQuery.isLoading && !purposes.length && (
              <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-400">No fee purposes returned.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-line p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">Recent invoices</h2>
            <p className="text-sm text-ink-500">Loaded from `/fees/invoices`.</p>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-muted/60">
                <tr>
                  <th className="table-header">Invoice</th>
                  <th className="table-header">Student</th>
                  <th className="table-header">Academic year</th>
                  <th className="table-header">Date</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={idOf(invoice)} className="hover:bg-muted/40">
                    <td className="table-cell font-mono text-xs">{textOf(invoice, ['invoiceNumber'])}</td>
                    <td className="table-cell">{textOf(invoice, ['studentName'], textOf(invoice, ['studentId']))}</td>
                    <td className="table-cell">{textOf(invoice, ['academicYear'])}</td>
                    <td className="table-cell">{formatDate(textOf(invoice, ['createdAt'], ''))}</td>
                    <td className="table-cell text-right font-semibold">{money(invoice.amountPaid)}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => setActiveInvoice(invoice)} className="btn-ghost px-3 py-1.5 text-xs">View</button>
                    </td>
                  </tr>
                ))}
                {!invoices.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">No invoices returned.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-line/60">
            {invoices.map((invoice) => (
              <button key={idOf(invoice)} onClick={() => setActiveInvoice(invoice)} className="w-full p-4 text-left hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{textOf(invoice, ['invoiceNumber'])}</p>
                    <p className="text-xs text-ink-400 mt-1 truncate">{textOf(invoice, ['studentName'], textOf(invoice, ['studentId']))}</p>
                  </div>
                  <p className="font-semibold">{money(invoice.amountPaid)}</p>
                </div>
                <p className="mt-2 text-xs text-ink-400">{formatDate(textOf(invoice, ['createdAt'], ''))} · {textOf(invoice, ['academicYear'])}</p>
              </button>
            ))}
            {!invoices.length && <p className="p-6 text-center text-sm text-ink-400">No invoices returned.</p>}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">Daily ledger</h2>
            <p className="text-sm text-ink-500">Report date: {textOf(ledgerQuery.data, ['reportDate'], new Date().toISOString().slice(0, 10))}</p>
            <div className="mt-4 space-y-2">
              {ledgerInvoices.slice(0, 4).map((invoice) => (
                <div key={idOf(invoice)} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{textOf(invoice, ['invoiceNumber'])}</p>
                    <p className="text-xs text-ink-400 truncate">{textOf(invoice, ['studentName'], textOf(invoice, ['studentId']))}</p>
                  </div>
                  <p className="font-semibold text-sm">{money(invoice.amountPaid)}</p>
                </div>
              ))}
              {!ledgerInvoices.length && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">No daily cash rows returned.</p>}
            </div>
          </div>
        </aside>
      </section>

      <AnimatePresence>
        {activeInvoice && <InvoiceDetailModal invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />}
        {structureOpen && <FeeStructuresModal structures={structures} onClose={() => setStructureOpen(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['fee-structures'] }); }} />}
      </AnimatePresence>
    </div>
  );
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ['invoice-detail', idOf(invoice)],
    queryFn: () => Fees.invoices.get(idOf(invoice)),
    enabled: Boolean(idOf(invoice)),
    retry: false,
  });
  const downloadPdf = useMutation({
    mutationFn: () => Fees.invoices.pdf(idOf(invoice)),
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${textOf(invoice, ['invoiceNumber'], 'invoice')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to download invoice PDF'),
  });
  const detail = isRecord(detailQuery.data?.data) ? detailQuery.data.data : invoice;
  return (
    <Modal
      title={textOf(invoice, ['invoiceNumber'], 'Invoice')}
      onClose={onClose}
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button
            onClick={() => downloadPdf.mutate()}
            disabled={downloadPdf.isPending}
            className="btn-outline"
          >
            {downloadPdf.isPending ? 'Downloading...' : 'Generate PDF'}
          </button>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      )}
    >
      {detailQuery.error && (
        <p className="mb-4 rounded-xl border border-warning-bg bg-warning-bg/60 p-3 text-sm text-warning">
          Invoice detail endpoint is restricted for this token, showing list data.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Student" value={textOf(detail, ['studentName'], textOf(detail, ['studentId']))} />
        <Info label="Amount paid" value={money(detail.amountPaid)} />
        <Info label="Payment method" value={textOf(detail, ['paymentMethod'], 'CASH')} />
        <Info label="Payment date" value={formatDate(textOf(detail, ['paymentDate', 'createdAt'], ''))} />
        <Info label="Remaining balance" value={money(detail.remainingBalanceAfter ?? 0)} />
        <Info label="Academic year" value={textOf(detail, ['academicYear'])} />
      </div>
    </Modal>
  );
}

function FeeStructuresModal({ structures, onClose, onSaved }: { structures: any[]; onClose: () => void; onSaved: () => void }) {
  const [baselineForm, setBaselineForm] = useState({
    classId: '',
    academicYear: defaultAcademicYear(),
    amount: '1',
  });
  const [ledgerYear, setLedgerYear] = useState(defaultAcademicYear());
  const classesQuery = useQuery({ queryKey: ['classes', 'fees'], queryFn: () => Academic.classes.list() });
  const create = useMutation({
    mutationFn: () => Fees.structures.create({
      classId: baselineForm.classId,
      amount: Number(baselineForm.amount),
      academicYear: baselineForm.academicYear,
    }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Fee structure saved');
      setBaselineForm({ classId: '', academicYear: defaultAcademicYear(), amount: '' });
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to save fee structure'),
  });
  const generate = useMutation({
    mutationFn: () => Fees.generateYearly({ academicYear: ledgerYear }),
    onSuccess: (body: any) => toast.success(body?.message || 'Yearly fee generation queued'),
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to generate yearly ledger'),
  });
  const classes = classesQuery.data?.classes ?? [];

  return (
    <Modal
      title="Fee structures"
      onClose={onClose}
      size="full"
      footer={(
        <>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </>
      )}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-canvas p-5 sm:p-6 shadow-soft">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">Fee workspace</p>
              <h3 className="mt-2 font-display text-2xl sm:text-3xl font-semibold leading-tight">Baseline setup and yearly ledger generation</h3>
              <p className="mt-2 max-w-3xl text-sm text-ink-500">
                Save a class baseline once, then generate yearly ledger entries from that baseline using the academic year.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full lg:w-[420px]">
              <MiniStat label="Baselines" value={structures.length} />
              <MiniStat label="Classes" value={classes.length} />
              <MiniStat label="Ledger year" value={ledgerYear} mono />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-lg sm:text-xl font-semibold">Create baseline</h3>
              <p className="mt-1 text-sm text-ink-500">Use this to define the amount for one class and year.</p>
            </div>
            <button onClick={() => create.mutate()} disabled={create.isPending || !baselineForm.classId || !baselineForm.academicYear} className="btn-outline">
              {create.isPending ? 'Saving...' : 'Save baseline'}
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]">
            <Select label="Class" value={baselineForm.classId} onChange={(classId) => setBaselineForm({ ...baselineForm, classId })}>
              <option value="">Select class</option>
              {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </Select>
            <Input label="Academic year" value={baselineForm.academicYear} onChange={(academicYear) => setBaselineForm({ ...baselineForm, academicYear })} />
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-lg sm:text-xl font-semibold">Existing baselines</h3>
              <p className="mt-1 text-sm text-ink-500">All saved baseline fee structures returned by the API.</p>
            </div>
            <span className="chip-brand w-fit">{structures.length} records</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {structures.map((structure) => (
              <div key={idOf(structure)} className="rounded-2xl border border-line bg-gradient-to-br from-white to-muted/30 p-4 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold break-words">{textOf(structure, ['className'], textOf(structure.classId, ['name'], 'Class not linked'))}</p>
                    <p className="mt-1 text-xs font-mono text-ink-400 break-all">{idOf(structure.classId) || textOf(structure, ['classId'])}</p>
                  </div>
                  <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                    {money(structure.amount ?? structure.baseFeeAmount ?? 0)}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                  <span className="chip-brand">{textOf(structure, ['academicYear'], '—')}</span>
                </div>
              </div>
            ))}
            {!structures.length && <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-400">No fee structures returned.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-lg sm:text-xl font-semibold">Generate yearly ledger</h3>
              <p className="mt-1 text-sm text-ink-500">Creates yearly fee ledger rows from the saved baseline structure.</p>
            </div>
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || !ledgerYear}
              className="btn-primary"
            >
              {generate.isPending ? 'Queuing...' : 'Generate yearly ledger'}
            </button>
          </div>
          <div className="mt-4 max-w-md">
            <Input label="Academic year" value={ledgerYear} onChange={setLedgerYear} />
          </div>
        </section>
      </div>
    </Modal>
  );
}

function defaultAcademicYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-ink-400">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white/80 p-3 shadow-soft min-w-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-ink-400 font-bold">{label}</p>
      <p className={clsx('mt-2 truncate font-display text-lg font-semibold text-ink-900', mono && 'font-mono text-sm')}>{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="label">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900 break-words">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </div>
  );
}
