import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import type { User } from '@/lib/api/types';
import { useAuthStore } from '@/lib/stores/auth';
import { fullName } from '@/lib/viewUtils';

const LAST_LOGIN_USER_KEY = 'schoolmate-admin-last-login-user';

export function SettingsPage() {
  const { user } = useAuthStore();
  const account = useMemo(() => resolveAccount(user), [user]);

  if (!account) {
    return (
      <div className="card p-6">
        <h1 className="font-display text-2xl font-bold">My Account</h1>
        <p className="text-ink-500 mt-2">No account is loaded for this session.</p>
      </div>
    );
  }

  const displayName = fullName(account, 'Account');
  const initials = [account.firstName?.[0], account.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'SA';
  const phone = account.phone?.trim() || '—';

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="You"
        title="My Account"
        subtitle="Read-only profile for the signed-in admin account."
      />

      <section className="rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-canvas p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-16 w-16 rounded-2xl bg-brand-gradient text-white grid place-items-center font-display text-xl font-bold shadow-pop-30 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">Account identity</p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold truncate">{displayName}</h2>
              <p className="mt-1 text-sm text-ink-500 truncate">{account.email}</p>
              <p className="mt-2 text-sm font-semibold text-ink-900">
                Phone: <span className="font-normal text-ink-600">{phone}</span>
              </p>
            </div>
          </div>
          <span className="chip-brand w-fit self-start sm:self-center">Read only</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <InfoCard label="First name" value={account.firstName || '—'} />
        <InfoCard label="Last name" value={account.lastName || '—'} />
        <InfoCard label="Email" value={account.email || '—'} />
        <InfoCard label="Username" value={account.username || '—'} mono />
        <InfoCard label="Role" value={formatRole(account.role)} />
        <InfoCard label="Phone" value={phone} />
      </section>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
        <h3 className="font-display text-lg font-semibold">Access summary</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-muted/30 p-4">
            <p className="label">Visible permissions</p>
            <p className="mt-1 text-sm text-ink-600">This page only shows your account identity and contact details.</p>
          </div>
          <div className="rounded-2xl border border-line bg-muted/30 p-4">
            <p className="label">Actions</p>
            <p className="mt-1 text-sm text-ink-600">No edit, delete, or account action controls are exposed here.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-soft">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-400 font-bold">{label}</p>
      <p className={`mt-2 text-base font-semibold text-ink-900 break-words ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  );
}

function formatRole(role: string) {
  return role ? role.replace(/_/g, ' ') : '—';
}

function resolveAccount(user: User | null): User | null {
  const snapshot = readLastLoginUser();

  if (!user && !snapshot) return null;
  if (!user) return snapshot as User;
  if (!snapshot) return user;

  return {
    ...user,
    firstName: user.firstName || snapshot.firstName || user.firstName,
    lastName: user.lastName || snapshot.lastName || user.lastName,
    email: user.email || snapshot.email || user.email,
    username: user.username || snapshot.username || user.username,
    role: user.role || snapshot.role || user.role,
    phone: user.phone?.trim() || snapshot.phone?.trim() || user.phone || '—',
    schoolId: user.schoolId ?? snapshot.schoolId ?? null,
    status: user.status || snapshot.status || user.status,
  };
}

function readLastLoginUser(): Partial<User> | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(LAST_LOGIN_USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}
