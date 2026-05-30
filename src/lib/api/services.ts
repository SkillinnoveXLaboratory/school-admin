/**
 * Service layer — mirrors the full Schoolmate API spec.
 * Each module corresponds to a tag in the OpenAPI doc.
 */
import { api, unwrap } from './client';
import { parseAuthTokens } from './tokenRefresh';
import type {
  ID,
  LoginCredentials,
  LoginResponse,
  PlatformKPIs,
  School,
} from './types';

/* ───────── Auth (school-scoped users) ───────── */
export const Auth = {
  login: async (creds: LoginCredentials): Promise<LoginResponse & { refreshToken: string | null }> => {
    const res = await api.post('/auth/login', creds);
    const body = res.data as Record<string, unknown>;
    const tokens = parseAuthTokens(body);
    const nested = body.data as Record<string, unknown> | undefined;
    const user = (nested?.user ?? body.user) as LoginResponse['user'];
    const token = tokens?.accessToken ?? (nested?.token as string) ?? (body.token as string);
    return {
      token,
      user,
      refreshToken: tokens?.refreshToken ?? null,
    };
  },
  refresh: () => unwrap<LoginResponse>(api.post('/auth/refresh')),
  me:      () => unwrap<LoginResponse['user']>(api.get('/auth/me')),
};

/* ───────── Module 1: Super Admin & Tenants ───────── */
export const SuperAdmin = {
  login: (creds: LoginCredentials) =>
    unwrap<LoginResponse>(api.post('/super-admin/auth/login', creds)),

  listSchools: (q?: { page?: number; limit?: number; search?: string; status?: string }) =>
    unwrap<School[]>(api.get('/super-admin/schools', { params: q })),

  getSchool: (id: ID) => unwrap<School>(api.get(`/super-admin/schools/${id}`)),

  createSchool: (data: Partial<School> & { name: string }) =>
    unwrap<School>(api.post('/super-admin/schools', data)),

  updateSchool: (id: ID, data: Partial<School>) =>
    unwrap<School>(api.put(`/super-admin/schools/${id}`, data)),

  deleteSchool: (id: ID) => unwrap<void>(api.delete(`/super-admin/schools/${id}`)),

  toggleSuspension: (id: ID) =>
    unwrap<School>(api.patch(`/super-admin/schools/${id}/suspend`)),

  overview: () => unwrap<PlatformKPIs>(api.get('/super-admin/analytics/overview')),
};

