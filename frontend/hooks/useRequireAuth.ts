'use client';

import type { Route } from 'next';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from './useAuth';

const LOGIN_ROUTE = '/login' as Route;

export const useRequireAuth = () => {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) { 
      router.replace(LOGIN_ROUTE);
    }
  }, [isAuthenticated, isReady, router]);

  return { isAuthenticated, isReady };
};
