import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/api/types';

interface AuthState {
  user: User | null;
  token: string | null;
  activeSchoolId: string | null;
  loginSuccess: (token: string, user: User) => void;
  setActiveSchool: (id: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      activeSchoolId: null,
      loginSuccess: (token, user) => set({ token, user }),
      setActiveSchool: (id) => set({ activeSchoolId: id }),
      logout: () => set({ user: null, token: null, activeSchoolId: null }),
    }),
    { name: 'schoolmate-admin-auth' }
  )
);
