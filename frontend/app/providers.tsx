'use client';

import { ConfigProvider, theme as antdTheme } from 'antd';
import type { ReactNode } from 'react';

import { AuthProvider } from '../context/AuthContext';

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </ConfigProvider>
  );
}
