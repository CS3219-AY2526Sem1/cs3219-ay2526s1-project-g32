/* AI Assistance Disclosure:
Scope: Implement page components, and standardize theme with globals.
Author Review: Validated for style and accuracy.
*/

'use client';
import { Button, ConfigProvider, Layout, Space, Typography } from 'antd';
import { peerPrepTheme } from '../lib/theme';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

export default function HomePage() {
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
                PeerPrep
              </Title>
            </div>

            <Space>
              <Button type="link" href="/login">
                Log in
              </Button>
              <Button type="primary" href="/register">
                Sign Up Free
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

          <div className="hero-center">
            <Space direction="vertical" size="large" align="center">
              <Title className="hero-title" style={{ marginBottom: 0, textAlign: 'center' }}>
                Code, Collaborate, Conquer.
              </Title>
              <Paragraph className="hero-sub" style={{ marginTop: 8, textAlign: 'center' }}>
                The ultimate platform for peer-to-peer coding practice. Sharpen your skills, prepare
                for interviews, and learn from a community of developers.
              </Paragraph>

              <Space className="hero-actions" size="middle" align="center" wrap>
                <Button type="primary" size="large" href="/login">
                  Sign in to get started
                </Button>
                <Button size="large" href="/register">
                  Create an account
                </Button>
              </Space>
            </Space>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
