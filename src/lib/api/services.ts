/**
 * Service layer — mirrors the full Schoolmate API spec.
 * Each module corresponds to a tag in the OpenAPI doc.
 */
import { api, unwrap } from './client';
import { parseAuthTokens } from './client';
import type {
  AdmissionActionResponse,
  AdmissionApplyInput,
  AdmissionApplyResponse,
  AdmissionApplication,
  AdmissionDocument,
  AdmissionEnrollResponse,
  AdmissionListResponse,
  AdmissionUploadResponse,
  ID,
  AcademicClass,
  AcademicClassListResponse,
  AcademicClassMutationResponse,
  AcademicSubject,
  AcademicSubjectListResponse,
  AcademicSubjectLinkResponse,
  AcademicSubjectMutationResponse,
  HREmployee,
  HREmployeeListResponse,
  HREmployeeMutationResponse,
  HRPayrollActionResponse,
  HRPayrollHistoryResponse,
  HRPayrollRecord,
  LoginCredentials,
  LoginResponse,
  PaginatedStudentsResponse,
  StudentProfileUpdate,
  StudentParentUpdate,
  Student,
  StudentIdCard,
  PlatformKPIs,
  School,
} from './types';

type RawStudent = Record<string, unknown>;
type RawClass = Record<string, unknown>;
type RawSection = Record<string, unknown>;
type RawSubject = Record<string, unknown>;
type RawEmployee = Record<string, unknown>;
type RawPayroll = Record<string, unknown>;

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function normalizeLoginUser(raw: unknown): LoginResponse['user'] {
  const user = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const phone = firstString(user.phone, user.phoneNumber, user.mobile, user.contactPhone, user.contact_phone);

  return {
    id: firstString(user.id, user._id),
    username: firstString(user.username, user.userName, user.email),
    firstName: firstString(user.firstName, user.first_name),
    lastName: firstString(user.lastName, user.last_name),
    email: firstString(user.email),
    phone: phone || '',
    role: firstString(user.role).toUpperCase() as LoginResponse['user']['role'],
    schoolId: firstString(user.schoolId, user.school_id) || null,
    status: (firstString(user.status).toUpperCase() || 'ACTIVE') as LoginResponse['user']['status'],
  };
}

function normalizeStudent(raw: RawStudent): Student {
  const parent = (raw.parentContact ?? raw.parent_contact ?? {}) as Record<string, unknown>;
  return {
    id: firstString(raw.id, raw._id),
    enrollmentNumber: firstString(raw.enrollmentNumber, raw.enrollment_number),
    firstName: firstString(raw.firstName, raw.first_name),
    lastName: firstString(raw.lastName, raw.last_name),
    email: firstString(raw.email) || undefined,
    dateOfBirth: firstString(raw.dateOfBirth, raw.date_of_birth),
    gender: (firstString(raw.gender).toUpperCase() || 'OTHER') as Student['gender'],
    photoUrl: firstString(raw.photoUrl, raw.photo_url) || undefined,
    schoolId: firstString(raw.schoolId, raw.school_id),
    classId: firstString(raw.classId, raw.class_id),
    sectionId: firstString(raw.sectionId, raw.section_id),
    parentContact: {
      fatherName: firstString(parent.fatherName, parent.father_name) || undefined,
      motherName: firstString(parent.motherName, parent.mother_name) || undefined,
      primaryPhone: firstString(parent.primaryPhone, parent.primary_phone),
      email: firstString(parent.email) || undefined,
      homeAddress: firstString(parent.homeAddress, parent.home_address),
    },
    emergencyContact: firstString(raw.emergencyContact, raw.emergency_contact),
    status: (firstString(raw.status).toUpperCase() || 'INACTIVE') as Student['status'],
  };
}

function normalizeAdmissionDocument(raw: RawStudent): AdmissionDocument {
  return {
    documentType: firstString(raw.documentType, raw.type, raw.name),
    url: firstString(raw.url, raw.fileUrl, raw.file_url, raw.documentUrl, raw.document_url),
    filename: firstString(raw.filename) || undefined,
  };
}

