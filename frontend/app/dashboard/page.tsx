'use client';

import type { Route } from 'next';
import { Button, Card, Col, ConfigProvider, Layout, Row, Space, Typography } from 'antd';

import { useAuth } from '../../hooks/useAuth';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { peerPrepTheme } from '../../lib/theme';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LANDING_ROUTE = '/' as Route;

export default function DashboardPage() {
  const { isAuthenticated, isReady } = useRequireAuth();
  const { user, logout } = useAuth();

  if (!isReady) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Content className="main-content">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
              <Title level={4} style={{ color: 'var(--text)' }}>Loading session...</Title>
            </div>
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const username =
    user && typeof user.userMetadata?.username === 'string' ? (user.userMetadata.username as string) : '—';

  return (
    <ConfigProvider theme={peerPrepTheme}>
      <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header className="header-dark">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                PeerPrep Dashboard
              </Title>
            </div>

            <Space>
              <Button type="link" onClick={logout}>
                Log out
              </Button>
              <Button type="primary" href={LANDING_ROUTE}>
                Back to landing
              </Button>
            </Space>
          </div>
        </Header>

        <Content className="main-content">
          {/* background shapes */}
          <div className="blob" aria-hidden="true" />
          <div className="blob-bottom" aria-hidden="true" />
          {/* soft blur across the whole background */}
          <div className="bg-blur-overlay" aria-hidden="true" />

          <div style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto' }}>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card className="dark-card" title="Your account" bordered>
                  <Space direction="vertical">
                    <Text style={{ color: 'var(--muted)' }}>Username: {username}</Text>
                    <Text style={{ color: 'var(--muted)' }}>Email: {user?.email ?? 'Unknown'}</Text>
                    <Text style={{ color: 'var(--muted)' }}>
                      Email verified: {user?.emailConfirmed ? 'Yes' : 'Pending verification'}
                    </Text>
                    <Text style={{ color: 'var(--muted)' }}>
                      Created: {user ? new Date(user.createdAt).toLocaleString() : '—'}
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="dark-card" title="Start Coding" bordered>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text style={{ color: 'var(--muted)' }}>
                      Ready to practice coding with a peer? Find your perfect coding partner!
                    </Text>
                    <Button 
                      type="primary" 
                      size="large" 
                      href="/matching"
                      style={{ width: '100%', marginTop: '16px' }}
                    >
                      🚀 Find Coding Partner
                    </Button>
                    <Text style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Choose your topic and difficulty to get matched instantly
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
