import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { API_BASE_URL } from '@/lib/api/client';
import { Auth, Settings as TenantSettingsApi } from '@/lib/api/services';
import type { TenantSettings, TenantSettingsUpdateInput, User } from '@/lib/api/types';
import { useAuthStore } from '@/lib/stores/auth';
import { fullName } from '@/lib/viewUtils';

const LAST_LOGIN_USER_KEY = 'schoolmate-admin-last-login-user';

interface TenantSettingsFormState {
  principalName: string;
  principalQualification: string;
  principalEmail: string;
  principalPhone: string;
  boardName: string;
  boardCode: string;
  affiliationStatus: string;
}

export function SettingsPage() {
  const { user, updateUser, activeSchoolId } = useAuthStore();
  const account = useMemo(() => resolveAccount(user), [user]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [tenantForm, setTenantForm] = useState<TenantSettingsFormState>(emptyTenantSettingsForm());

  const tenantSettingsQuery = useQuery({
    queryKey: ['tenant-settings', activeSchoolId],
    enabled: Boolean(activeSchoolId),
    queryFn: () => TenantSettingsApi.get(),
  });

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const nextPreview = URL.createObjectURL(selectedImage);
    setPreviewUrl(nextPreview);

    return () => {
      URL.revokeObjectURL(nextPreview);
    };
  }, [selectedImage]);

  useEffect(() => {
    if (tenantSettingsQuery.data?.settings) {
      setTenantForm(formFromTenantSettings(tenantSettingsQuery.data.settings));
    }
  }, [tenantSettingsQuery.data]);

  const uploadImage = useMutation({
    mutationFn: (image: File) => Auth.uploadProfileImage(image),
    onSuccess: (res) => {
      if (!account || !res.cdnUrl) {
        toast.success(res.message || 'Profile image updated');
        return;
      }

      updateUser({
        ...account,
        profileImageUrl: res.cdnUrl,
      });
      setSelectedImage(null);
      toast.success(res.message || 'Profile image updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to upload profile image'),
  });

  const changePassword = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) => Auth.changePassword(body),
    onSuccess: (res) => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(res.message || 'Password updated successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to change password'),
  });

  const updateTenantSettings = useMutation({
    mutationFn: (body: TenantSettingsUpdateInput) => TenantSettingsApi.update(body),
    onSuccess: async (res) => {
      toast.success(res.message || 'Settings updated successfully');
      if (res.settings) {
        setTenantForm(formFromTenantSettings(res.settings));
      } else {
        await tenantSettingsQuery.refetch();
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to update settings'),
  });

  if (!account) {
    return (
      <div className="card p-6">
        <h1 className="font-display text-2xl font-bold">My Account</h1>
        <p className="mt-2 text-ink-500">No account is loaded for this session.</p>
      </div>
    );
  }

  const displayName = fullName(account, 'Account');
  const schoolName = account.schoolName || 'School';
  const initials = [account.firstName?.[0], account.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'SA';
  const phone = account.phone?.trim() || '-';
  const profileImage = resolveAssetUrl(account.profileImageUrl);
  const currentImage = previewUrl || profileImage;
  const tenantSettings = tenantSettingsQuery.data?.settings;

  function handleImageSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedImage) {
      toast.error('Choose an image first');
      return;
    }
    uploadImage.mutate(selectedImage);
  }

  function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();

    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim()) {
      toast.error('Current password and new password are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password must match');
      return;
    }

    changePassword.mutate({
      currentPassword: passwordForm.currentPassword.trim(),
      newPassword: passwordForm.newPassword.trim(),
    });
  }

  function handleTenantSubmit(event: FormEvent) {
    event.preventDefault();

    updateTenantSettings.mutate({
      principalInfo: {
        name: tenantForm.principalName.trim(),
        qualification: tenantForm.principalQualification.trim(),
        email: tenantForm.principalEmail.trim(),
        phone: tenantForm.principalPhone.trim(),
      },
      academicBoardInfo: {
        boardName: tenantForm.boardName.trim(),
        boardCode: tenantForm.boardCode.trim(),
        affiliationStatus: tenantForm.affiliationStatus.trim(),
      },
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        eyebrow="You"
        title="Settings"
        subtitle={`Manage your admin account for ${schoolName}.`}
      />

      <section className="rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-canvas p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-brand-gradient text-2xl font-bold text-white shadow-pop-30">
              {currentImage ? (
                <img src={currentImage} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">Account identity</p>
              <h2 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-ink-500">{account.email}</p>
              <p className="mt-2 text-sm font-semibold text-ink-900">
                Phone: <span className="font-normal text-ink-600">{phone}</span>
              </p>
            </div>
          </div>
          <span className="chip-brand w-fit self-start lg:self-center">{schoolName}</span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleImageSubmit} className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl bg-brand-gradient text-3xl font-bold text-white shadow-pop-30">
              {currentImage ? (
                <img src={currentImage} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-semibold">Profile image</h3>
              <p className="mt-1 text-sm text-ink-500">
                Upload a new photo to update your account avatar across the admin console.
              </p>

              <label className="mt-4 block">
                <span className="label">Choose image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="input mt-2 h-auto py-3 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700"
                  onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)}
                />
              </label>

              <p className="mt-3 text-xs text-ink-400">
                {selectedImage ? `Selected: ${selectedImage.name}` : 'JPG, PNG, and WEBP images are supported by the API.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button type="submit" disabled={uploadImage.isPending || !selectedImage} className="btn-primary">
                  {uploadImage.isPending ? 'Uploading...' : 'Update image'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  disabled={uploadImage.isPending || !selectedImage}
                  className="btn-ghost"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </form>

        <form onSubmit={handlePasswordSubmit} className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-xl font-semibold">Change password</h3>
          <p className="mt-1 text-sm text-ink-500">
            Use your current password and set a new one for this admin account.
          </p>

          <div className="mt-5 space-y-4">
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
            />
            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={changePassword.isPending} className="btn-primary">
              {changePassword.isPending ? 'Saving...' : 'Change password'}
            </button>
            <button
              type="button"
              onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
              disabled={changePassword.isPending}
              className="btn-ghost"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <InfoCard label="First name" value={account.firstName || '-'} />
        <InfoCard label="Last name" value={account.lastName || '-'} />
        <InfoCard label="Email" value={account.email || '-'} />
        <InfoCard label="Username" value={account.username || '-'} mono />
        <InfoCard label="Role" value={formatRole(account.role)} />
        <InfoCard label="Phone" value={phone} />
      </section>

    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input mt-2"
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative mt-2">
        <input
          className="input pr-12"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition hover:bg-muted hover:text-ink-700"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={17} />
        </button>
      </div>
    </label>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400">{label}</p>
      <p className={`mt-2 break-words text-base font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  );
}

function SettingStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <p className={`mt-2 break-words font-semibold text-ink-900 ${mono ? 'font-mono text-xs' : 'text-base'}`}>{value}</p>
    </div>
  );
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="break-words text-sm font-semibold text-ink-900 sm:text-right">{value}</p>
    </div>
  );
}

function ChipCard({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <h4 className="font-display text-lg font-semibold">{title}</h4>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span key={item} className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {item}
          </span>
        )) : (
          <p className="text-sm text-ink-500">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function formatRole(role: string) {
  return role ? role.replace(/_/g, ' ') : '-';
}

function formatBoolean(value?: boolean) {
  if (typeof value !== 'boolean') return '-';
  return value ? 'Enabled' : 'Disabled';
}

function formatNumber(value?: number) {
  return typeof value === 'number' ? String(value) : '-';
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
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
    phone: user.phone?.trim() || snapshot.phone?.trim() || user.phone || '-',
    profileImageUrl: user.profileImageUrl || snapshot.profileImageUrl || user.profileImageUrl,
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

function resolveAssetUrl(url?: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function formFromTenantSettings(settings: TenantSettings): TenantSettingsFormState {
  return {
    principalName: settings.principalInfo.name || '',
    principalQualification: settings.principalInfo.qualification || '',
    principalEmail: settings.principalInfo.email || '',
    principalPhone: settings.principalInfo.phone || '',
    boardName: settings.academicBoardInfo.boardName || '',
    boardCode: settings.academicBoardInfo.boardCode || '',
    affiliationStatus: settings.academicBoardInfo.affiliationStatus || '',
  };
}

function emptyTenantSettingsForm(): TenantSettingsFormState {
  return {
    principalName: '',
    principalQualification: '',
    principalEmail: '',
    principalPhone: '',
    boardName: '',
    boardCode: '',
    affiliationStatus: '',
  };
}

function emptyTenantSettings(): TenantSettings {
  return {
    principalInfo: {},
    academicBoardInfo: {},
  };
}
