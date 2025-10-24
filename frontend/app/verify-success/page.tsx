'use client';

import type { Route } from 'next';
import { Button, Card, ConfigProvider, Typography } from 'antd';

const LOGIN_ROUTE = '/login' as Route;
const { Title, Paragraph } = Typography;

export default function VerifySuccessPage() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#137fec',
          colorBgBase: '#0A1017',
          colorTextBase: '#ffffff',
          colorBorder: 'rgba(255,255,255,0.1)',
          fontFamily:
            '"Space Grotesk","Noto Sans",system-ui,-apple-system,"Segoe UI",sans-serif',
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(255,255,255,0.04)',
            headerBg: 'transparent',
            headerPadding: 0,
          },
          Button: {
            borderRadius: 10,
            fontWeight: 600,
          },
        },
      }}
    >
      {/* Brand header (reuses .auth-header) */}
      <header className="auth-header">
        <svg
          width="32"
          height="32"
          viewBox="0 0 48 48"
          fill="none"
          style={{ color: '#137fec' }}
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
    </ConfigProvider>
  );
}
