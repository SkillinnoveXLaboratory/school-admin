import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Students, Transport } from '@/lib/api/services';
import type { Student } from '@/lib/api/types';
import { compactId, fullName, idOf, isRecord, money, numberValue, rowsFrom, statusClass, textOf } from '@/lib/viewUtils';

export function TransportPage() {
  const qc = useQueryClient();
  const [routeOpen, setRouteOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [lookupStudentId, setLookupStudentId] = useState('');

  const routesQuery = useQuery({ queryKey: ['transport-routes'], queryFn: () => Transport.routes.list() });
  const vehiclesQuery = useQuery({ queryKey: ['transport-vehicles'], queryFn: () => Transport.vehicles.list() });
  const driversQuery = useQuery({ queryKey: ['transport-drivers'], queryFn: () => Transport.drivers.list() });
  const studentsQuery = useQuery({ queryKey: ['students', 'transport'], queryFn: () => Students.list({ page: 1, limit: 100 }) });
  const allocationQuery = useQuery({
    queryKey: ['transport-allocation', lookupStudentId],
    queryFn: () => Transport.forStudent(lookupStudentId),
    enabled: Boolean(lookupStudentId),
    retry: false,
  });

  const routes = rowsFrom<any>(routesQuery.data, ['routes', 'data']);
  const vehicles = rowsFrom<any>(vehiclesQuery.data, ['vehicles', 'data']);
  const drivers = rowsFrom<any>(driversQuery.data, ['drivers', 'data']);
  const students = studentsQuery.data?.students ?? [];
  const meta = isRecord(routesQuery.data?.meta) ? routesQuery.data?.meta : {};

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transport-routes'] });
    qc.invalidateQueries({ queryKey: ['transport-vehicles'] });
    qc.invalidateQueries({ queryKey: ['transport-drivers'] });
    qc.invalidateQueries({ queryKey: ['transport-allocation'] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 10"
        title="Transport"
        subtitle="Live route registration, fleet management, driver assignment, and student allocations."
        actions={
          <>
            <button onClick={() => setAssignOpen(true)} className="btn-outline"><Icon name="teacher" size={16} /> Assign driver</button>
            <button onClick={() => setVehicleOpen(true)} className="btn-outline"><Icon name="plus" size={16} /> Vehicle</button>
            <button onClick={() => setRouteOpen(true)} className="btn-primary"><Icon name="plus" size={16} /> Route</button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Routes" value={textOf(meta, ['total'], String(routes.length))} tone="chip-brand" />
        <Stat label="Vehicles" value={vehicles.length} tone="chip-success" />
        <Stat label="Drivers" value={drivers.length} tone={drivers.length ? 'chip-success' : 'chip-warning'} />
        <Stat label="Stops" value={routes.reduce((total, route) => total + rowsFrom(route, ['stops']).length, 0)} tone="chip-brand" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Active routes</h2>
                <p className="text-sm text-ink-500">Loaded from `/transport/routes`.</p>
              </div>
              <button onClick={() => setAllocateOpen(true)} className="btn-outline w-full px-3 py-2 text-xs sm:w-auto">Allocate student</button>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {routes.map((route) => (
                <RouteCard key={idOf(route)} route={route} onClick={() => setActiveRoute(route)} />
              ))}
              {!routes.length && (
                <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-400 lg:col-span-2">
                  {routesQuery.isLoading ? 'Loading routes...' : 'No active transport routes returned.'}
                </div>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-line p-4">
              <h2 className="font-display text-lg font-semibold">Fleet</h2>
              <p className="text-sm text-ink-500">Vehicle records returned by `/transport/vehicles`.</p>
            </div>
            <div className="md:hidden divide-y divide-line/60">
              {vehicles.map((vehicle) => (
                <div key={idOf(vehicle)} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900 truncate">{textOf(vehicle, ['vehicleNumber'])}</p>
                      <p className="text-xs text-ink-500 mt-0.5 truncate">{textOf(vehicle, ['model'])}</p>
                    </div>
                    <span className={statusClass(textOf(vehicle, ['status'], ''))}>{textOf(vehicle, ['status'])}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="label">Capacity</p>
                      <p className="mt-1 font-semibold text-ink-900">{textOf(vehicle, ['capacity'])}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="label">Driver</p>
                      <p className="mt-1 font-semibold text-ink-900 break-words">{fullName(vehicle.driverId, 'Not assigned')}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!vehicles.length && <p className="p-6 text-center text-sm text-ink-400">No vehicles registered yet.</p>}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-muted/60">
                  <tr><th className="table-header">Vehicle</th><th className="table-header">Capacity</th><th className="table-header">Driver</th><th className="table-header">Status</th></tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={idOf(vehicle)} className="hover:bg-muted/40">
                      <td className="table-cell">
                        <p className="font-semibold text-ink-900">{textOf(vehicle, ['vehicleNumber'])}</p>
                        <p className="text-xs text-ink-500">{textOf(vehicle, ['model'])}</p>
                      </td>
                      <td className="table-cell">{textOf(vehicle, ['capacity'])}</td>
                      <td className="table-cell">{fullName(vehicle.driverId, 'Not assigned')}</td>
                      <td className="table-cell"><span className={statusClass(textOf(vehicle, ['status'], ''))}>{textOf(vehicle, ['status'])}</span></td>
                    </tr>
                  ))}
                  {!vehicles.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">No vehicles registered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold">Student allocation lookup</h2>
            <p className="text-sm text-ink-500">Fetch route, stop, and vehicle for one student.</p>
            <select className="input mt-4" value={lookupStudentId} onChange={(event) => setLookupStudentId(event.target.value)}>
              <option value="">Select student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
            </select>
            <AllocationDetails data={allocationQuery.data} loading={allocationQuery.isLoading} error={allocationQuery.error as any} />
          </div>

          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold">Registered drivers</h2>
            <p className="text-sm text-ink-500">Returned by `/transport/drivers`.</p>
            <div className="mt-4 space-y-2">
              {drivers.map((driver) => (
                <div key={idOf(driver)} className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                  <div>
                    <p className="font-semibold text-ink-900">{fullName(driver)}</p>
                    <p className="text-xs text-ink-500">{textOf(driver, ['phone', 'email'])}</p>
                  </div>
                  <span className={statusClass(textOf(driver, ['status'], ''))}>{textOf(driver, ['status'], 'ACTIVE')}</span>
                </div>
              ))}
              {!drivers.length && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">No DRIVER-role employee is registered yet.</p>}
            </div>
          </div>
        </aside>
      </section>

      <AnimatePresence>
        {routeOpen && <RouteFormModal onClose={() => setRouteOpen(false)} onSaved={() => { setRouteOpen(false); invalidate(); }} />}
        {vehicleOpen && <VehicleFormModal onClose={() => setVehicleOpen(false)} onSaved={() => { setVehicleOpen(false); invalidate(); }} />}
        {assignOpen && <DriverAssignModal drivers={drivers} vehicles={vehicles} onClose={() => setAssignOpen(false)} onSaved={() => { setAssignOpen(false); invalidate(); }} />}
        {allocateOpen && <AllocationModal routes={routes} vehicles={vehicles} students={students} onClose={() => setAllocateOpen(false)} onSaved={() => { setAllocateOpen(false); invalidate(); }} />}
        {activeRoute && <RouteDetailsModal route={activeRoute} onClose={() => setActiveRoute(null)} onAllocate={() => { setActiveRoute(null); setAllocateOpen(true); }} />}
      </AnimatePresence>
    </div>
  );
}

function RouteCard({ route, onClick }: { route: any; onClick: () => void }) {
  const stops = rowsFrom<any>(route, ['stops']);
  return (
    <button onClick={onClick} className="card p-5 text-left transition-all hover:border-brand-300 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">{compactId(route)}</p>
          <h3 className="mt-1 font-display text-lg font-semibold">{textOf(route, ['routeName'])}</h3>
          <p className="mt-1 text-sm text-ink-500">{textOf(route, ['startPoint'])} to {textOf(route, ['endPoint'])}</p>
        </div>
        <span className={statusClass(textOf(route, ['status'], ''))}>{textOf(route, ['status'], 'ACTIVE')}</span>
      </div>
      <div className="mt-4 space-y-2">
        {stops.slice(0, 4).map((stop, index) => (
          <div key={idOf(stop) || textOf(stop, ['stopName'])} className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">{index + 1}</span>
            <span className="text-sm text-ink-700">{textOf(stop, ['stopName'])}</span>
          </div>
        ))}
        {!stops.length && <p className="text-sm text-ink-400">No stops added yet.</p>}
        {stops.length > 4 && <p className="pl-9 text-xs text-ink-400">+ {stops.length - 4} more stops</p>}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-ink-400">
        <span>{money(textOf(route, ['fare'], '0'))} route fare</span>
        <span>{stops.length} stops</span>
      </div>
    </button>
  );
}

function RouteFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ routeName: '', startPoint: '', endPoint: '', fare: '0', stops: '' });
  const save = useMutation({
    mutationFn: () => Transport.routes.create({
      routeName: form.routeName,
      startPoint: form.startPoint,
      endPoint: form.endPoint,
      fare: numberValue(form.fare, 0),
      stops: form.stops.split('\n').map((stopName) => stopName.trim()).filter(Boolean).map((stopName) => ({ stopName })),
    }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Route registered');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to register route'),
  });

  return (
    <Modal
      title="Register route"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.routeName || !form.startPoint || !form.endPoint} className="btn-primary">
            {save.isPending ? 'Creating...' : 'Create route'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Route name" value={form.routeName} onChange={(routeName) => setForm({ ...form, routeName })} />
        <Input label="Fare" type="number" value={form.fare} onChange={(fare) => setForm({ ...form, fare })} />
        <Input label="Start point" value={form.startPoint} onChange={(startPoint) => setForm({ ...form, startPoint })} />
        <Input label="End point" value={form.endPoint} onChange={(endPoint) => setForm({ ...form, endPoint })} />
      </div>
      <div className="mt-3">
        <label className="label">Stops, one per line</label>
        <textarea className="input mt-2 min-h-[140px]" value={form.stops} onChange={(event) => setForm({ ...form, stops: event.target.value })} placeholder="School Gate&#10;Middle Stop&#10;Test Colony" />
      </div>
      <p className="mt-3 text-xs text-ink-400">Live API stores stops as embedded objects using `{` stopName `}`.</p>
    </Modal>
  );
}

function VehicleFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ vehicleNumber: '', model: '', capacity: '40' });
  const save = useMutation({
    mutationFn: () => Transport.vehicles.create({ ...form, capacity: numberValue(form.capacity, 0) }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Vehicle registered');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to register vehicle'),
  });
  return (
    <Modal
      title="Register vehicle"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.vehicleNumber || !form.model} className="btn-primary">
            {save.isPending ? 'Registering...' : 'Register'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Vehicle number" value={form.vehicleNumber} onChange={(vehicleNumber) => setForm({ ...form, vehicleNumber })} />
        <Input label="Model" value={form.model} onChange={(model) => setForm({ ...form, model })} />
        <Input label="Capacity" type="number" value={form.capacity} onChange={(capacity) => setForm({ ...form, capacity })} />
      </div>
    </Modal>
  );
}