function normalizeAcademicSection(raw: RawSection): AcademicClass['sections'][number] {
  return {
    id: firstString(raw.id, raw._id),
    sectionName: firstString(raw.sectionName, raw.section_name) || undefined,
    name: firstString(raw.name, raw.sectionName, raw.section_name),
    roomNumber: firstString(raw.roomNumber, raw.room_number) || undefined,
    classTeacherId: firstString(raw.classTeacherId, raw.class_teacher_id) || undefined,
    subjects: Array.isArray(raw.subjects)
      ? raw.subjects.map((subject) => ({
          subjectId: firstString((subject as RawSection).subjectId, (subject as RawSection).subject_id),
          teacherId: firstString((subject as RawSection).teacherId, (subject as RawSection).teacher_id) || undefined,
        }))
      : [],
  };
}

function normalizeAcademicClass(raw: RawClass): AcademicClass {
  const sections = Array.isArray(raw.sections) ? raw.sections.map((section) => normalizeAcademicSection(section as RawSection)) : [];
  return {
    id: firstString(raw.id, raw._id),
    name: firstString(raw.name, raw.className, raw.class_name),
    numericLevel: typeof raw.numericLevel === 'number' ? raw.numericLevel : typeof raw.numeric_level === 'number' ? raw.numeric_level : undefined,
    schoolId: firstString(raw.schoolId, raw.school_id) || undefined,
    sections,
    createdAt: firstString(raw.createdAt, raw.created_at) || undefined,
    updatedAt: firstString(raw.updatedAt, raw.updated_at) || undefined,
    __v: typeof raw.__v === 'number' ? raw.__v : undefined,
  };
}

function normalizeAcademicSubject(raw: RawSubject): AcademicSubject {
  return {
    id: firstString(raw.id, raw._id),
    subjectName: firstString(raw.subjectName, raw.name),
    subjectCode: firstString(raw.subjectCode, raw.code, raw.subject_code),
  };
}

function normalizeEmployee(raw: RawEmployee): HREmployee {
  const user = (raw.userId ?? raw.user ?? {}) as RawEmployee;
  return {
    id: firstString(raw.id, raw._id),
    schoolId: firstString(raw.schoolId, raw.school_id),
    userId: firstString(raw.userId as unknown as string, user._id) || undefined,
    username: firstString(raw.username, user.username) || undefined,
    employeeId: firstString(raw.employeeId, raw.employee_id) || undefined,
    email: firstString(raw.email, user.email),
    firstName: firstString(raw.firstName, user.firstName),
    lastName: firstString(raw.lastName, user.lastName),
    phone: firstString(raw.phone, user.phone) || undefined,
    department: firstString(raw.department, raw.departmentName, user.department) || undefined,
    role: firstString(raw.role, user.role),
    baseSalary: typeof raw.baseSalary === 'number' ? raw.baseSalary : undefined,
    qualifications: Array.isArray(raw.qualifications) ? raw.qualifications.map((q) => String(q)) : [],
    status: firstString(raw.status, user.status),
    joiningDate: firstString(raw.joiningDate, raw.join_date) || undefined,
    createdAt: firstString(raw.createdAt, raw.created_at) || undefined,
    updatedAt: firstString(raw.updatedAt, raw.updated_at) || undefined,
  };
}

function normalizePayrollRecord(raw: RawPayroll): HRPayrollRecord {
  return {
    id: firstString(raw.id, raw._id),
    employeeId: firstString(raw.employeeId, raw.employee_id) || undefined,
    month: typeof raw.month === 'number' ? raw.month : undefined,
    year: typeof raw.year === 'number' ? raw.year : undefined,
    status: firstString(raw.status) || undefined,
    netSalary: typeof raw.netSalary === 'number' ? raw.netSalary : undefined,
    grossSalary: typeof raw.grossSalary === 'number' ? raw.grossSalary : undefined,
    disbursedAt: firstString(raw.disbursedAt) || undefined,
    createdAt: firstString(raw.createdAt) || undefined,
    updatedAt: firstString(raw.updatedAt) || undefined,
  };
}