/* ───────── Module 2: Admissions ───────── */
export const Admissions = {
  apply: (data: Record<string, unknown>) => unwrap(api.post('/admissions/apply', data)),
  list: (q?: Record<string, unknown>) => unwrap(api.get('/admissions/applications', { params: q })),
  get: (id: ID) => unwrap(api.get(`/admissions/applications/${id}`)),
  uploadDoc: (id: ID, form: FormData) =>
    unwrap(api.post(`/admissions/applications/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })),
  verify: (id: ID) => unwrap(api.patch(`/admissions/applications/${id}/verify`)),
  approve: (id: ID) => unwrap(api.patch(`/admissions/applications/${id}/approve`)),
  enroll: (id: ID, body: Record<string, unknown>) =>
    unwrap(api.post(`/admissions/applications/${id}/enroll`, body)),
};

/* ───────── Module 3: Students ───────── */
export const Students = {
  list: (q?: { classId?: ID; sectionId?: ID; page?: number; limit?: number; q?: string }) =>
    unwrap(api.get('/students', { params: q })),
  get: (id: ID) => unwrap(api.get(`/students/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/students', body)),
  update: (id: ID, body: Record<string, unknown>) => unwrap(api.put(`/students/${id}`, body)),
  remove: (id: ID) => unwrap(api.delete(`/students/${id}`)),
  idCard: (id: ID) => unwrap(api.get(`/students/${id}/id-card`)),
  updateParent: (id: ID, body: Record<string, unknown>) =>
    unwrap(api.put(`/students/${id}/parent`, body)),
};

/* ───────── Module 4: Attendance ───────── */
export const Attendance = {
  record: (body: Record<string, unknown>) => unwrap(api.post('/attendance/record', body)),
  rfidScan: (body: Record<string, unknown>) =>
    unwrap(api.post('/attendance/biometric-RFID', body)),
  forStudent: (studentId: ID) => unwrap(api.get(`/attendance/student/${studentId}`)),
  forClass: (classId: ID) => unwrap(api.get(`/attendance/class/${classId}`)),
  reports: (q?: Record<string, unknown>) => unwrap(api.get('/attendance/reports', { params: q })),
  submitLeave: (body: Record<string, unknown>) => unwrap(api.post('/attendance/leaves', body)),
  listLeaves: (q?: Record<string, unknown>) => unwrap(api.get('/attendance/leaves', { params: q })),
  setLeaveStatus: (id: ID, body: { status: 'APPROVED' | 'REJECTED' }) =>
    unwrap(api.patch(`/attendance/leaves/${id}/status`, body)),
};

/* ───────── Module 5: Academics ───────── */
export const Academic = {
  classes: {
    list: () => unwrap(api.get('/classes')),
    create: (body: Record<string, unknown>) => unwrap(api.post('/classes', body)),
    addSection: (classId: ID, body: Record<string, unknown>) =>
      unwrap(api.post(`/classes/${classId}/sections`, body)),
  },
  subjects: {
    create: (body: Record<string, unknown>) => unwrap(api.post('/subjects', body)),
    linkToSection: (classId: ID, sectionId: ID, body: Record<string, unknown>) =>
      unwrap(api.post(`/classes/${classId}/sections/${sectionId}/subjects`, body)),
  },
  timetable: {
    addSlot: (body: Record<string, unknown>) => unwrap(api.post('/timetable/slots', body)),
    forSection: (classId: ID, sectionId: ID) =>
      unwrap(api.get(`/timetable/class/${classId}/section/${sectionId}`)),
  },
  homework: {
    publish: (body: Record<string, unknown>) => unwrap(api.post('/homework', body)),
    list: (q?: Record<string, unknown>) => unwrap(api.get('/homework', { params: q })),
    submit: (id: ID, form: FormData) =>
      unwrap(api.post(`/homework/${id}/submissions`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })),
    evaluate: (homeworkId: ID, submissionId: ID, body: Record<string, unknown>) =>
      unwrap(api.put(`/homework/${homeworkId}/submissions/${submissionId}/evaluate`, body)),
  },
  exams: {
    create: (body: Record<string, unknown>) => unwrap(api.post('/exams', body)),
    addSchedule: (examId: ID, body: Record<string, unknown>) =>
      unwrap(api.post(`/exams/${examId}/schedules`, body)),
    submitMarks: (scheduleId: ID, body: Record<string, unknown>) =>
      unwrap(api.post(`/exams/schedules/${scheduleId}/marks`, body)),
    reportCard: (studentId: ID) =>
      unwrap(api.get(`/exams/report-card/student/${studentId}`)),
  },
};

/* ───────── Module 6: Sports ───────── */
export const Sports = {
  list: () => unwrap(api.get('/sports')),
  get: (id: ID) => unwrap(api.get(`/sports/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/sports', body)),
  update: (id: ID, body: Record<string, unknown>) => unwrap(api.put(`/sports/${id}`, body)),
  remove: (id: ID) => unwrap(api.delete(`/sports/${id}`)),
  assign: (id: ID, body: { studentId: ID }) =>
    unwrap(api.post(`/sports/${id}/assign`, body)),
  unassign: (id: ID, body: { studentId: ID }) =>
    unwrap(api.post(`/sports/${id}/unassign`, body)),
};

/* ───────── Module 7: Communication ───────── */
export const Communication = {
  announcements: {
    create: (body: Record<string, unknown>) => unwrap(api.post('/announcements', body)),
    list: (q?: Record<string, unknown>) => unwrap(api.get('/announcements', { params: q })),
  },
  channels: {
    create: (body: Record<string, unknown>) =>
      unwrap(api.post('/communication/channels', body)),
    sendMessage: (channelId: ID, body: Record<string, unknown>) =>
      unwrap(api.post(`/communication/channels/${channelId}/messages`, body)),
    history: (channelId: ID, q?: Record<string, unknown>) =>
      unwrap(api.get(`/communication/channels/${channelId}/messages`, { params: q })),
  },
  schedulePTM: (body: Record<string, unknown>) =>
    unwrap(api.post('/communication/ptm', body)),
};

/* ───────── Module 8: Finance / Fees ───────── */
export const Fees = {
  structures: {
    list: () => unwrap(api.get('/fees/structures')),
    create: (body: Record<string, unknown>) => unwrap(api.post('/fees/structures', body)),
  },
  generateYearly: (body: Record<string, unknown>) =>
    unwrap(api.post('/fees/generate-yearly', body)),
  forStudent: (studentId: ID) => unwrap(api.get(`/fees/student/${studentId}`)),
  applyDiscount: (studentId: ID, body: Record<string, unknown>) =>
    unwrap(api.post(`/fees/student/${studentId}/discount`, body)),
  payCash: (studentId: ID, body: Record<string, unknown>) =>
    unwrap(api.post(`/fees/student/${studentId}/pay-cash`, body)),
  invoices: {
    list: (q?: Record<string, unknown>) => unwrap(api.get('/fees/invoices', { params: q })),
    get: (id: ID) => unwrap(api.get(`/fees/invoices/${id}`)),
  },
  dailyCashLedger: (q?: { date?: string }) =>
    unwrap(api.get('/fees/reports/daily-cash-ledger', { params: q })),
};

/* ───────── Module 9: HR ───────── */
export const HR = {
  employees: {
    list: () => unwrap(api.get('/hr/employees')),
    get: (id: ID) => unwrap(api.get(`/hr/employees/${id}`)),
    create: (body: Record<string, unknown>) => unwrap(api.post('/hr/employees', body)),
    update: (id: ID, body: Record<string, unknown>) =>
      unwrap(api.put(`/hr/employees/${id}`, body)),
  },
  payroll: {
    calculate: (body: Record<string, unknown>) =>
      unwrap(api.post('/hr/payroll/calculate', body)),
    pay: (id: ID) => unwrap(api.patch(`/hr/payroll/${id}/pay`)),
    history: (q?: Record<string, unknown>) =>
      unwrap(api.get('/hr/payroll/history', { params: q })),
  },
};

/* ───────── Module 10: Transport ───────── */
export const Transport = {
  routes: {
    list: () => unwrap(api.get('/transport/routes')),
    create: (body: Record<string, unknown>) => unwrap(api.post('/transport/routes', body)),
  },
  vehicles: { create: (body: Record<string, unknown>) => unwrap(api.post('/transport/vehicles', body)) },
  drivers:  { assign: (body: Record<string, unknown>) => unwrap(api.post('/transport/drivers', body)) },
  allocate: (body: Record<string, unknown>) => unwrap(api.post('/transport/allocations', body)),
  forStudent: (studentId: ID) =>
    unwrap(api.get(`/transport/allocations/student/${studentId}`)),
};

/* ───────── Module 11: Library ───────── */
export const Library = {
  books: {
    list: (q?: Record<string, unknown>) => unwrap(api.get('/library/books', { params: q })),
    create: (body: Record<string, unknown>) => unwrap(api.post('/library/books', body)),
    update: (id: ID, body: Record<string, unknown>) =>
      unwrap(api.put(`/library/books/${id}`, body)),
    remove: (id: ID) => unwrap(api.delete(`/library/books/${id}`)),
  },
  issue: (body: Record<string, unknown>) => unwrap(api.post('/library/issues', body)),
  return: (body: Record<string, unknown>) => unwrap(api.post('/library/returns', body)),
  fines: {
    list: (q?: Record<string, unknown>) => unwrap(api.get('/library/fines', { params: q })),
    pay: (id: ID) => unwrap(api.post(`/library/fines/${id}/pay`)),
  },
};

/* ───────── Module 12: Analytics ───────── */
export const Analytics = {
  schoolDashboard: () => unwrap(api.get('/analytics/school-dashboard')),
  studentPerformance: (id: ID) => unwrap(api.get(`/analytics/student-performance/${id}`)),
  teacherPerformance: (id: ID) => unwrap(api.get(`/analytics/teacher-performance/${id}`)),
};

/* ───────── Module 13: Data ───────── */
export const Data = {
  importStudents: (form: FormData) =>
    unwrap(api.post('/data/import/students', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })),
  exportStudents: () => unwrap(api.get('/data/export/students')),
  exportFinance:  () => unwrap(api.get('/data/export/finance')),
  backup:         () => unwrap(api.post('/data/system/backup')),
};

/* ───────── Module 14: Notifications ───────── */
export const Notifications = {
  registerFcm:   (body: { token: string; platform: 'web'|'ios'|'android' }) =>
    unwrap(api.post('/notifications/fcm-token', body)),
  deregisterFcm: (token: string) => unwrap(api.delete(`/notifications/fcm-token/${token}`)),
};
