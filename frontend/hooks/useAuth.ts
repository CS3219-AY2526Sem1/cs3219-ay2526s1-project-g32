'use client';

import { useMemo } from 'react';

import { useAuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const ctx = useAuthContext();

  const isAuthenticated = useMemo(() => Boolean(ctx.session?.accessToken && ctx.user), [ctx.session, ctx.user]);

  return {
    ...ctx,
    isAuthenticated,
  };
};
