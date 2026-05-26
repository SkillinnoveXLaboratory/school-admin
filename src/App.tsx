import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/stores/auth';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { StudentsPage } from '@/pages/Students';
import { AdmissionsPage } from '@/pages/Admissions';
import { StaffPage } from '@/pages/Staff';
import { ClassesPage } from '@/pages/Classes';
import { TimetablePage } from '@/pages/Timetable';
import { AttendancePage } from '@/pages/Attendance';
import { HomeworkPage } from '@/pages/Homework';
import { ExamsPage } from '@/pages/Exams';
import { FeesPage } from '@/pages/Fees';
import { LibraryPage } from '@/pages/Library';
import { TransportPage } from '@/pages/Transport';
import { SportsPage } from '@/pages/Sports';
import { AnnouncementsPage } from '@/pages/Announcements';
import { AnalyticsPage } from '@/pages/Analytics';
import { SettingsPage } from '@/pages/Settings';

function Protected({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.token);
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><AppShell /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="admissions"    element={<AdmissionsPage />} />
        <Route path="students"      element={<StudentsPage />} />
        <Route path="staff"         element={<StaffPage />} />
        <Route path="classes"       element={<ClassesPage />} />
        <Route path="timetable"     element={<TimetablePage />} />
        <Route path="attendance"    element={<AttendancePage />} />
        <Route path="homework"      element={<HomeworkPage />} />
        <Route path="exams"         element={<ExamsPage />} />
        <Route path="fees"          element={<FeesPage />} />
        <Route path="library"       element={<LibraryPage />} />
        <Route path="transport"     element={<TransportPage />} />
        <Route path="sports"        element={<SportsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="analytics"     element={<AnalyticsPage />} />
        <Route path="settings"      element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