function normalizeAdmission(raw: RawStudent): AdmissionApplication {
  const parent = (raw.parentContact ?? raw.parent_contact ?? {}) as Record<string, unknown>;
  const docs = Array.isArray(raw.documents)
    ? raw.documents.map((doc) => normalizeAdmissionDocument(doc as RawStudent))
    : [];
  return {
    id: firstString(raw.id, raw._id),
    schoolId: firstString(raw.schoolId, raw.school_id),
    firstName: firstString(raw.firstName, raw.first_name),
    lastName: firstString(raw.lastName, raw.last_name),
    gender: (firstString(raw.gender).toUpperCase() || 'OTHER') as AdmissionApplication['gender'],
    dateOfBirth: firstString(raw.dateOfBirth, raw.date_of_birth),
    emergencyContact: firstString(raw.emergencyContact, raw.emergency_contact),
    status: (firstString(raw.status).toUpperCase() || 'APPLIED') as AdmissionApplication['status'],
    parentContact: {
      fatherName: firstString(parent.fatherName, parent.father_name) || undefined,
      motherName: firstString(parent.motherName, parent.mother_name) || undefined,
      primaryPhone: firstString(parent.primaryPhone, parent.primary_phone) || undefined,
      homeAddress: firstString(parent.homeAddress, parent.home_address) || undefined,
    },
    documents: docs,
    photoUrl: firstString(raw.photoUrl, raw.photo_url) || undefined,
    createdAt: firstString(raw.createdAt, raw.created_at) || undefined,
    updatedAt: firstString(raw.updatedAt, raw.updated_at) || undefined,
    enrollmentNumber: firstString(raw.enrollmentNumber, raw.enrollment_number) || undefined,
  };
}

