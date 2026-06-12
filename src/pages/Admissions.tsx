import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { API_BASE_URL } from '@/lib/api/client';
import { Academic, Admissions } from '@/lib/api/services';
import type {
  AdmissionApplication,
  AdmissionApplyInput,
  AdmissionStatus,
} from '@/lib/api/types';

type Filter = AdmissionStatus | 'ALL';

export function AdmissionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<AdmissionApplication | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [status, query]);

  const admissionsQuery = useQuery({
    queryKey: ['admissions', status, page],
    queryFn: () => Admissions.list({ status: status === 'ALL' ? undefined : status, page, limit: 12 }),
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => Academic.classes.list(),
  });

  const applications = admissionsQuery.data?.applications ?? [];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter((app) => {
      const haystack = [
        app.firstName,
        app.lastName,
        app.parentContact?.primaryPhone,
        app.parentContact?.fatherName,
        app.parentContact?.motherName,
        app.emergencyContact,
        app.enrollmentNumber,
        app.id,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [applications, query]);

  const stats = useMemo(() => {
    const counts = { PENDING: 0, APPLIED: 0, VERIFIED: 0, APPROVED: 0, ENROLLED: 0, REJECTED: 0 };
    for (const app of applications) counts[normalizeStatus(app.status)] += 1;
    return counts;
  }, [applications]);

  const createMut = useMutation({
    mutationFn: (payload: AdmissionApplyInput) => Admissions.apply(payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Admission application submitted');
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setCreating(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to submit application'),
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => Admissions.verify(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Application verified');
      qc.invalidateQueries({ queryKey: ['admissions'] });
      if (res.application) setActive(res.application);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to verify application'),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => Admissions.approve(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Application approved');
      qc.invalidateQueries({ queryKey: ['admissions'] });
      if (res.application) setActive(res.application);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to approve application'),
  });

  const uploadMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: FormData }) => Admissions.uploadDoc(id, form),
    onSuccess: (res) => {
      toast.success(res.message || 'Document uploaded');
      qc.invalidateQueries({ queryKey: ['admissions'] });
      if (active) {
        Admissions.get(active.id).then(setActive).catch(() => {});
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to upload document'),
  });

  const enrollMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => Admissions.enroll(id, body),
    onSuccess: (res) => {
      const creds = [
        res.userCredentials ? `Student: ${res.userCredentials.username} / ${res.userCredentials.passwordDefault}` : null,
        res.parentCredentials ? `Parent: ${res.parentCredentials.username} / ${res.parentCredentials.passwordDefault}` : null,
      ].filter(Boolean).join(' · ');
      toast.success(res.message || `Enrolled${creds ? ` · ${creds}` : ''}`);
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setEnrolling(false);
      setActive(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to enroll application'),
  });

  const total = admissionsQuery.data?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 2"
        title="Admissions"
        subtitle="From first application through verification, approval, and enrollment."
        actions={(
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Icon name="plus" size={16} /> New application
          </button>
        )}
      />

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: total, tone: 'brand' },
          { label: 'Applied', value: stats.APPLIED, tone: 'warning' },
          { label: 'Verified', value: stats.VERIFIED, tone: 'info' },
          { label: 'Approved', value: stats.APPROVED, tone: 'success' },
          { label: 'Enrolled', value: stats.ENROLLED, tone: 'brand' },
        ].map((s) => (
          <article key={s.label} className="stat-card">
            <p className="label">{s.label}</p>
            <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
          </article>
        ))}
      </section>

      <section className="card p-4 sm:p-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applicant, parent phone, ID..."
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'APPLIED', 'VERIFIED', 'APPROVED', 'ENROLLED', 'REJECTED'] as Filter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                status === s ? 'bg-surface shadow-soft text-ink-900' : 'bg-muted text-ink-500 hover:text-ink-900',
              )}
            >
              {labelStatus(s)}
            </button>
          ))}
        </div>
      </section>

      {admissionsQuery.error && (
        <div className="card p-4 border-warning bg-warning-bg/30 text-warning text-sm">
          Couldn&apos;t load admission applications. <span className="opacity-70">({String(admissionsQuery.error)})</span>
        </div>
      )}

      <div className="card overflow-hidden">
        {admissionsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted/60 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center">
              <Icon name="parent" size={28} />
            </div>
            <h3 className="font-display text-xl font-semibold mt-4">No applications found</h3>
            <p className="text-ink-500 text-sm mt-1 max-w-md mx-auto">
              Start a new application or adjust the filters to see admissions in progress.
            </p>
            <button onClick={() => setCreating(true)} className="btn-primary mt-5">
              <Icon name="plus" size={16} /> New application
            </button>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full">
                <thead className="bg-muted/60">
                  <tr>
                    <Th>Applicant</Th>
                    <Th>Academic</Th>
                    <Th>Stage</Th>
                    <Th>Submitted</Th>
                    <Th className="text-right pr-6">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr key={app.id} onClick={() => setActive(app)} className="hover:bg-muted/40 transition-colors cursor-pointer">
                      <Td>
                        <ApplicantCell app={app} />
                      </Td>
                      <Td>
                        <div className="text-sm font-medium">{app.classAppliedFor || app.academic?.classApplied || '-'}</div>
                        <div className="text-xs text-ink-400">
                          {app.academic?.section || '-'} · {app.academic?.enrollmentType || '-'}
                        </div>
                      </Td>
                      <Td><StatusChip status={app.status} /></Td>
                      <Td className="text-ink-500 text-xs">{formatDate(app.createdAt)}</Td>
                      <Td className="text-right pr-6">
                        <button onClick={(e) => { e.stopPropagation(); setActive(app); }} className="btn-ghost py-1.5 px-3 text-xs">
                          Open
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden p-3">
                {filtered.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setActive(app)}
                    className="rounded-2xl border border-line bg-surface p-4 text-left hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{app.firstName} {app.lastName}</div>
                        <div className="text-xs text-ink-400 mt-1">
                          {app.parentEmail || app.parentContact?.primaryPhone || app.primaryContactNo || app.emergencyContactNo || app.emergencyContact}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-1">
                          {app.bloodGroup || '—'} · {app.classAppliedFor || app.academic?.classApplied || '—'} / {app.academic?.section || '—'}
                        </div>
                      </div>
                    <StatusChip status={app.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                    <span>{formatDate(app.createdAt)}</span>
                    <span>ID: {app.id.slice(0, 8)}...</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-ink-500">
        <p>Page {admissionsQuery.data?.meta.page ?? 1} of {admissionsQuery.data?.meta.pages ?? 1}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-outline py-2 px-3 text-xs"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (admissionsQuery.data?.meta.pages ?? 1)}
            className="btn-outline py-2 px-3 text-xs"
          >
            Next
          </button>
        </div>
      </div>

      <AnimatePresence>
        {creating && (
          <ApplicationFormModal
            onClose={() => setCreating(false)}
            onSubmit={(payload) => createMut.mutate(payload)}
            pending={createMut.isPending}
          />
        )}
        {active && (
          <ApplicationDetailModal
            app={active}
            onClose={() => setActive(null)}
            onVerify={() => verifyMut.mutate(active.id)}
            onApprove={() => approveMut.mutate(active.id)}
            onUpload={(form) => uploadMut.mutate({ id: active.id, form })}
            onEnroll={() => setEnrolling(true)}
            busy={verifyMut.isPending || approveMut.isPending || uploadMut.isPending}
          />
        )}
        {active && enrolling && (
          <EnrollModal
            app={active}
            classes={classesQuery.data?.classes ?? []}
            onClose={() => setEnrolling(false)}
            onSubmit={(body) => enrollMut.mutate({ id: active.id, body })}
            pending={enrollMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ApplicationFormModal({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void;
  onSubmit: (payload: AdmissionApplyInput) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<AdmissionApplyInput>({
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    bloodGroup: '',
    identificationMark: '',
    nationalId: '',
    aadharNo: '',
    emergencyContactName: '',
    emergencyContactNo: '',
    emergencyContact: '',
    fatherName: '',
    motherName: '',
    guardianName: '',
    primaryPhone: '',
    secondaryPhone: '',
    parentEmail: '',
    primaryContactNo: '',
    secondaryContactNo: '',
    address: {
      homeAddress: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
    },
    academic: {
      classApplied: '',
      section: '',
      enrollmentType: '',
      previousSchool: '',
      lastGradeCompleted: '',
    },
    classAppliedFor: '',
    previousSchoolName: '',
    isDeclarationSigned: false,
    isParentSigned: false,
    parentContact: {
      fatherName: '',
      motherName: '',
      primaryPhone: '',
      homeAddress: '',
      secondaryPhone: '',
      guardianName: '',
      parentEmail: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
    },
  });
  const address = form.address ?? {};
  const academic = form.academic ?? {};
  const parentContact = form.parentContact ?? {};

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(buildAdmissionPayload(form));
  }

  return (
    <Modal
      title="New admission application"
      onClose={onClose}
      size="xl"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button onClick={submit} disabled={pending} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
            {pending ? 'Submitting...' : 'Submit application'}
          </button>
        </div>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Applicant</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="First name" value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
            <Field label="Last name" value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
            <div>
              <label className="label">Gender</label>
              <select className="input mt-2" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as AdmissionApplyInput['gender'] }))}>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
            <Field label="Blood group" value={form.bloodGroup ?? ''} onChange={(v) => setForm((f) => ({ ...f, bloodGroup: v }))} />
            <Field label="Aadhar no" value={form.aadharNo ?? form.nationalId ?? ''} onChange={(v) => setForm((f) => ({ ...f, aadharNo: v, nationalId: v }))} />
            <Field label="Identification mark" value={form.identificationMark ?? ''} onChange={(v) => setForm((f) => ({ ...f, identificationMark: v }))} />
            <Field label="Emergency contact name" value={form.emergencyContactName ?? ''} onChange={(v) => setForm((f) => ({ ...f, emergencyContactName: v }))} />
            <Field label="Emergency contact no" value={form.emergencyContactNo ?? form.emergencyContact ?? ''} onChange={(v) => setForm((f) => ({ ...f, emergencyContactNo: v, emergencyContact: v }))} />
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Parent / Guardian</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="Father name" value={form.fatherName ?? ''} onChange={(v) => setForm((f) => ({ ...f, fatherName: v, parentContact: { ...f.parentContact, fatherName: v } }))} />
            <Field label="Mother name" value={form.motherName ?? ''} onChange={(v) => setForm((f) => ({ ...f, motherName: v, parentContact: { ...f.parentContact, motherName: v } }))} />
            <Field label="Guardian name" value={form.guardianName ?? ''} onChange={(v) => setForm((f) => ({ ...f, guardianName: v, parentContact: { ...f.parentContact, guardianName: v } }))} />
            <Field label="Primary phone" value={form.primaryPhone ?? ''} onChange={(v) => setForm((f) => ({ ...f, primaryPhone: v, parentContact: { ...f.parentContact, primaryPhone: v } }))} />
            <Field label="Secondary phone" value={form.secondaryPhone ?? ''} onChange={(v) => setForm((f) => ({ ...f, secondaryPhone: v, parentContact: { ...f.parentContact, secondaryPhone: v } }))} />
            <Field label="Parent email" type="email" value={form.parentEmail ?? ''} onChange={(v) => setForm((f) => ({ ...f, parentEmail: v, parentContact: { ...f.parentContact, parentEmail: v } }))} />
            <div className="sm:col-span-2">
              <Field label="Home address" value={parentContact.homeAddress ?? ''} onChange={(v) => setForm((f) => ({ ...f, parentContact: { ...f.parentContact, homeAddress: v }, address: { ...f.address, homeAddress: v } }))} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="City" value={address.city ?? ''} onChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, city: v }, parentContact: { ...f.parentContact, city: v } }))} />
            <Field label="District" value={address.district ?? ''} onChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, district: v }, parentContact: { ...f.parentContact, district: v } }))} />
            <Field label="State" value={address.state ?? ''} onChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, state: v }, parentContact: { ...f.parentContact, state: v } }))} />
            <Field label="Pincode" value={address.pincode ?? ''} onChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, pincode: v }, parentContact: { ...f.parentContact, pincode: v } }))} />
            <div className="sm:col-span-2">
              <Field label="Home address" value={address.homeAddress ?? ''} onChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, homeAddress: v }, parentContact: { ...f.parentContact, homeAddress: v } }))} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Academic</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="Class applied" value={academic.classApplied ?? form.classAppliedFor ?? ''} onChange={(v) => setForm((f) => ({ ...f, classAppliedFor: v, academic: { ...f.academic, classApplied: v } }))} />
            <Field label="Section" value={academic.section ?? ''} onChange={(v) => setForm((f) => ({ ...f, academic: { ...f.academic, section: v } }))} />
            <Field label="Enrollment type" value={academic.enrollmentType ?? ''} onChange={(v) => setForm((f) => ({ ...f, academic: { ...f.academic, enrollmentType: v } }))} />
            <Field label="Previous school" value={academic.previousSchool ?? form.previousSchoolName ?? ''} onChange={(v) => setForm((f) => ({ ...f, previousSchoolName: v, academic: { ...f.academic, previousSchool: v } }))} />
            <div className="sm:col-span-2">
              <Field label="Last grade completed" value={academic.lastGradeCompleted ?? ''} onChange={(v) => setForm((f) => ({ ...f, academic: { ...f.academic, lastGradeCompleted: v } }))} />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={Boolean(form.isParentSigned)}
              onChange={(e) => setForm((f) => ({ ...f, isParentSigned: e.target.checked, isDeclarationSigned: e.target.checked }))}
            />
            Parent signed
          </label>
        </section>
      </form>
    </Modal>
  );
}

