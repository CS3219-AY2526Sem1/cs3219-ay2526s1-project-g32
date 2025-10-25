'use client';

import type { Route } from 'next';
import { Button, Card, ConfigProvider, Typography } from 'antd';
import { authTheme } from '../../lib/theme';

const LOGIN_ROUTE = '/login' as Route;
const { Title, Paragraph } = Typography;

export default function VerifySuccessPage() {
  return (
    <ConfigProvider theme={authTheme}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Brand header (reuses .auth-header) */}
        <header className="auth-header">
          <svg
            width="32"
            height="32"
            viewBox="0 0 48 48"
            fill="none"
            style={{ color: '#6366F1' }}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor" />
          </svg>
          <Title level={3} style={{ margin: 0 }}>PeerPrep</Title>
        </header>

      <div className="auth-shell">
        <Card className="auth-card" bordered>
          <div style={{ textAlign: 'center' }}>

            <Title level={2} style={{ marginBottom: 6 }}>Email verified</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
              Your magic link worked. You can now sign in with your email and password.
            </Paragraph>

            <Button type="primary" href={LOGIN_ROUTE} block size="large">
              Go to login
            </Button>
          </div>
        </Card>
      </div>
      </div>
    </ConfigProvider>
  );
}
