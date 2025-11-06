'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, ConfigProvider, Layout, Result, Space, Spin, Typography } from 'antd';

import { useAuth } from '../../hooks/useAuth';
import { peerPrepTheme } from '../../lib/theme';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

const LoadingView = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}
  >
    <Spin tip="Checking admin access..." size="large" />
  </div>
);

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (!user.isAdmin) {
      router.replace('/');
    }
  }, [isAuthenticated, isReady, router, user]);

  if (!isReady || !user || !isAuthenticated) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <LoadingView />
      </ConfigProvider>
    );
  }

  if (!user.isAdmin) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Content className="main-content">
            <Result
              status="403"
              title="Access Restricted"
              subTitle="You need administrator privileges to view this page."
              extra={
                <Button type="primary" onClick={() => router.push('/')}>Go back home</Button>
              }
            />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={peerPrepTheme}>
      <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header className="header-dark">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: 'var(--primary-600)' }}
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <Title level={4} style={{ color: '#fff', margin: 0 }}>
                PeerPrep Admin
              </Title>
            </div>
          </div>
        </Header>

        <Content className="main-content">
          <div className="blob" aria-hidden="true" />
          <div className="blob-bottom" aria-hidden="true" />
          <div className="bg-blur-overlay" aria-hidden="true" />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh',
            }}
          >
            <Card
              style={{
                background: 'rgba(12, 18, 38, 0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 15px 45px rgba(2,12,27,0.55)',
                maxWidth: 520,
                width: '100%',
              }}
              bodyStyle={{ padding: '48px 56px' }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Title level={2} style={{ margin: 0, color: '#fff' }}>
                  You are admin ?
                </Title>
                <Paragraph style={{ color: 'var(--muted)', margin: 0 }}>
                  Welcome to the admin page. Only administrators can access this view.
                </Paragraph>
              </Space>
            </Card>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
