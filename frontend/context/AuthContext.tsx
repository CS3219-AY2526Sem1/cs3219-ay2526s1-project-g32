'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchMe, type LoginResponse } from '../lib/api-client';

const STORAGE_KEY = 'peerprep-auth';

export type AuthUser = LoginResponse['user'];
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
};

export type AuthState = {
  user: AuthUser | null;
  session: AuthSession | null;
  isReady: boolean;
};

export type AuthContextValue = AuthState & {
  login: (payload: LoginResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultState: AuthState = {
  user: null,
  session: null,
  isReady: false,
};

const serializeState = (state: Omit<AuthState, 'isReady'>) => JSON.stringify(state);

const deserializeState = (value: string | null): Omit<AuthState, 'isReady'> => {
  if (!value) return { user: null, session: null };

  try {
    const parsed = JSON.parse(value) as Omit<AuthState, 'isReady'>;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored auth state', error);
    return { user: null, session: null };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(defaultState);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ user: null, session: null, isReady: true });
  }, []);

  const login = useCallback((payload: LoginResponse) => {
    setState({
      user: payload.user,
      session: {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        expiresAt: payload.expiresAt,
        tokenType: payload.tokenType,
      },
      isReady: true,
    });
  }, []);

  useEffect(() => {
    const restored = deserializeState(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);
    setState({ ...restored, isReady: true });
  }, []);

  useEffect(() => {
    if (!state.isReady) return;

    const payload = serializeState({ user: state.user, session: state.session });
    localStorage.setItem(STORAGE_KEY, payload);
  }, [state.isReady, state.session, state.user]);

  useEffect(() => {
    const syncUser = async () => {
      if (!state.isReady || !state.session) {
        return;
      }

      try {
        const response = await fetchMe(state.session.accessToken);
        setState((current) => ({ ...current, user: response.user }));
      } catch (error) {
        console.warn('Failed to refresh user from token', error);
        logout();
      }
    };

    void syncUser();
  }, [logout, state.isReady, state.session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      session: state.session,
      isReady: state.isReady,
      login,
      logout,
    }),
    [login, logout, state.isReady, state.session, state.user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside an AuthProvider');
  }

  return ctx;
};
