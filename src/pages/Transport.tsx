import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Transport } from '@/lib/api/services';

const SAMPLE = [
  { id: 'r1', code: 'R-A1', name: 'North Loop',  driver: 'Ramesh K',  students: 32, stops: ['HSR Layout','Koramangala 5th','Adugodi','Wilson Garden','Lalbagh East','School Gate'] },
  { id: 'r2', code: 'R-B2', name: 'South Express',driver: 'Suresh M', students: 28, stops: ['Banashankari','Jayanagar 4th','J.P. Nagar','Vijay Nagar','School Gate'] },
  { id: 'r3', code: 'R-C3', name: 'East Shuttle', driver: 'Anil P',   students: 24, stops: ['Whitefield','Brookefield','Marathahalli','Bellandur','School Gate'] },
];

export function TransportPage() {
  const qc = useQueryClient();
  const [addingRoute, setAddingRoute] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [active, setActive] = useState<any>(null);
  const { data: routes = [] } = useQuery<any[]>({ queryKey: ['routes'], queryFn: () => Transport.routes.list() as any });
  const rows = routes.length ? routes : SAMPLE;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 10" title="Transport"
        subtitle="Routes, vehicles, drivers, and student allocations."
        actions={<>
          <button onClick={() => setAddingVehicle(true)} className="btn-outline"><Icon name="plus" size={16}/> Add vehicle</button>
          <button onClick={() => setAddingRoute(true)}   className="btn-primary"><Icon name="plus" size={16}/> Add route</button>
        </>} />

      <section className="grid lg:grid-cols-2 gap-5">
        {rows.map((r:any) => (
          <article key={r.id} onClick={() => setActive(r)} className="card p-5 cursor-pointer hover:shadow-pop hover:border-brand-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">{r.code}</p>
                <h3 className="font-display text-lg font-semibold mt-1">{r.name}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-info-bg grid place-items-center text-info"><Icon name="transport" /></div>
            </div>
            <ol className="mt-4 space-y-2 text-sm">
              {r.stops.slice(0, 4).map((s:string, i:number) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-brand-50 text-brand-700 grid place-items-center text-[11px] font-bold">{i+1}</span>
                  <span className="text-ink-700">{s}</span>
                </li>
              ))}
              {r.stops.length > 4 && <li className="text-xs text-ink-400 pl-9">+ {r.stops.length - 4} more</li>}
            </ol>
            <div className="flex items-center justify-between text-xs text-ink-400 mt-5">
              <span>Driver: {r.driver}</span>
              <span>{r.students} students</span>
            </div>
          </article>
        ))}
      </section>

      <AnimatePresence>
        {addingRoute && <RouteFormModal onClose={() => setAddingRoute(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['routes'] }); setAddingRoute(false); }}/>}
        {addingVehicle && <VehicleFormModal onClose={() => setAddingVehicle(false)}/>}
        {active && <RouteDetailModal route={active} onClose={() => setActive(null)}/>}
      </AnimatePresence>
    </div>
  );
}

function RouteFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ code: '', name: '', stops: '' });
  const save = useMutation({
    mutationFn: () => Transport.routes.create({ code: f.code, name: f.name, stops: f.stops.split('\n').filter(Boolean) }),
    onSuccess: () => { toast.success('Route created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Add transport route" onClose={onClose} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.name} className="btn-primary">{save.isPending ? 'Creating…' : 'Create'}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Code</label><input className="input mt-2 font-mono" placeholder="R-A1" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })}/></div>
        <div><label className="label">Name</label><input className="input mt-2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}/></div>
      </div>
      <div className="mt-3"><label className="label">Stops (one per line)</label>
        <textarea className="input mt-2 min-h-[160px]" placeholder="Stop 1&#10;Stop 2&#10;School Gate" value={f.stops} onChange={(e) => setF({ ...f, stops: e.target.value })}/>
      </div>
    </Modal>
  );
}

function VehicleFormModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ plate: '', capacity: 40, type: 'BUS' });
  const save = useMutation({
    mutationFn: () => Transport.vehicles.create(f),
    onSuccess: () => { toast.success('Vehicle registered'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Register vehicle" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.plate} className="btn-primary">{save.isPending ? 'Registering…' : 'Register'}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Plate number</label><input className="input mt-2 font-mono" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })}/></div>
        <div><label className="label">Capacity</label><input type="number" className="input mt-2" value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}/></div>
        <div><label className="label">Type</label>
          <select className="input mt-2" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option>BUS</option><option>VAN</option><option>SUV</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

function RouteDetailModal({ route, onClose }: { route: any; onClose: () => void }) {
  const [studentId, setStudentId] = useState('');
  const allocate = useMutation({
    mutationFn: () => Transport.allocate({ routeId: route.id, studentId }),
    onSuccess: () => { toast.success('Allocated'); setStudentId(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title={route.name} onClose={onClose} size="lg"
      footer={<button onClick={onClose} className="btn-ghost">Close</button>}>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-info-bg grid place-items-center text-info"><Icon name="transport" /></div>
        <div><h3 className="font-display text-lg font-semibold">{route.name}</h3><p className="text-sm text-ink-500">{route.code} · Driver {route.driver}</p></div>
      </div>
      <hr className="border-line my-5"/>
      <h4 className="label">Stops</h4>
      <ol className="mt-3 space-y-2">
        {route.stops.map((s: string, i: number) => (
          <li key={s} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
            <span className="h-7 w-7 rounded-full bg-brand-50 text-brand-700 grid place-items-center text-xs font-bold">{i+1}</span>
            <span className="text-sm">{s}</span>
          </li>
        ))}
      </ol>
      <hr className="border-line my-5"/>
      <h4 className="label">Allocate student to this route</h4>
      <div className="mt-3 flex gap-2">
        <input className="input" placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)}/>
        <button onClick={() => allocate.mutate()} disabled={!studentId || allocate.isPending} className="btn-primary">{allocate.isPending ? 'Allocating…' : 'Allocate'}</button>
      </div>
    </Modal>
  );
}
