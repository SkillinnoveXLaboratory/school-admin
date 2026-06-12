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
  profileImageUrl?: string;
  schoolName?: string;
  role: Role;
  schoolId: ID | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface TenantPrincipalInfo {
  name?: string;
  qualification?: string;
  email?: string;
  phone?: string;
}

export interface TenantAcademicBoardInfo {
  boardName?: string;
  boardCode?: string;
  affiliationStatus?: string;
}

export interface TenantAffiliationDetails {
  affiliationNo?: string;
  expiryDate?: string;
  type?: string;
}

export interface TenantRegistrationNumbers {
  schoolRegNo?: string;
  trustRegNo?: string;
}

export interface TenantSettings {
  id?: ID;
  schoolId?: ID;
  schoolName?: string;
  principalInfo: TenantPrincipalInfo;
  academicBoardInfo: TenantAcademicBoardInfo;
  affiliationDetails?: TenantAffiliationDetails;
  registrationNumbers?: TenantRegistrationNumbers;
  enrollmentTypes?: string[];
  bloodGroups?: string[];
  genders?: string[];
  employeeRoles?: string[];
  examTerms?: string[];
  libraryFinePerDay?: number;
  maxBooksPerStudent?: number;
  allowParentLogin?: boolean;
  allowStudentLogin?: boolean;
  schoolTheme?: string;
  schoolLogoUrl?: string;
  schoolWebsiteUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantSettingsUpdateInput {
  principalInfo?: TenantPrincipalInfo;
  academicBoardInfo?: TenantAcademicBoardInfo;
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
    parentEmail?: string;
    email?: string;
    homeAddress: string;
    address?: {
      homeAddress?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
    };
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
  fullName?: string;
  schoolId?: ID;
  studentId?: ID;
  enrollmentNumber: string;
  dateOfBirth?: string;
  emergencyPhone?: string;
  primaryPhone?: string;
  className?: string;
  photoUrl?: string;
  layout?: {
    template?: string;
    primaryColor?: string;
    textColor?: string;
    barcodeType?: string;
  };
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
  parentEmail?: string;
  homeAddress?: string;
}

export interface StudentBirthdayTriggerReport {
  scannedCount?: number;
  birthdayCount?: number;
  notifiedCount?: number;
  errors?: string[];
}

export interface StudentBirthdayTriggerResponse {
  success?: boolean;
  message?: string;
  report?: StudentBirthdayTriggerReport;
}

export type AdmissionStatus = 'PENDING' | 'APPLIED' | 'VERIFIED' | 'APPROVED' | 'ENROLLED' | 'REJECTED';

export interface AdmissionParentContact {
  fatherName?: string;
  motherName?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  guardianName?: string;
  parentEmail?: string;
  homeAddress?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export interface AdmissionAddress {
  homeAddress?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export interface AdmissionAcademicDetails {
  classApplied?: string;
  section?: string;
  enrollmentType?: string;
  previousSchool?: string;
  lastGradeCompleted?: string;
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
  emergencyContactName?: string;
  emergencyContactNo?: string;
  aadharNo?: string;
  bloodGroup?: string;
  identificationMark?: string;
  nationalId?: string;
  guardianName?: string;
  primaryContactNo?: string;
  secondaryContactNo?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  parentEmail?: string;
  address?: AdmissionAddress;
  academic?: AdmissionAcademicDetails;
  enrollmentType?: string;
  lastGradeCompleted?: string;
  isParentSigned?: boolean;
  isDeclarationSigned?: boolean;
  classAppliedFor?: string;
  previousSchoolName?: string;
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
  emergencyContactName?: string;
  emergencyContactNo?: string;
  aadharNo?: string;
  bloodGroup?: string;
  identificationMark?: string;
  nationalId?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  parentEmail?: string;
  primaryContactNo?: string;
  secondaryContactNo?: string;
  address?: AdmissionAddress;
  academic?: AdmissionAcademicDetails;
  isParentSigned?: boolean;
  isDeclarationSigned?: boolean;
  classAppliedFor?: string;
  previousSchoolName?: string;
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
  isActive?: boolean;
  status?: string;
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
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  status?: string;
  schoolId?: ID;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface AcademicActionResponse {
  success?: boolean;
  message?: string;
}

export interface AcademicSubjectListResponse {
  subjects: AcademicSubject[];
}

export interface HREmployeeLoginAccount {
  id?: ID;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  username?: string;
}

export interface HREmployee {
  id: ID;
  schoolId: ID;
  userId?: ID;
  loginAccount?: HREmployeeLoginAccount;
  username?: string;
  password?: string;
  employeeId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  mobileNo?: string;
  department?: string;
  role: string;
  baseSalary?: number;
  qualifications?: string[];
  qualificationUrl?: string;
  licenseUrl?: string;
  bloodGroup?: string;
  nationalId?: string;
  vehicleNumber?: string;
  gender?: string;
  dob?: string;
  maritalStatus?: string;
  nationality?: string;
  emergencyContactPhone?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  passportDetails?: {
    passportNumber?: string;
    expiryDate?: string;
  };
  voterId?: string;
  photographUrl?: string;
  appointmentLetterUrl?: string;
  contractDocumentsUrl?: string;
  medicalCertificatesUrl?: string;
  policeVerificationUrl?: string;
  emergencyContactRelationship?: string;
  fullName?: string;
  status: string;
  joiningDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HREmployeeUpsertInput {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
  baseSalary: number;
  mobileNo?: string;
  phone?: string;
  department?: string;
  qualifications?: string[];
  qualificationUrl?: string;
  licenseUrl?: string;
  bloodGroup?: string;
  nationalId?: string;
  vehicleNumber?: string;
  gender?: string;
  dob?: string;
  maritalStatus?: string;
  nationality?: string;
  emergencyContactPhone?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  passportDetails?: {
    passportNumber?: string;
    expiryDate?: string;
  };
  voterId?: string;
  photographUrl?: string;
  appointmentLetterUrl?: string;
  contractDocumentsUrl?: string;
  medicalCertificatesUrl?: string;
  policeVerificationUrl?: string;
  emergencyContactRelationship?: string;
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
