interface LogoProps { size?: number; withWordmark?: boolean; mark?: 'light' | 'dark' }
export function Logo({ size = 32, withWordmark = true, mark = 'dark' }: LogoProps) {
  const stroke = mark === 'light' ? '#FFFFFF' : '#0F172A';
  return (
    <div className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5"/><stop offset="100%" stopColor="#8B5CF6"/>
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#lg)" />
        <path d="M20 9 9 14l11 5 11-5-11-5z" fill="white" opacity=".95" />
        <path d="M13 17v5c0 1.4 3.1 2.8 7 2.8s7-1.4 7-2.8v-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".95" />
        <path d="M20 19v12" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".8"/>
      </svg>
      {withWordmark && (
        <span className="font-display font-bold text-[18px] tracking-tight" style={{ color: stroke }}>
          Schoolmate
        </span>
      )}
    </div>
  );
}
