'use client';
import { Button, Card, Col, Layout, Row, Space, Typography } from 'antd';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          PeerPrep
        </Title>
        <Space>
          <Button type="link" href="/login" style={{ color: '#fff' }}>
            Sign in
          </Button>
          <Button type="primary" href="/register">
            Create account
          </Button>
        </Space>
      </Header>
      <Content className="main-content">
        <Row gutter={[48, 48]} align="middle" justify="center">
          <Col xs={24} md={12}>
            <Space direction="vertical" size="large">
              <Title>Collaborate, practice, and excel at coding interviews.</Title>
              <Paragraph>
                PeerPrep matches you with peers for real-time coding sessions and keeps track of your progress across
                microservices built by the team.
              </Paragraph>
              <Space size="middle">
                <Button type="primary" size="large" href="/login">
                  Sign in to get started
                </Button>
                <Button size="large" href="/register">
                  Create an account
                </Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <Card title="What's included" bordered={false} style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
              <Space direction="vertical">
                <Text>- Supabase-backed authentication with email magic links</Text>
                <Text>- Teammate-ready API surface for other microservices</Text>
                <Text>- Next.js App Router scaffold shared via npm workspaces</Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}

