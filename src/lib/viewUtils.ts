export type Dict = Record<string, unknown>;

export function isRecord(value: unknown): value is Dict {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function idOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';
  const id = value.id ?? value._id;
  return typeof id === 'string' ? id : '';
}

export function textOf(value: unknown, keys: string[], fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (!isRecord(value)) return fallback;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (typeof candidate === 'number') return String(candidate);
  }
  return fallback;
}

export function fullName(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (!isRecord(value)) return fallback;
  const first = textOf(value, ['firstName', 'first_name'], '');
  const last = textOf(value, ['lastName', 'last_name'], '');
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || textOf(value, ['name', 'email', 'username'], fallback);
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SM';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export function compactId(value: unknown): string {
  const id = idOf(value);
  return id ? `${id.slice(0, 6)}…${id.slice(-4)}` : '—';
}

export function rowsFrom<T = Dict>(body: unknown, keys: string[]): T[] {
  if (Array.isArray(body)) return body as T[];
  if (!isRecord(body)) return [];
  for (const key of keys) {
    const candidate = body[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}

export function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function inputDate(value?: string | Date): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function money(value: unknown): string {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function numberValue(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function statusClass(status: string): string {
  const normalized = status.toUpperCase();
  if (['ACTIVE', 'AVAILABLE', 'PRESENT', 'APPROVED', 'RETURNED', 'ALLOCATED', 'ENROLLED', 'HEALTHY'].includes(normalized)) {
    return 'chip-success';
  }
  if (['PENDING', 'ISSUED', 'LATE', 'HALF_DAY', 'HALF-DAY', 'SCHEDULED'].includes(normalized)) return 'chip-warning';
  if (['ABSENT', 'REJECTED', 'LOST', 'DAMAGED', 'SUSPENDED', 'DE-ENROLLED', 'DEENROLLED'].includes(normalized)) return 'chip-danger';
  return 'chip-brand';
}
