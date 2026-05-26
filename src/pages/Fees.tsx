import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Lottie } from '@/components/Lottie';
import { Modal } from '@/components/Modal';
import { Fees, Data } from '@/lib/api/services';

const SAMPLE = [
  { id: '1', number: 'INV-1024', studentName: 'Aanya Sharma',  dueDate: '2026-06-10', status: 'DUE',  amount: 12500 },
  { id: '2', number: 'INV-1025', studentName: 'Karan Patel',   dueDate: '2026-06-04', status: 'PAID', amount: 11000 },
  { id: '3', number: 'INV-1026', studentName: 'Riya Pillai',   dueDate: '2026-06-15', status: 'DUE',  amount: 13800 },
  { id: '4', number: 'INV-1027', studentName: 'Vihaan Singh',  dueDate: '2026-05-25', status: 'DUE',  amount: 14200 },
];

export function FeesPage() {
  const qc = useQueryClient();
  const [paid, setPaid] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ['invoices'], queryFn: () => Fees.invoices.list() as any });
  const { data: ledger } = useQuery<any>({ queryKey: ['daily-cash'], queryFn: () => Fees.dailyCashLedger() });
  const rows = invoices.length ? invoices : SAMPLE;

  const pay = useMutation({
    mutationFn: ({ studentId, amount }: { studentId: string; amount: number }) => Fees.payCash(studentId, { amount, mode: 'CASH' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setPaid(true); toast.success('Payment recorded'); setTimeout(() => setPaid(false), 4000); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 8" title="Fees & cash"
        subtitle="Collect cash payments, manage invoices, and track daily ledger."
        actions={<>
          <button onClick={() => setStructureOpen(true)} className="btn-outline">Fee structures</button>
          <button onClick={() => Data.exportFinance().then(() => toast.success('Export ready')).catch(()=>toast.error('Failed'))} className="btn-outline">
            <Icon name="download" size={16}/> Daily ledger
          </button>
          <button onClick={() => setDiscountOpen(true)} className="btn-primary"><Icon name="plus" size={16}/> Apply discount</button>
        </>} />

      <section className="grid sm:grid-cols-4 gap-3">
        {[
          { label: "Today's collection", value: '₹1.42L', tone: 'success' },
          { label: 'Outstanding',         value: '₹4.12L', tone: 'warning' },
          { label: 'Invoices due',        value: rows.filter((r:any) => r.status === 'DUE').length, tone: 'brand' },
          { label: 'Defaulters',          value: 9,        tone: 'danger' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs uppercase tracking-wider text-ink-400">{s.label}</p>
            <p className="font-display text-[26px] font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </section>

      {paid && (
        <motion.div className="card p-5 flex items-center gap-4 !border-success bg-success-bg"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Lottie src="/lottie/payment-success.json" className="w-16 h-16" loop={false} />
          <div>
            <div className="font-display font-semibold text-success">Cash payment recorded</div>
            <div className="text-xs text-success/80">Receipt RC-{Math.floor(Math.random()*9000+1000)} generated · SMS sent to parent</div>
          </div>
        </motion.div>
      )}

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Recent invoices</h2>
          <table className="w-full mt-4">
            <thead className="text-left text-ink-400 text-[11px] uppercase tracking-wider">
              <tr><th className="pb-3">Invoice</th><th>Student</th><th>Due</th><th>Status</th><th className="text-right">Amount</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((inv:any) => (
                <tr key={inv.id} className="border-t border-line/60 text-sm hover:bg-muted/30">
                  <td className="py-3 font-mono text-xs">{inv.number}</td>
                  <td>{inv.studentName}</td>
                  <td className="text-ink-500 text-xs">{inv.dueDate}</td>
                  <td>{inv.status === 'PAID' ? <span className="chip-success">●&nbsp;Paid</span> : <span className="chip-warning">●&nbsp;Due</span>}</td>
                  <td className="text-right font-semibold">₹{inv.amount.toLocaleString()}</td>
                  <td className="text-right pl-2"><button onClick={() => setActive(inv)} className="btn-ghost py-1 px-2 text-xs">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Collect cash</h2>
          <p className="text-xs text-ink-400">Quick capture — no card terminal needed.</p>
          <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              pay.mutate({ studentId: String(fd.get('studentId')), amount: Number(fd.get('amount')) });
              (e.target as HTMLFormElement).reset();
            }} className="mt-4 space-y-3">
            <div><label className="label">Student ID</label><input name="studentId" required className="input mt-2 font-mono text-xs" placeholder="STU-2026-0123"/></div>
            <div><label className="label">Amount (₹)</label><input name="amount" type="number" required min={1} className="input mt-2" placeholder="12500"/></div>
            <button type="submit" disabled={pay.isPending} className="btn-primary w-full"><Icon name="finance" size={16}/> {pay.isPending ? 'Recording…' : 'Record payment'}</button>
          </form>
          {ledger && (
            <div className="mt-5 p-4 rounded-xl bg-brand-50 text-brand-700">
              <p className="text-xs uppercase tracking-wider">Today's cash ledger</p>
              <p className="font-display text-xl font-bold mt-1">₹{(ledger.balance ?? 142000).toLocaleString()}</p>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {active && <InvoiceDetailModal invoice={active} onClose={() => setActive(null)}/>}
        {discountOpen && <DiscountModal onClose={() => setDiscountOpen(false)}/>}
        {structureOpen && <FeeStructuresModal onClose={() => setStructureOpen(false)}/>}
      </AnimatePresence>
    </div>
  );
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const pay = useMutation({
    mutationFn: () => Fees.payCash(invoice.studentId ?? 'unknown', { amount: invoice.amount, invoiceId: invoice.id, mode: 'CASH' }),
    onSuccess: () => { toast.success('Marked paid'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title={`Invoice ${invoice.number}`} onClose={onClose}
      footer={<>
        <button onClick={() => window.print()} className="btn-ghost"><Icon name="download" size={14}/> Print</button>
        <button onClick={onClose} className="btn-ghost">Close</button>
        {invoice.status !== 'PAID' && <button onClick={() => pay.mutate()} disabled={pay.isPending} className="btn-primary"><Icon name="finance" size={14}/> {pay.isPending ? 'Marking…' : 'Mark paid (cash)'}</button>}
      </>}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold">{invoice.studentName}</h3>
          <p className="text-sm text-ink-500 font-mono">{invoice.number}</p>
        </div>
        {invoice.status === 'PAID' ? <span className="chip-success">●&nbsp;Paid</span> : <span className="chip-warning">●&nbsp;Due</span>}
      </div>
      <hr className="border-line my-5"/>
      <table className="w-full text-sm">
        <thead><tr className="text-ink-400 text-[11px] uppercase tracking-wider"><th className="text-left pb-2">Item</th><th className="text-right pb-2">Amount</th></tr></thead>
        <tbody className="divide-y divide-line">
          <tr><td className="py-2">Tuition fee</td><td className="text-right">₹{(invoice.amount * 0.7).toLocaleString()}</td></tr>
          <tr><td className="py-2">Activity charge</td><td className="text-right">₹{(invoice.amount * 0.15).toLocaleString()}</td></tr>
          <tr><td className="py-2">Books & materials</td><td className="text-right">₹{(invoice.amount * 0.1).toLocaleString()}</td></tr>
          <tr><td className="py-2">Transport</td><td className="text-right">₹{(invoice.amount * 0.05).toLocaleString()}</td></tr>
          <tr className="border-t-2 border-ink-900"><td className="py-3 font-semibold">Total</td><td className="text-right font-bold font-display text-lg">₹{invoice.amount.toLocaleString()}</td></tr>
        </tbody>
      </table>
      <p className="text-xs text-ink-400 mt-4">Due {invoice.dueDate}</p>
    </Modal>
  );
}

function DiscountModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ studentId: '', amount: 0, reason: 'SCHOLARSHIP' });
  const apply = useMutation({
    mutationFn: () => Fees.applyDiscount(f.studentId, { amount: f.amount, reason: f.reason }),
    onSuccess: () => { toast.success('Discount applied'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Apply scholarship / discount" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => apply.mutate()} disabled={apply.isPending || !f.studentId} className="btn-primary">{apply.isPending ? 'Applying…' : 'Apply'}</button>
      </>}>
      <div className="space-y-3">
        <div><label className="label">Student ID</label><input className="input mt-2 font-mono text-xs" value={f.studentId} onChange={(e) => setF({ ...f, studentId: e.target.value })}/></div>
        <div><label className="label">Amount (₹)</label><input type="number" className="input mt-2" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })}/></div>
        <div><label className="label">Reason</label>
          <select className="input mt-2" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
            <option>SCHOLARSHIP</option><option>SIBLING_DISCOUNT</option><option>STAFF_DISCOUNT</option><option>HARDSHIP</option><option>OTHER</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

function FeeStructuresModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery<any[]>({ queryKey: ['fee-structures'], queryFn: () => Fees.structures.list() as any });
  const [f, setF] = useState({ name: '', classId: '', tuition: 0, transport: 0, activity: 0 });
  const create = useMutation({
    mutationFn: () => Fees.structures.create(f),
    onSuccess: () => { toast.success('Structure saved'); qc.invalidateQueries({ queryKey: ['fee-structures'] }); setF({ name: '', classId: '', tuition: 0, transport: 0, activity: 0 }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  const generate = useMutation({
    mutationFn: () => Fees.generateYearly({ year: new Date().getFullYear() }),
    onSuccess: () => { toast.success('Yearly invoices queued'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Fee structures" onClose={onClose} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Close</button>
        <button onClick={() => generate.mutate()} disabled={generate.isPending} className="btn-primary">{generate.isPending ? 'Queuing…' : 'Generate yearly invoices'}</button>
      </>}>
      <h4 className="label">Existing baselines</h4>
      <table className="w-full mt-3 text-sm">
        <thead><tr className="text-ink-400 text-[11px] uppercase"><th className="text-left pb-2">Name</th><th>Class</th><th>Tuition</th><th>Transport</th><th>Activity</th></tr></thead>
        <tbody className="divide-y divide-line">
          {(data.length ? data : [{ name: 'Standard Gr 1-5', classId: 'g1-5', tuition: 9000, transport: 2400, activity: 1500 }, { name: 'Standard Gr 6-10', classId: 'g6-10', tuition: 12000, transport: 2400, activity: 1500 }]).map((s: any, i: number) => (
            <tr key={i}><td className="py-2">{s.name}</td><td className="font-mono text-xs">{s.classId}</td><td>₹{s.tuition?.toLocaleString()}</td><td>₹{s.transport?.toLocaleString()}</td><td>₹{s.activity?.toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>
      <hr className="border-line my-5"/>
      <h4 className="label">Add new baseline</h4>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div><label className="label">Name</label><input className="input mt-2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}/></div>
        <div><label className="label">Class ID</label><input className="input mt-2 font-mono text-xs" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}/></div>
        <div><label className="label">Tuition (₹/yr)</label><input type="number" className="input mt-2" value={f.tuition} onChange={(e) => setF({ ...f, tuition: Number(e.target.value) })}/></div>
        <div><label className="label">Transport (₹/yr)</label><input type="number" className="input mt-2" value={f.transport} onChange={(e) => setF({ ...f, transport: Number(e.target.value) })}/></div>
        <div><label className="label">Activity (₹/yr)</label><input type="number" className="input mt-2" value={f.activity} onChange={(e) => setF({ ...f, activity: Number(e.target.value) })}/></div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={() => create.mutate()} disabled={create.isPending || !f.name} className="btn-outline">{create.isPending ? 'Saving…' : 'Add baseline'}</button>
      </div>
    </Modal>
  );
}
