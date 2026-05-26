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
    homeAddress: string;
  };
  emergencyContact: string;
  status: 'ENROLLED' | 'GRADUATED' | 'TRANSFERRED' | 'DEENROLLED' | 'INACTIVE';
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
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
