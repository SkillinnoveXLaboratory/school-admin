import { SVGProps } from 'react';
import clsx from 'clsx';

type IconName =
  | 'dashboard' | 'school' | 'students' | 'teacher' | 'attendance' | 'calendar'
  | 'exam' | 'homework' | 'library' | 'finance' | 'sports' | 'transport' | 'hr'
  | 'announcement' | 'chat' | 'settings' | 'logout' | 'search' | 'bell'
  | 'plus' | 'check' | 'arrow-right' | 'upload' | 'download' | 'parent';

const paths: Record<IconName, JSX.Element> = {
  dashboard: <><rect x="3" y="3" width="8" height="9" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/></>,
  school: <><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10v6c0 1.6 2.7 3 6 3s6-1.4 6-3v-6"/></>,
  students: <><circle cx="9" cy="8" r="3.5"/><path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 15.5c1-.3 1.6-.5 2.5-.5 2.5 0 4.5 1.8 4.5 4.5"/></>,
  teacher: <><circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M16 9c2-.5 4-2 4-4"/></>,
  attendance: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/><path d="m9 14 2 2 4-4"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  exam: <><path d="M19 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11"/><path d="M6 17H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2"/><path d="M10 8h7M10 12h7M10 16h4"/></>,
  homework: <><path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v5h5M8 13h8M8 17h6"/></>,
  library: <><path d="M4 4v16a1 1 0 0 0 1 1h4V3H5a1 1 0 0 0-1 1z"/><path d="M9 3h6v18H9z"/><path d="m15 3 4 .9-3 17.1-4-.9"/></>,
  finance: <><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/><path d="M7 6V4h10v2"/></>,
  sports: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></>,
  transport: <><rect x="3" y="5" width="18" height="11" rx="2"/><path d="M3 11h18M7 5V3h10v2"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></>,
  hr: <><path d="M3 21v-1.5a4.5 4.5 0 0 1 4.5-4.5h9a4.5 4.5 0 0 1 4.5 4.5V21"/><circle cx="12" cy="8" r="4"/></>,
  announcement: <><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a8 8 0 0 1 0 14"/></>,
  chat: <path d="M21 12a8 8 0 0 1-12.5 6.6L4 20l1.4-4.5A8 8 0 1 1 21 12z"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12c0-.4 0-.8-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2L5 5.8l-2 3.4 2 1.6c-.1.4-.1.8-.1 1.2s0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  check: <path d="m4 12 5 5 11-12"/>,
  'arrow-right': <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 9l5-5 5 5M12 4v12"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 11l5 5 5-5M12 16V4"/></>,
  parent: <><circle cx="8" cy="6" r="3"/><circle cx="17" cy="7" r="2.5"/><path d="M2 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M14 17c.5-.4 1.7-1.3 3-1.3 2.5 0 4.5 2 4.5 4.3"/><circle cx="13" cy="13" r="2"/></>,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx('shrink-0', className)}
      aria-hidden
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export type { IconName };