function ApplicationDetailModal({
  app,
  onClose,
  onVerify,
  onApprove,
  onUpload,
  onEnroll,
  busy,
}: {
  app: AdmissionApplication;
  onClose: () => void;
  onVerify: () => void;
  onApprove: () => void;
  onUpload: (form: FormData) => void;
  onEnroll: () => void;
  busy: boolean;
}) {
  const [docType, setDocType] = useState('BirthCertificate');
  const [file, setFile] = useState<File | null>(null);

  return (
    <Modal
      title={`${app.firstName} ${app.lastName}`}
      onClose={onClose}
      size="xl"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Close</button>
          {(app.status === 'APPLIED' || app.status === 'PENDING') && (
            <button onClick={onVerify} disabled={busy} className="btn-outline text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
              Verify
            </button>
          )}
          {app.status === 'VERIFIED' && (
            <button onClick={onApprove} disabled={busy} className="btn-outline text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
              Approve
            </button>
          )}
          {app.status === 'APPROVED' && (
            <button onClick={onEnroll} disabled={busy} className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto">
              Enroll
            </button>
          )}
        </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-3xl border border-line bg-gradient-to-br from-brand-50 via-white to-canvas p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-brand-600 font-bold">Application</p>
              <h3 className="font-display text-2xl font-semibold mt-2">{app.firstName} {app.lastName}</h3>
              <p className="text-sm text-ink-500 mt-1">ID: <span className="font-mono">{app.id}</span></p>
            </div>
            <StatusChip status={app.status} />
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MiniStat label="DOB" value={formatDate(app.dateOfBirth)} />
            <MiniStat label="Emergency contact" value={app.emergencyContactNo || app.emergencyContact} />
            <MiniStat label="Submitted" value={formatDate(app.createdAt)} />
            <MiniStat label="Updated" value={formatDate(app.updatedAt)} />
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Applicant details</p>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoPair label="Blood group" value={app.bloodGroup ?? '-'} />
              <InfoPair label="Aadhar no" value={app.aadharNo ?? app.nationalId ?? '-'} />
              <InfoPair label="Identification mark" value={app.identificationMark ?? '-'} />
              <InfoPair label="Guardian name" value={app.guardianName ?? '-'} />
              <InfoPair label="Primary phone" value={app.primaryContactNo ?? app.primaryPhone ?? app.parentContact?.primaryPhone ?? '-'} />
              <InfoPair label="Secondary phone" value={app.secondaryContactNo ?? app.secondaryPhone ?? '-'} />
              <InfoPair label="Parent email" value={app.parentEmail ?? '-'} />
              <InfoPair label="Emergency contact name" value={app.emergencyContactName ?? '-'} />
              <InfoPair label="Emergency contact no" value={app.emergencyContactNo ?? app.emergencyContact ?? '-'} />
              <InfoPair label="Signed by parent" value={(app.isParentSigned ?? app.isDeclarationSigned) ? 'Yes' : 'No'} />
            </dl>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Address</p>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoPair label="Home address" value={app.address?.homeAddress ?? app.parentContact?.homeAddress ?? '-'} />
              <InfoPair label="City" value={app.address?.city ?? app.parentContact?.city ?? '-'} />
              <InfoPair label="District" value={app.address?.district ?? app.parentContact?.district ?? '-'} />
              <InfoPair label="State" value={app.address?.state ?? app.parentContact?.state ?? '-'} />
              <InfoPair label="Pincode" value={app.address?.pincode ?? app.parentContact?.pincode ?? '-'} />
            </dl>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Academic</p>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoPair label="Class applied" value={app.classAppliedFor ?? app.academic?.classApplied ?? '-'} />
              <InfoPair label="Enrollment type" value={app.enrollmentType ?? app.academic?.enrollmentType ?? '-'} />
              <InfoPair label="Previous school" value={app.previousSchoolName ?? app.academic?.previousSchool ?? '-'} />
              <InfoPair label="Last grade completed" value={app.lastGradeCompleted ?? app.academic?.lastGradeCompleted ?? '-'} />
            </dl>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Parent / Guardian</p>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoPair label="Father" value={app.parentContact?.fatherName ?? '-'} />
              <InfoPair label="Mother" value={app.parentContact?.motherName ?? '-'} />
              <InfoPair label="Phone" value={app.parentContact?.primaryPhone ?? app.primaryContactNo ?? '-'} />
              <InfoPair label="Home address" value={app.parentContact?.homeAddress ?? '-'} />
            </dl>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Documents</p>
                <p className="text-sm text-ink-500 mt-1">{app.documents?.length ?? 0} uploaded</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {(app.documents?.length ? app.documents : []).map((doc) => (
                <div key={`${doc.documentType}-${doc.url}`} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div>
                    <p className="font-semibold text-sm">{doc.documentType}</p>
                    <p className="text-xs text-ink-400 font-mono truncate max-w-[18rem]">{resolveDocumentUrl(doc.url)}</p>
                  </div>
                  <a href={resolveDocumentUrl(doc.url)} target="_blank" rel="noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                    Open
                  </a>
                </div>
              ))}
              {(!app.documents || app.documents.length === 0) && (
                <p className="text-sm text-ink-500">No documents uploaded yet.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Upload document</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Document type</label>
                <select className="input mt-2" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {['BirthCertificate', 'TransferCertificate', 'Marksheet', 'AadharCard', 'PassportPhoto'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">File</label>
                <input
                  type="file"
                  className="input mt-2"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <button
                className="btn-primary w-full"
                onClick={() => {
                  if (!file) return toast.error('Please choose a file');
                  const form = new FormData();
                  form.append('documentType', docType);
                  form.append('file', file);
                  onUpload(form);
                }}
                disabled={busy}
              >
                <Icon name="upload" size={16} /> Upload
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Flow</p>
            <div className="mt-3 space-y-2">
              {['APPLIED', 'VERIFIED', 'APPROVED', 'ENROLLED'].map((step, index) => {
                const current = stageIndex(app.status);
                const active = index <= current;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={clsx('h-7 w-7 rounded-full grid place-items-center text-xs font-bold', active ? 'bg-brand-gradient text-white' : 'bg-muted text-ink-400')}>
                      {index + 1}
                    </div>
                    <div className={clsx('text-sm font-medium', active ? 'text-ink-900' : 'text-ink-400')}>{step}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function EnrollModal({
  app,
  classes,
  onClose,
  onSubmit,
  pending,
}: {
  app: AdmissionApplication;
  classes: any[];
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const selectedClass = classes.find((c) => (c.id ?? c._id) === classId);
  const sectionOptions = useMemo(() => {
    const sections = selectedClass?.sections ?? [];
    return Array.isArray(sections) ? sections : [];
  }, [selectedClass]);

  return (
    <Modal
      title={`Enroll ${app.firstName} ${app.lastName}`}
      onClose={onClose}
      size="lg"
      footer={(
        <div className="flex w-full flex-col sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs md:text-sm px-3 py-2 w-full sm:w-auto">Cancel</button>
          <button
            onClick={() => onSubmit({ classId, sectionId })}
            disabled={pending || !classId || !sectionId}
            className="btn-primary text-xs md:text-sm px-3 py-2 w-full sm:w-auto"
          >
            {pending ? 'Enrolling...' : 'Enroll student'}
          </button>
        </div>
      )}
    >
      <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Class allocation</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="label">Class</label>
            <select className="input mt-2" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id ?? c._id} value={c.id ?? c._id}>
                  {c.name ?? c.title ?? c.label ?? c.id ?? c._id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            {sectionOptions.length > 0 ? (
              <select className="input mt-2" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">Select section</option>
                {sectionOptions.map((s: any) => {
                  const value = typeof s === 'string' ? s : (s.id ?? s._id ?? s.name);
                  const label = typeof s === 'string' ? s : (s.name ?? s.label ?? s.id ?? s._id);
                  return <option key={value} value={String(value)}>{String(label)}</option>;
                })}
              </select>
            ) : (
              <Field label="Section ID" value={sectionId} onChange={setSectionId} />
            )}
          </div>
        </div>
        <p className="text-xs text-ink-400 mt-3">Enrollment will generate student and parent credentials.</p>
      </div>
    </Modal>
  );
}

function ApplicantCell({ app }: { app: AdmissionApplication }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-brand-gradient text-white grid place-items-center text-xs font-semibold shrink-0">
        {initials(app.firstName, app.lastName)}
      </div>
      <div>
        <div className="font-semibold">{app.firstName} {app.lastName}</div>
        <div className="text-xs text-ink-400">{app.parentContact?.primaryPhone ?? app.primaryContactNo ?? app.emergencyContactNo ?? app.emergencyContact}</div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: AdmissionStatus }) {
  const tone = {
    PENDING: 'chip-warning',
    APPLIED: 'chip-warning',
    VERIFIED: 'chip-brand',
    APPROVED: 'chip-success',
    ENROLLED: 'chip-success',
    REJECTED: 'chip-danger',
  }[status];
  return <span className={tone}>{status}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900 break-words">{value || '-'}</p>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line p-3 bg-canvas">
      <p className="text-[11px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="text-sm text-ink-900 mt-1 break-words">{value || '-'}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input mt-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function buildAdmissionPayload(form: AdmissionApplyInput): AdmissionApplyInput {
  const emergencyContact = form.emergencyContactNo || form.emergencyContact;
  return {
    ...form,
    emergencyContact,
    emergencyContactNo: form.emergencyContactNo || form.emergencyContact,
    aadharNo: form.aadharNo || form.nationalId,
    isDeclarationSigned: form.isDeclarationSigned ?? form.isParentSigned,
    classAppliedFor: form.classAppliedFor || form.academic?.classApplied,
    previousSchoolName: form.previousSchoolName || form.academic?.previousSchool,
    primaryContactNo: form.primaryContactNo || form.parentContact.primaryPhone,
    secondaryContactNo: form.secondaryContactNo || form.parentContact.secondaryPhone,
    parentContact: {
      fatherName: form.fatherName || form.parentContact.fatherName,
      motherName: form.motherName || form.parentContact.motherName,
      primaryPhone: form.primaryPhone || form.parentContact.primaryPhone,
      secondaryPhone: form.secondaryPhone || form.parentContact.secondaryPhone,
      guardianName: form.guardianName || form.parentContact.guardianName,
      parentEmail: form.parentEmail || form.parentContact.parentEmail,
      homeAddress: form.address?.homeAddress || form.parentContact.homeAddress,
      city: form.address?.city || form.parentContact.city,
      district: form.address?.district || form.parentContact.district,
      state: form.address?.state || form.parentContact.state,
      pincode: form.address?.pincode || form.parentContact.pincode,
    },
  };
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={clsx('table-header', className)}>{children}</th>;
}

function Td({ children, className = '', mono = false }: { children: ReactNode; className?: string; mono?: boolean }) {
  return <td className={clsx('table-cell', mono && 'font-mono text-xs', className)}>{children}</td>;
}

function normalizeStatus(status: string): AdmissionStatus {
  const normalized = (status || 'APPLIED').toUpperCase();
  return (normalized === 'PENDING' ? 'APPLIED' : normalized) as AdmissionStatus;
}

function labelStatus(status: Filter) {
  if (status === 'ALL') return 'All';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toLocaleDateString();
}

function resolveDocumentUrl(url: string) {
  if (!url) return '-';
  if (/^https?:\/\//i.test(url)) return url;
  return `${getPublicOrigin()}/${url.replace(/^\//, '')}`;
}

function getPublicOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'A';
}

function stageIndex(status: AdmissionStatus) {
  return { PENDING: 0, APPLIED: 0, VERIFIED: 1, APPROVED: 2, ENROLLED: 3, REJECTED: 0 }[status] ?? 0;
}



