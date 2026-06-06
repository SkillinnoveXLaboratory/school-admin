export type ID = string;

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'TEACHER'
  | 'FINANCE'
  | 'SPORTS'
  | 'LIBRARY'
  | 'HR'
  | 'PARENT'
  | 'STUDENT';

export interface School {
  id: ID;
  name: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  plan?: string;
  studentCount?: number;
  staffCount?: number;
}

export interface User {
  id: ID;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  schoolId: ID | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Student {
  id: ID;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  photoUrl?: string;
  schoolId: ID;
  classId: ID;
  sectionId: ID;
  parentContact?: {
    fatherName?: string;
    motherName?: string;
    primaryPhone: string;
    email?: string;
    homeAddress: string;
  };
  emergencyContact: string;
  status: 'ENROLLED' | 'GRADUATED' | 'TRANSFERRED' | 'DEENROLLED' | 'DE-ENROLLED' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformKPIs {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  totalStudents: number;
  totalStaff: number;
  monthlyRevenue: number;
  trend: { month: string; revenue: number; students: number }[];
  topSchools: { id: ID; name: string; students: number; revenue: number }[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginatedStudentsResponse {
  students: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface StudentIdCard {
  name: string;
  enrollmentNumber: string;
  className: string;
  photoUrl?: string;
  qrCodeData: string;
}

export interface StudentProfileUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  classId?: ID;
  sectionId?: ID;
  emergencyContact?: string;
}

export interface StudentParentUpdate {
  fatherName?: string;
  motherName?: string;
  primaryPhone?: string;
  homeAddress?: string;
}

export type AdmissionStatus = 'APPLIED' | 'VERIFIED' | 'APPROVED' | 'ENROLLED' | 'REJECTED';

export interface AdmissionParentContact {
  fatherName?: string;
  motherName?: string;
  primaryPhone?: string;
  homeAddress?: string;
}

export interface AdmissionDocument {
  documentType: string;
  url: string;
  filename?: string;
}

export interface AdmissionApplication {
  id: ID;
  schoolId: ID;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  emergencyContact: string;
  status: AdmissionStatus;
  parentContact: AdmissionParentContact;
  documents?: AdmissionDocument[];
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  enrollmentNumber?: string;
}

export interface AdmissionPaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdmissionListResponse {
  applications: AdmissionApplication[];
  meta: AdmissionPaginationMeta;
}

export interface AdmissionApplyInput {
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  emergencyContact: string;
  parentContact: AdmissionParentContact;
}

export interface AdmissionApplyResponse {
  success?: boolean;
  message?: string;
  applicationId?: string;
  status?: AdmissionStatus;
  application?: AdmissionApplication;
}

export interface AdmissionActionResponse {
  success?: boolean;
  message?: string;
  status?: AdmissionStatus;
  application?: AdmissionApplication;
}

export interface AdmissionUploadResponse {
  success?: boolean;
  message?: string;
  documentUrl?: string;
  document?: AdmissionDocument;
}

export interface AdmissionEnrollCredentials {
  username: string;
  email: string;
  passwordDefault: string;
}

export interface AdmissionEnrollResponse {
  success?: boolean;
  message?: string;
  enrollmentNumber?: string;
  studentId?: ID;
  student?: Student;
  userCredentials?: AdmissionEnrollCredentials;
  parentCredentials?: AdmissionEnrollCredentials;
}

export interface AcademicSubjectLink {
  subjectId: ID;
  teacherId?: ID;
}

export interface AcademicSection {
  id: ID;
  sectionName?: string;
  name: string;
  roomNumber?: string;
  classTeacherId?: ID;
  subjects: AcademicSubjectLink[];
}

export interface AcademicClass {
  id: ID;
  name: string;
  numericLevel?: number;
  schoolId?: ID;
  sections: AcademicSection[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface AcademicClassListResponse {
  classes: AcademicClass[];
}

export interface AcademicClassMutationResponse {
  success?: boolean;
  message?: string;
  class?: AcademicClass;
}

export interface AcademicSubject {
  id: ID;
  subjectName: string;
  subjectCode: string;
}

export interface AcademicSubjectMutationResponse {
  success?: boolean;
  message?: string;
  data?: AcademicSubject;
  subject?: AcademicSubject;
}

export interface AcademicSubjectLinkResponse {
  success?: boolean;
  message?: string;
}

export interface AcademicSubjectListResponse {
  subjects: AcademicSubject[];
}

export interface HREmployee {
  id: ID;
  schoolId: ID;
  userId?: ID;
  username?: string;
  employeeId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string;
  role: string;
  baseSalary?: number;
  qualifications?: string[];
  status: string;
  joiningDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HREmployeeListResponse {
  employees: HREmployee[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface HREmployeeMutationResponse {
  success?: boolean;
  message?: string;
  employee?: HREmployee;
}

export interface HRPayrollSummary {
  generatedCount?: number;
  skippedCount?: number;
  totalNetDisbursement?: number;
}

export interface HRPayrollRecord {
  id: ID;
  employeeId?: ID;
  month?: number;
  year?: number;
  status?: string;
  netSalary?: number;
  grossSalary?: number;
  disbursedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HRPayrollHistoryResponse {
  history: HRPayrollRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface HRPayrollActionResponse {
  success?: boolean;
  message?: string;
  status?: string;
  disbursedAt?: string;
  summary?: HRPayrollSummary;
}
