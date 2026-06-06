import { ReactNode } from 'react';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}
export function PageHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <header className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        {eyebrow && <p className="label">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-bold tracking-tight mt-1">{title}</h1>
        {subtitle && <p className="text-ink-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div>
    </header>
  );
}
