import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { useAuthStore } from '@/lib/stores/auth';

interface NavItem {
  to: string;
  icon: IconName;
  label: string;
  group?: string;
}

const NAV: NavItem[] = [
  { to: '/', icon: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { to: '/admissions', icon: 'parent', label: 'Admissions', group: 'People' },
  { to: '/students', icon: 'students', label: 'Students', group: 'People' },
  { to: '/staff', icon: 'teacher', label: 'Staff & HR', group: 'People' },
  { to: '/classes', icon: 'school', label: 'Classes', group: 'Academics' },
  { to: '/timetable', icon: 'calendar', label: 'Timetable', group: 'Academics' },
  { to: '/attendance', icon: 'attendance', label: 'Attendance', group: 'Academics' },
  { to: '/homework', icon: 'homework', label: 'Homework', group: 'Academics' },
  { to: '/exams', icon: 'exam', label: 'Exams & Marks', group: 'Academics' },
  { to: '/fees', icon: 'finance', label: 'Fees & Cash', group: 'Operations' },
  { to: '/library', icon: 'library', label: 'Library', group: 'Operations' },
  { to: '/transport', icon: 'transport', label: 'Transport', group: 'Operations' },
  { to: '/sports', icon: 'sports', label: 'Sports', group: 'Operations' },
  { to: '/announcements', icon: 'announcement', label: 'Announcements', group: 'Communication' },
  { to: '/analytics', icon: 'dashboard', label: 'Analytics', group: 'Insights' },
  { to: '/settings', icon: 'settings', label: 'Settings', group: 'You' },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groups = useMemo(
    () =>
      NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
        const key = item.group ?? 'Other';
        (acc[key] ??= []).push(item);
        return acc;
      }, {}),
    [],
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-canvas lg:h-screen lg:overflow-hidden lg:grid lg:[grid-template-columns:264px_1fr]">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          'fixed inset-y-0 z-50 w-[88vw] max-w-[300px] border-r border-line bg-surface flex flex-col shadow-2xl transition-[left] duration-300 ease-out lg:static lg:z-auto lg:w-auto lg:max-w-none lg:h-full lg:overflow-hidden lg:shadow-none',
          sidebarOpen ? 'left-0' : '-left-[100vw] lg:left-0',
        )}
      >
        <div className="px-5 h-16 flex items-center justify-between border-b border-line">
          <Logo />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden h-9 w-9 grid place-items-center rounded-xl hover:bg-muted"
            aria-label="Close menu"
          >
            <Icon name="arrow-right" size={16} />
          </button>
        </div>

        <nav className="flex-1 py-3 px-3 overflow-y-auto min-h-0">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-3">
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-300">
                {group}
              </div>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all duration-150 ease-standard',
                      isActive ? 'text-brand-700 bg-brand-50' : 'text-ink-500 hover:text-ink-900 hover:bg-muted',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="active-pill"
                          className="absolute inset-0 rounded-xl bg-brand-50 -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon name={item.icon} size={17} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-line">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <Icon name="logout" size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-col min-w-0 lg:h-full lg:min-h-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-muted shrink-0"
              aria-label="Open menu"
            >
              <Icon name="dashboard" size={18} />
            </button>

            <div className="relative max-w-md w-full hidden sm:block">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input placeholder="Search students, staff, invoices…" className="input pl-9 h-10" />
            </div>

            <div className="sm:hidden flex-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-semibold">Schoolmate</div>
              <div className="text-sm font-semibold text-ink-900">Admin console</div>
            </div>

            <div className="flex-1" />

            <button className="relative h-10 w-10 grid place-items-center rounded-xl hover:bg-muted transition-colors">
              <Icon name="bell" size={18} className="text-ink-500" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger" />
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-line">
              <div className="text-right hidden md:block">
                <div className="text-[13px] font-semibold text-ink-900 leading-tight">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-[11px] text-ink-400 uppercase tracking-wider">
                  {user?.role.replace('_', ' ')}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-brand-gradient text-white grid place-items-center font-semibold text-sm shadow-pop-30">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 lg:min-h-0 lg:overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
              className="px-4 py-4 sm:px-6 sm:py-6 lg:p-8 max-w-[1400px] mx-auto w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
