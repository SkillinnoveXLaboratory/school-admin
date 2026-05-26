import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { useAuthStore } from '@/lib/stores/auth';

export function SettingsPage() {
  const { user, activeSchoolId } = useAuthStore();
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader eyebrow="You" title="Settings" subtitle="Profile, school context, and notifications." />
      <section className="card p-6">
        <h2 className="font-display text-base font-semibold">Active school</h2>
        <p className="text-sm text-ink-500 mt-1">The school account you're managing in this session.</p>
        <p className="mt-3 text-base font-semibold text-ink-900">{user?.role === 'SUPER_ADMIN' ? 'Multi-tenant' : (activeSchoolId ? 'Connected ✓' : '— not connected —')}</p>
      </section>
      <section className="card p-6 space-y-5">
        <h2 className="font-display text-base font-semibold">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First name" value={user?.firstName ?? ''}/>
          <Field label="Last name"  value={user?.lastName ?? ''}/>
          <Field label="Email"      value={user?.email ?? ''}/>
          <Field label="Phone"      value={user?.phone ?? ''}/>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost">Reset</button>
          <button className="btn-primary"><Icon name="check" size={14}/> Save changes</button>
        </div>
      </section>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return <div><label className="label">{label}</label><input defaultValue={value} className="input mt-2"/></div>;
}
