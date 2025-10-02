'use client';

import type { Route } from 'next';
import { Button, Card, Col, Layout, Row, Space, Typography } from 'antd';

import { useAuth } from '../../hooks/useAuth';
import { useRequireAuth } from '../../hooks/useRequireAuth';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LANDING_ROUTE = '/' as Route;

export default function DashboardPage() {
  const { isAuthenticated, isReady } = useRequireAuth();
  const { user, logout } = useAuth();

  if (!isReady) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content className="centered-section">
          <Title level={4}>Loading session...</Title>
        </Content>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const username =
    user && typeof user.userMetadata?.username === 'string' ? (user.userMetadata.username as string) : '—';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          PeerPrep Dashboard
        </Title>
        <Space>
          <Button onClick={logout}>Log out</Button>
          <Button type="primary" href={LANDING_ROUTE}>
            Back to landing
          </Button>
        </Space>
      </Header>
      <Content className="main-content">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Your account" bordered={false} style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
              <Space direction="vertical">
                <Text>Username: {username}</Text>
                <Text>Email: {user?.email ?? 'Unknown'}</Text>
                <Text>Email verified: {user?.emailConfirmed ? 'Yes' : 'Pending verification'}</Text>
                <Text>Created: {user ? new Date(user.createdAt).toLocaleString() : '—'}</Text>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="What to build next" bordered={false} style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
              <Space direction="vertical">
                <Text>- Surface upcoming sessions from the matching service</Text>
                <Text>- Display collaborative coding history from the session service</Text>
                <Text>- Embed peer feedback and analytics widgets</Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