function DriverAssignModal({ drivers, vehicles, onClose, onSaved }: { drivers: any[]; vehicles: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ driverId: idOf(drivers[0]), vehicleId: idOf(vehicles[0]) });
  const save = useMutation({
    mutationFn: () => Transport.drivers.assign(form),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Driver assigned');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to assign driver'),
  });
  return (
    <Modal
      title="Assign driver"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.driverId || !form.vehicleId} className="btn-primary">
            {save.isPending ? 'Assigning...' : 'Assign'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Driver</label>
          <select className="input mt-2" value={form.driverId} onChange={(event) => setForm({ ...form, driverId: event.target.value })}>
            <option value="">Select driver</option>
            {drivers.map((driver) => <option key={idOf(driver)} value={idOf(driver)}>{fullName(driver)} · {textOf(driver, ['email', 'phone'])}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Vehicle</label>
          <select className="input mt-2" value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
            <option value="">Select vehicle</option>
            {vehicles.map((vehicle) => <option key={idOf(vehicle)} value={idOf(vehicle)}>{textOf(vehicle, ['vehicleNumber'])} · {textOf(vehicle, ['model'])}</option>)}
          </select>
        </div>
      </div>
      {!drivers.length && <p className="mt-3 text-xs text-warning">No transport drivers are currently returned by the API. Create a DRIVER employee first.</p>}
    </Modal>
  );
}

function AllocationModal({ routes, vehicles, students, onClose, onSaved }: { routes: any[]; vehicles: any[]; students: Student[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    studentId: students[0]?.id ?? '',
    routeId: idOf(routes[0]),
    vehicleId: idOf(vehicles[0]),
    stopName: '',
  });
  const selectedRoute = routes.find((route) => idOf(route) === form.routeId);
  const stops = rowsFrom<any>(selectedRoute, ['stops']);
  const stopNames = useMemo(() => stops.map((stop) => textOf(stop, ['stopName'], '')).filter(Boolean), [stops]);

  const save = useMutation({
    mutationFn: () => Transport.allocate({
      studentId: form.studentId,
      routeId: form.routeId,
      vehicleId: form.vehicleId,
      stopName: form.stopName || stopNames[0] || textOf(selectedRoute, ['startPoint'], ''),
    }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Student allocated');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to allocate student'),
  });

  return (
    <Modal
      title="Allocate student transport"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.studentId || !form.routeId || !form.vehicleId} className="btn-primary">
            {save.isPending ? 'Allocating...' : 'Allocate'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Student" value={form.studentId} onChange={(studentId) => setForm({ ...form, studentId })}>
          <option value="">Select student</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
        </Select>
        <Select label="Route" value={form.routeId} onChange={(routeId) => setForm({ ...form, routeId, stopName: '' })}>
          <option value="">Select route</option>
          {routes.map((route) => <option key={idOf(route)} value={idOf(route)}>{textOf(route, ['routeName'])}</option>)}
        </Select>
        <Select label="Vehicle" value={form.vehicleId} onChange={(vehicleId) => setForm({ ...form, vehicleId })}>
          <option value="">Select vehicle</option>
          {vehicles.map((vehicle) => <option key={idOf(vehicle)} value={idOf(vehicle)}>{textOf(vehicle, ['vehicleNumber'])} · {textOf(vehicle, ['model'])}</option>)}
        </Select>
        <Select label="Stop" value={form.stopName} onChange={(stopName) => setForm({ ...form, stopName })}>
          <option value="">Use first/start stop</option>
          {stopNames.map((stopName) => <option key={stopName} value={stopName}>{stopName}</option>)}
        </Select>
      </div>
    </Modal>
  );
}

function RouteDetailsModal({ route, onClose, onAllocate }: { route: any; onClose: () => void; onAllocate: () => void }) {
  const stops = rowsFrom<any>(route, ['stops']);
  return (
    <Modal
      title={textOf(route, ['routeName'])}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Close</button>
          <button onClick={onAllocate} className="btn-primary">Allocate student</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Start" value={textOf(route, ['startPoint'])} />
        <Info label="End" value={textOf(route, ['endPoint'])} />
        <Info label="Fare" value={money(textOf(route, ['fare'], '0'))} />
      </div>
      <div className="mt-5">
        <h3 className="label">Stops</h3>
        <div className="mt-3 space-y-2">
          {stops.map((stop, index) => (
            <div key={idOf(stop) || textOf(stop, ['stopName'])} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{index + 1}</span>
              <span className="text-sm font-medium text-ink-800">{textOf(stop, ['stopName'])}</span>
            </div>
          ))}
          {!stops.length && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">This route has no stop objects yet.</p>}
        </div>
      </div>
    </Modal>
  );
}

function AllocationDetails({ data, loading, error }: { data: any; loading: boolean; error: any }) {
  if (loading) return <p className="mt-4 text-sm text-ink-400">Loading allocation...</p>;
  if (error) return <p className="mt-4 rounded-xl border border-warning-bg bg-warning-bg/60 p-3 text-sm text-warning">{error?.response?.data?.message || 'No active allocation found.'}</p>;
  const allocation = data?.allocation ?? data?.data;
  if (!allocation) return <p className="mt-4 text-sm text-ink-400">Choose a student to view transport details.</p>;
  return (
    <div className="mt-4 rounded-2xl border border-line bg-muted/40 p-4">
      <p className="font-semibold text-ink-900">{textOf(allocation.routeId, ['routeName'], 'Route')}</p>
      <p className="mt-1 text-sm text-ink-500">{textOf(allocation, ['stopName'])} · {textOf(allocation.vehicleId, ['vehicleNumber'], 'Vehicle')}</p>
      <p className="mt-2 text-xs text-ink-400">{textOf(allocation.routeId, ['startPoint'])} to {textOf(allocation.routeId, ['endPoint'])}</p>
      <span className={clsx('mt-3', statusClass(textOf(allocation, ['status'], '')))}>{textOf(allocation, ['status'])}</span>
    </div>
  );
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="label">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