/* ───────── Auth (school-scoped users) ───────── */
export const Auth = {
  login: async (creds: LoginCredentials): Promise<LoginResponse & { refreshToken: string | null }> => {
    const res = await api.post('/auth/login', creds);
    const body = res.data as Record<string, unknown>;
    const tokens = parseAuthTokens(body);
    const nested = body.data as Record<string, unknown> | undefined;
    const user = normalizeLoginUser(nested?.user ?? nested?.admin ?? body.user ?? body.admin);
    const token =
      tokens?.accessToken ??
      (nested?.accessToken as string) ??
      (nested?.token as string) ??
      (body.accessToken as string) ??
      (body.token as string);
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
  apply: async (data: AdmissionApplyInput): Promise<AdmissionApplyResponse> => {
    const res = await api.post('/admissions/apply', data);
    const body = res.data as Record<string, unknown>;
    return {
      success: body.success as boolean | undefined,
      message: firstString(body.message) || undefined,
      applicationId: firstString(body.applicationId, (body.application as Record<string, unknown> | undefined)?._id),
      status: (firstString(body.status).toUpperCase() || undefined) as AdmissionApplyResponse['status'],
      application: body.application ? normalizeAdmission(body.application as RawStudent) : undefined,
    };
  },
  list: async (q?: { status?: string; page?: number; limit?: number }): Promise<AdmissionListResponse> => {
    const res = await api.get('/admissions/applications', { params: q });
    const body = res.data as Record<string, unknown>;
    const items = Array.isArray(body.data)
      ? body.data
      : Array.isArray(body.applications)
        ? body.applications
        : [];
    const applications = items.map((item) => normalizeAdmission(item as RawStudent));
    const metaBody = (body.meta as Record<string, unknown> | undefined) ?? {};
    return {
      applications,
      meta: {
        total: typeof metaBody.total === 'number' ? metaBody.total : applications.length,
        page: typeof metaBody.page === 'number' ? metaBody.page : (q?.page ?? 1),
        limit: typeof metaBody.limit === 'number' ? metaBody.limit : (q?.limit ?? 50),
        pages: typeof metaBody.totalPages === 'number'
          ? metaBody.totalPages
          : typeof metaBody.pages === 'number'
            ? metaBody.pages
            : 1,
      },
    };
  },
  get: async (id: ID): Promise<AdmissionApplication> => {
    const res = await api.get(`/admissions/applications/${id}`);
    const body = res.data as Record<string, unknown>;
    const item = (body.data ?? body.application ?? body) as RawStudent;
    return normalizeAdmission(item);
  },
  uploadDoc: async (id: ID, form: FormData): Promise<AdmissionUploadResponse> => {
    const res = await api.post(`/admissions/applications/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const body = res.data as Record<string, unknown>;
    const doc = (body.document ?? body.data) as RawStudent | undefined;
    return {
      success: body.success as boolean | undefined,
      message: firstString(body.message) || undefined,
      documentUrl: firstString(body.documentUrl, body.document_url, doc?.url) || undefined,
      document: doc ? normalizeAdmissionDocument(doc) : undefined,
    };
  },
  verify: async (id: ID): Promise<AdmissionActionResponse> => {
    const res = await api.patch(`/admissions/applications/${id}/verify`);
    const body = res.data as Record<string, unknown>;
    return {
      success: body.success as boolean | undefined,
      message: firstString(body.message) || undefined,
      status: (firstString(body.status).toUpperCase() || undefined) as AdmissionActionResponse['status'],
      application: body.application ? normalizeAdmission(body.application as RawStudent) : undefined,
    };
  },
  approve: async (id: ID): Promise<AdmissionActionResponse> => {
    const res = await api.patch(`/admissions/applications/${id}/approve`);
    const body = res.data as Record<string, unknown>;
    return {
      success: body.success as boolean | undefined,
      message: firstString(body.message) || undefined,
      status: (firstString(body.status).toUpperCase() || undefined) as AdmissionActionResponse['status'],
      application: body.application ? normalizeAdmission(body.application as RawStudent) : undefined,
    };
  },
  enroll: async (id: ID, body: Record<string, unknown>): Promise<AdmissionEnrollResponse> => {
    const res = await api.post(`/admissions/applications/${id}/enroll`, body);
    const data = res.data as Record<string, unknown>;
    const student = (data.student as Record<string, unknown> | undefined) ?? undefined;
    return {
      success: data.success as boolean | undefined,
      message: firstString(data.message) || undefined,
      enrollmentNumber: firstString(data.enrollmentNumber, student?._id, student?.enrollmentNumber),
      studentId: firstString(data.studentId, student?._id, student?.id),
      student: student ? normalizeStudent(student as RawStudent) : undefined,
      userCredentials: (data.userCredentials as AdmissionEnrollResponse['userCredentials']) ?? undefined,
      parentCredentials: (data.parentCredentials as AdmissionEnrollResponse['parentCredentials']) ?? undefined,
    };
  },
};

/* ───────── Module 3: Students ───────── */
export const Students = {
  list: async (q?: { classId?: ID; sectionId?: ID; page?: number; limit?: number; q?: string }): Promise<PaginatedStudentsResponse> => {
    const res = await api.get('/students', { params: q });
    const body = res.data as Record<string, unknown>;
    const roster = Array.isArray(body.data)
      ? body.data
      : Array.isArray(body.students)
        ? body.students
        : [];
    const students = roster.map((s) => normalizeStudent(s as RawStudent));
    const rawMeta = body.meta as Record<string, unknown> | undefined;
    const meta = {
      total: students.length,
      page: q?.page ?? 1,
      limit: q?.limit ?? 50,
      pages: 1,
      ...(typeof rawMeta?.total === 'number' ? { total: rawMeta.total } : {}),
      ...(typeof rawMeta?.page === 'number' ? { page: rawMeta.page } : {}),
      ...(typeof rawMeta?.limit === 'number' ? { limit: rawMeta.limit } : {}),
      ...(typeof rawMeta?.totalPages === 'number'
        ? { pages: rawMeta.totalPages }
        : typeof rawMeta?.pages === 'number'
          ? { pages: rawMeta.pages }
          : {}),
    };
    return { students, meta };
  },
  get: async (id: ID) => normalizeStudent(await unwrap<RawStudent>(api.get(`/students/${id}`))),
  create: (body: Record<string, unknown>) => unwrap(api.post('/students', body)),
  update: async (id: ID, body: StudentProfileUpdate): Promise<Student | undefined> => {
    const res = await api.put(`/students/${id}`, body);
    const payload = res.data as Record<string, unknown>;
    if (payload.success === false) {
      throw new Error(typeof payload.message === 'string' ? payload.message : 'API error');
    }

    const candidate = payload.data ?? payload.student ?? payload.result ?? payload.payload;
    if (candidate && typeof candidate === 'object') {
      return normalizeStudent(candidate as RawStudent);
    }

    return undefined;
  },
  remove: (id: ID) => unwrap(api.delete(`/students/${id}`)),
  idCard: async (id: ID): Promise<StudentIdCard> => {
    const res = await api.get(`/students/${id}/id-card`);
    const body = res.data as Record<string, unknown>;
    const data = (body.data as Record<string, unknown> | undefined) ?? body;
    return {
      name: firstString(data.name),
      enrollmentNumber: firstString(data.enrollmentNumber, data.enrollment_number),
      className: firstString(data.className, data.class_name),
      photoUrl: firstString(data.photoUrl, data.photo_url) || undefined,
      qrCodeData: firstString(data.qrCodeData, data.qr_code_data),
    };
  },
  updateParent: async (id: ID, body: StudentParentUpdate): Promise<Student | undefined> => {
    const res = await api.put(`/students/${id}/parent`, body);
    const payload = res.data as Record<string, unknown>;
    if (payload.success === false) {
      throw new Error(typeof payload.message === 'string' ? payload.message : 'API error');
    }

    const candidate = payload.student ?? payload.data ?? payload.result ?? payload.payload;
    if (candidate && typeof candidate === 'object') {
      return normalizeStudent(candidate as RawStudent);
    }

    return undefined;
  },
};

/* ───────── Module 4: Attendance ───────── */
export const Attendance = {
  record: async (body: Record<string, unknown>) => (await api.post('/attendance/record', body)).data,
  rfidScan: (body: Record<string, unknown>) =>
    api.post('/attendance/biometric-RFID', body).then((res) => res.data),
  forStudent: (studentId: ID, q?: Record<string, unknown>) =>
    api.get(`/attendance/student/${studentId}`, { params: q }).then((res) => res.data),
  forClass: (classId: ID, q?: Record<string, unknown>) =>
    api.get(`/attendance/class/${classId}`, { params: q }).then((res) => res.data),
  reports: (q?: Record<string, unknown>) => api.get('/attendance/reports', { params: q }).then((res) => res.data),
  submitLeave: (body: Record<string, unknown>) => api.post('/attendance/leaves', body).then((res) => res.data),
  listLeaves: (q?: Record<string, unknown>) => api.get('/attendance/leaves', { params: q }).then((res) => res.data),
  setLeaveStatus: (id: ID, body: { status: 'APPROVED' | 'REJECTED'; remarks?: string }) =>
    api.patch(`/attendance/leaves/${id}/status`, body).then((res) => res.data),
};

/* ───────── Module 5: Academics ───────── */
export const Academic = {
  classes: {
    list: async (): Promise<AcademicClassListResponse> => {
      const res = await api.get('/classes');
      const body = res.data as Record<string, unknown>;
      const items = Array.isArray(body.classes)
        ? body.classes
        : Array.isArray(body.data)
          ? body.data
          : [];
      return { classes: items.map((item) => normalizeAcademicClass(item as RawClass)) };
    },
    create: async (body: { className: string }): Promise<AcademicClassMutationResponse> => {
      const res = await api.post('/classes', body);
      const data = res.data as Record<string, unknown>;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        class: data.class ? normalizeAcademicClass(data.class as RawClass) : undefined,
      };
    },
    addSection: async (classId: ID, body: { sectionName: string; classTeacherId?: ID }): Promise<AcademicClassMutationResponse> => {
      const res = await api.post(`/classes/${classId}/sections`, body);
      const data = res.data as Record<string, unknown>;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        class: data.class ? normalizeAcademicClass(data.class as RawClass) : undefined,
      };
    },
  },
  subjects: {
    list: async (): Promise<AcademicSubjectListResponse> => {
      const res = await api.get('/subjects');
      const data = res.data as Record<string, unknown>;
      const items = Array.isArray(data.subjects)
        ? data.subjects
        : Array.isArray(data.data)
          ? data.data
          : [];
      return {
        subjects: items.map((item) => normalizeAcademicSubject(item as RawSubject)),
      };
    },
    get: async (id: ID): Promise<AcademicSubjectMutationResponse> => {
      const res = await api.get(`/subjects/${id}`);
      const data = res.data as Record<string, unknown>;
      const subject = (data.subject ?? data.data) as RawSubject | undefined;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        data: subject ? normalizeAcademicSubject(subject) : undefined,
        subject: subject ? normalizeAcademicSubject(subject) : undefined,
      };
    },
    create: async (body: { subjectName: string; subjectCode: string }): Promise<AcademicSubjectMutationResponse> => {
      const res = await api.post('/subjects', body);
      const data = res.data as Record<string, unknown>;
      const subject = (data.data ?? data.subject) as RawSubject | undefined;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        data: subject ? normalizeAcademicSubject(subject) : undefined,
        subject: subject ? normalizeAcademicSubject(subject) : undefined,
      };
    },
    linkToSection: async (
      classId: ID,
      sectionId: ID,
      body: { subjectId: ID; teacherId: ID },
    ): Promise<AcademicSubjectLinkResponse> => {
      const res = await api.post(`/classes/${classId}/sections/${sectionId}/subjects`, body);
      const data = res.data as Record<string, unknown>;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
      };
    },
  },
  timetable: {
    addSlot: (body: Record<string, unknown>) => api.post('/timetable/slots', body).then((res) => res.data),
    forSection: (classId: ID, sectionId: ID) =>
      api.get(`/timetable/class/${classId}/section/${sectionId}`).then((res) => res.data),
  },
  homework: {
    publish: (body: Record<string, unknown>) => api.post('/homework', body).then((res) => res.data),
    list: (q?: Record<string, unknown>) => api.get('/homework', { params: q }).then((res) => res.data),
    submit: (id: ID, form: FormData) =>
      api.post(`/homework/${id}/submissions`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((res) => res.data),
    evaluate: (homeworkId: ID, submissionId: ID, body: Record<string, unknown>) =>
      api.put(`/homework/${homeworkId}/submissions/${submissionId}/evaluate`, body).then((res) => res.data),
  },
  exams: {
    list: () => api.get('/exams').then((res) => res.data),
    create: (body: Record<string, unknown>) => api.post('/exams', body).then((res) => res.data),
    addSchedule: (examId: ID, body: Record<string, unknown>) =>
      api.post(`/exams/${examId}/schedules`, body).then((res) => res.data),
    submitMarks: (scheduleId: ID, body: Record<string, unknown>) =>
      api.post(`/exams/schedules/${scheduleId}/marks`, body).then((res) => res.data),
    reportCard: (studentId: ID) =>
      api.get(`/exams/report-card/student/${studentId}`).then((res) => res.data),
  },
};

/* ───────── Module 6: Sports ───────── */
export const Sports = {
  list: (q?: Record<string, unknown>) => api.get('/sports', { params: q }).then((res) => res.data),
  get: (id: ID) => api.get(`/sports/${id}`).then((res) => res.data),
  create: (body: Record<string, unknown>) => api.post('/sports', body).then((res) => res.data),
  update: (id: ID, body: Record<string, unknown>) => api.put(`/sports/${id}`, body).then((res) => res.data),
  remove: (id: ID) => api.delete(`/sports/${id}`).then((res) => res.data),
  assign: (id: ID, body: { studentIds: ID[] }) =>
    api.post(`/sports/${id}/assign`, body).then((res) => res.data),
  unassign: (id: ID, body: { studentIds: ID[] }) =>
    api.post(`/sports/${id}/unassign`, body).then((res) => res.data),
};

/* ───────── Module 7: Communication ───────── */
export const Communication = {
  announcements: {
    create: (body: Record<string, unknown>) => api.post('/announcements', body).then((res) => res.data),
    list: (q?: Record<string, unknown>) => api.get('/announcements', { params: q }).then((res) => res.data),
  },
  channels: {
    create: (body: Record<string, unknown>) =>
      api.post('/communication/channels', body).then((res) => res.data),
    sendMessage: (channelId: ID, body: Record<string, unknown>) =>
      api.post(`/communication/channels/${channelId}/messages`, body).then((res) => res.data),
    history: (channelId: ID, q?: Record<string, unknown>) =>
      api.get(`/communication/channels/${channelId}/messages`, { params: q }).then((res) => res.data),
  },
  meetings: {
    list: (q?: Record<string, unknown>) =>
      api.get('/communication/meetings', { params: q }).then((res) => res.data),
    schedule: (body: Record<string, unknown>) =>
      api.post('/communication/meetings/schedule', body).then((res) => res.data),
  },
  schedulePTM: (body: Record<string, unknown>) =>
    api.post('/communication/meetings/schedule', body).then((res) => res.data),
};

/* ───────── Module 8: Finance / Fees ───────── */
export const Fees = {
  structures: {
    list: () => api.get('/fees/structures').then((res) => res.data),
    create: (body: Record<string, unknown>) => api.post('/fees/structures', body).then((res) => res.data),
  },
  generateYearly: (body: Record<string, unknown>) =>
    api.post('/fees/generate-yearly', body).then((res) => res.data),
  forStudent: (studentId: ID) => api.get(`/fees/student/${studentId}`).then((res) => res.data),
  applyDiscount: (studentId: ID, body: Record<string, unknown>) =>
    api.post(`/fees/student/${studentId}/discount`, body).then((res) => res.data),
  payCash: (studentId: ID, body: Record<string, unknown>) =>
    api.post(`/fees/student/${studentId}/pay-cash`, body).then((res) => res.data),
  invoices: {
    list: (q?: Record<string, unknown>) => api.get('/fees/invoices', { params: q }).then((res) => res.data),
    get: (id: ID) => api.get(`/fees/invoices/${id}`).then((res) => res.data),
  },
  dailyCashLedger: (q?: { date?: string }) =>
    api.get('/fees/reports/daily-cash-ledger', { params: q }).then((res) => res.data),
};

/* ───────── Module 9: HR ───────── */
export const HR = {
  employees: {
    list: async (q?: { role?: string; page?: number; limit?: number }): Promise<HREmployeeListResponse> => {
      const res = await api.get('/hr/employees', { params: q });
      const data = res.data as Record<string, unknown>;
      const items = Array.isArray(data.employees)
        ? data.employees
        : Array.isArray(data.data)
          ? data.data
          : [];
      const metaBody = (data.meta as Record<string, unknown> | undefined) ?? {};
      return {
        employees: items.map((item) => normalizeEmployee(item as RawEmployee)),
        meta: {
          total: typeof metaBody.total === 'number' ? metaBody.total : items.length,
          page: typeof metaBody.page === 'number' ? metaBody.page : (q?.page ?? 1),
          limit: typeof metaBody.limit === 'number' ? metaBody.limit : (q?.limit ?? 50),
          pages: typeof metaBody.pages === 'number'
            ? metaBody.pages
            : typeof metaBody.totalPages === 'number'
              ? metaBody.totalPages
              : 1,
        },
      };
    },
    get: async (id: ID): Promise<HREmployee | undefined> => {
      const res = await api.get(`/hr/employees/${id}`);
      const data = res.data as Record<string, unknown>;
      const candidate = (data.employee ?? data.data ?? data.user ?? null) as RawEmployee | null;
      return candidate ? normalizeEmployee(candidate) : undefined;
    },
    create: async (body: {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      baseSalary: number;
      phone?: string;
      department?: string;
      qualifications?: string[];
    }): Promise<HREmployeeMutationResponse> => {
      const res = await api.post('/hr/employees', body);
      const data = res.data as Record<string, unknown>;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        employee: data.employee ? normalizeEmployee(data.employee as RawEmployee) : undefined,
      };
    },
    update: async (id: ID, body: {
      firstName?: string;
      lastName?: string;
      role?: string;
      baseSalary?: number;
      phone?: string;
      department?: string;
      qualifications?: string[];
    }): Promise<HREmployeeMutationResponse> => {
      const res = await api.put(`/hr/employees/${id}`, body);
      const data = res.data as Record<string, unknown>;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        employee: data.employee ? normalizeEmployee(data.employee as RawEmployee) : undefined,
      };
    },
  },
  payroll: {
    calculate: async (body: { month: number; year: number }): Promise<HRPayrollActionResponse> => {
      const res = await api.post('/hr/payroll/calculate', body);
      const data = res.data as Record<string, unknown>;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        summary: (data.summary as HRPayrollActionResponse['summary']) ?? undefined,
      };
    },
    pay: async (id: ID): Promise<HRPayrollActionResponse> => {
      const res = await api.patch(`/hr/payroll/${id}/pay`);
      const data = res.data as Record<string, unknown>;
      return {
        success: data.success as boolean | undefined,
        message: firstString(data.message) || undefined,
        status: firstString(data.status) || undefined,
        disbursedAt: firstString(data.disbursedAt) || undefined,
      };
    },
    history: async (q?: { page?: number; limit?: number }): Promise<HRPayrollHistoryResponse> => {
      const res = await api.get('/hr/payroll/history', { params: q });
      const data = res.data as Record<string, unknown>;
      const items = Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.data)
          ? data.data
          : [];
      const metaBody = (data.meta as Record<string, unknown> | undefined) ?? {};
      return {
        history: items.map((item) => normalizePayrollRecord(item as RawPayroll)),
        meta: {
          total: typeof metaBody.total === 'number' ? metaBody.total : items.length,
          page: typeof metaBody.page === 'number' ? metaBody.page : (q?.page ?? 1),
          limit: typeof metaBody.limit === 'number' ? metaBody.limit : (q?.limit ?? 50),
          pages: typeof metaBody.pages === 'number'
            ? metaBody.pages
            : typeof metaBody.totalPages === 'number'
              ? metaBody.totalPages
              : 1,
        },
      };
    },
  },
};

/* ───────── Module 10: Transport ───────── */
export const Transport = {
  routes: {
    list: (q?: Record<string, unknown>) => api.get('/transport/routes', { params: q }).then((res) => res.data),
    create: (body: Record<string, unknown>) => api.post('/transport/routes', body).then((res) => res.data),
  },
  vehicles: {
    list: () => api.get('/transport/vehicles').then((res) => res.data),
    create: (body: Record<string, unknown>) => api.post('/transport/vehicles', body).then((res) => res.data),
  },
  drivers: {
    list: () => api.get('/transport/drivers').then((res) => res.data),
    assign: (body: Record<string, unknown>) => api.post('/transport/drivers', body).then((res) => res.data),
  },
  allocate: (body: Record<string, unknown>) => api.post('/transport/allocations', body).then((res) => res.data),
  forStudent: (studentId: ID) =>
    api.get(`/transport/allocations/student/${studentId}`).then((res) => res.data),
};

/* ───────── Module 11: Library ───────── */
export const Library = {
  books: {
    list: (q?: Record<string, unknown>) => api.get('/library/books', { params: q }).then((res) => res.data),
    create: (body: Record<string, unknown>) => api.post('/library/books', body).then((res) => res.data),
    update: (id: ID, body: Record<string, unknown>) =>
      api.put(`/library/books/${id}`, body).then((res) => res.data),
    remove: (id: ID) => api.delete(`/library/books/${id}`).then((res) => res.data),
  },
  issue: (body: Record<string, unknown>) => api.post('/library/issues', body).then((res) => res.data),
  return: (body: Record<string, unknown>) => api.post('/library/returns', body).then((res) => res.data),
  issues: {
    list: (q?: Record<string, unknown>) => api.get('/library/issues', { params: q }).then((res) => res.data),
    overdue: (q?: Record<string, unknown>) =>
      api.get('/library/issues/overdue', { params: q }).then((res) => res.data),
  },
  fines: {
    list: (q?: Record<string, unknown>) => api.get('/library/fines', { params: q }).then((res) => res.data),
    pay: (id: ID) => api.post(`/library/fines/${id}/pay`).then((res) => res.data),
  },
};

/* ───────── Module 12: Analytics ───────── */
export const Analytics = {
  schoolDashboard: () => api.get('/analytics/school-dashboard').then((res) => res.data),
  studentPerformance: (id: ID) => api.get(`/analytics/student-performance/${id}`).then((res) => res.data),
  teacherPerformance: (id: ID) => api.get(`/analytics/teacher-performance/${id}`).then((res) => res.data),
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
