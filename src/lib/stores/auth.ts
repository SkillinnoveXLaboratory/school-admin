import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/api/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  activeSchoolId: string | null;
  loginSuccess: (
    token: string,
    refreshToken: string | null,
    user: User,
    activeSchoolId?: string | null,
  ) => void;
  setActiveSchool: (id: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      activeSchoolId: null,
      loginSuccess: (token, refreshToken, user, activeSchoolId) =>
        set({
          token,
          refreshToken: refreshToken ?? null,
          user,
          ...(activeSchoolId !== undefined ? { activeSchoolId } : {}),
        }),
      setActiveSchool: (id) => set({ activeSchoolId: id }),
      logout: () =>
        set({ user: null, token: null, refreshToken: null, activeSchoolId: null }),
    }),
    { name: 'schoolmate-admin-auth' }
  )
);
