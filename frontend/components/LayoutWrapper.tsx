import { ConfigProvider } from 'antd';
import { ReactNode } from 'react';
import { peerPrepTheme, authTheme } from '../lib/theme';

interface LayoutWrapperProps {
  children: ReactNode;
  variant?: 'main' | 'auth';
}

/**
 * Shared layout wrapper that provides consistent theming across all pages
 * @param children - The page content to render
 * @param variant - The theme variant: 'main' for main pages, 'auth' for authentication pages
 */
export function LayoutWrapper({ children, variant = 'main' }: LayoutWrapperProps) {
  const theme = variant === 'auth' ? authTheme : peerPrepTheme;

  return (
    <ConfigProvider theme={theme}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {children}
      </div>
    </ConfigProvider>
  );
}

/**
 * Auth layout wrapper specifically for authentication pages
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return <LayoutWrapper variant="auth">{children}</LayoutWrapper>;
}

/**
 * Main layout wrapper for regular pages
 */
export function MainLayout({ children }: { children: ReactNode }) {
  return <LayoutWrapper variant="main">{children}</LayoutWrapper>;
}