import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/api/types';

const LAST_LOGIN_USER_KEY = 'schoolmate-admin-last-login-user';

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
    {
      name: 'schoolmate-admin-auth',
      version: 1,
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<AuthState>;
        const active = current as AuthState;

        return {
          ...stored,
          ...active,
          user: active.user ?? stored.user ?? null,
          token: active.token ?? stored.token ?? null,
          refreshToken: active.refreshToken ?? stored.refreshToken ?? null,
          activeSchoolId: active.activeSchoolId ?? stored.activeSchoolId ?? null,
        };
      },
    }
  )
);

useAuthStore.subscribe((state) => {
  if (typeof window === 'undefined') return;

  if (!state.token && !state.user) {
    window.localStorage.removeItem(LAST_LOGIN_USER_KEY);
  }
});
