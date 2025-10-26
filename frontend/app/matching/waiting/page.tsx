'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, ConfigProvider, Layout, Progress, Space, Typography, message } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../../hooks/useAuth';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { getMatchStatus, cancelMatch } from '../../../lib/api-client';
import { peerPrepTheme } from '../../../lib/theme';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function MatchingWaitingPage() {
  const { isAuthenticated, isReady } = useRequireAuth();
  const { user, session, logout } = useAuth();
  
  const [waitingTime, setWaitingTime] = useState(0);
  const [matchStatus, setMatchStatus] = useState<'pending' | 'success' | 'not_found'>('pending');
  // Ensure we only redirect once when a match is ready
  const redirectingRef = useRef(false);
  const router = useRouter();

  // Poll for match status
  useEffect(() => {
    if (!user || !session) return;

    const checkStatus = async () => {
      try {
        // Accept any shape from server; we only rely on known fields below
        const res: any = await getMatchStatus(user.id, session.accessToken);
        const status = res?.status;
        if (status) setMatchStatus(status);

        if (status === 'success' && !redirectingRef.current) {
          // Try common fields where the collaboration service might provide the session URL
          const url =
            res?.collaborationUrl ||
            res?.sessionUrl ||
            res?.url ||
            res?.session?.url;

          // If the service returned a sessionId, use a sensible fallback route.
          // Adjust this route if your backend uses a different client path.
          const sessionId = res?.sessionId;

          redirectingRef.current = true;
          // Clear any further polling by letting cleanup run on unmount or by relying on the immediate redirect
          try {
              if (url) {
                // If backend returned a full URL, navigate there.
                try {
                  // External or internal URL
                  router.push(url);
                } catch (e) {
                  // Fallback to full navigation
                  window.location.href = url;
                }
                return;
              }

              if (sessionId) {
                // Client route for sessions is /session/[sessionId]
                router.push(`/session/${sessionId}`);
                return;
              }

            // If no redirect information is present, keep showing success state but stop re-redirect attempts
            // (You may want to fetch another endpoint here to obtain the session URL.)
          } catch (err) {
            console.error('Redirect failed:', err);
          }
        }
      } catch (error) {
        console.error('Error checking match status:', error);
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 2 seconds
    const statusInterval = setInterval(checkStatus, 2000);

    return () => clearInterval(statusInterval);
  }, [user, session]);

  // Timer for waiting time
  useEffect(() => {
    const timer = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  if (!isAuthenticated || !user || !session) {
    return null;
  }

  const handleCancelMatch = async () => {
    // Try to read the selected topic from multiple possible places where it might have been persisted.
    const getPersistedTopic = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const qTopic = params.get('topic');

        const hist = (window.history && (window.history.state as any)) || {};
        const hTopic = hist?.topic || hist?.state?.topic || null;

        const ssTopic = sessionStorage.getItem('matchingTopic') || localStorage.getItem('matchingTopic');

        return qTopic || hTopic || ssTopic || null;
      } catch (e) {
        return null;
      }
    };

    const topic = getPersistedTopic();

    try {
      // First, attempt the existing helper. Cast to any to avoid strict signature issues.
      if (typeof cancelMatch === 'function') {
        // Our API helper expects (topic: string, accessToken: string)
        if (topic) {
          await cancelMatch(topic, session!.accessToken);
        } else {
          // If topic couldn't be determined, call the helper without topic is not possible;
          // log and continue to fallback behavior below.
          console.warn('Topic not found for cancellation; skipping API helper call');
          throw new Error('Topic not found');
        }
      } else {
        throw new Error('cancelMatch helper not available');
      }
    } catch (helperErr) {
      // Fallback: call backend endpoint directly to ensure queue entry is removed.
      try {
        // As a last resort attempt a best-effort cancel via the matching service's
        // client-side helper endpoint. Many deployments proxy /api/matching/* to the
        // matching service; if you don't have such a proxy, this will likely fail.
        await fetch(`/api/matching/requests`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
          },
          body: JSON.stringify({ topic }),
        });
      } catch (fetchErr) {
        console.error('Failed to cancel match via fallback fetch:', fetchErr);
      }
    } finally {
      // Redirect back to the matching setup regardless of cancellation outcome.
      try {
        router.push('/matching');
      } catch (e) {
        window.location.href = '/matching';
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const username = user.userMetadata?.username as string || user.email || 'User';

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
                🔍 Finding Your Match...
              </Title>
            </div>

            <Space>
              <Text style={{ color: 'var(--muted)' }}>Welcome, {username}</Text>
              <Button type="link" onClick={logout}>
                Log out
              </Button>
              <Button type="primary" href="/dashboard">
                Dashboard
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
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <Card
              className="dark-card"
              bordered
              style={{ 
                borderRadius: '12px',
                padding: '40px 20px'
              }}
            >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Animated Icon */}
              <div style={{ fontSize: '80px', color: 'var(--primary-600)', marginBottom: '20px' }}>
                <ClockCircleOutlined spin />
              </div>

              {/* Main Message */}
              <div>
                <Title level={2} style={{ marginBottom: '8px', color: 'var(--primary-600)' }}>
                  Searching for Your Perfect Match
                </Title>
                <Paragraph style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '30px' }}>
                  We're finding another developer who shares your coding interests. 
                  This usually takes less than 2 minutes.
                </Paragraph>
              </div>

              {/* Progress and Timer */}
              <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                <Progress 
                  percent={Math.min((waitingTime / 120) * 100, 100)} 
                  status={waitingTime >= 120 ? 'exception' : 'active'}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: 'var(--muted)' }}>Elapsed time:</Text>
                  <Text strong style={{ color: 'var(--primary-600)', fontSize: '16px' }}>
                    {formatTime(waitingTime)}
                  </Text>
                </div>
              </div>

              {/* Status Info */}
              <div style={{ 
                background: 'rgba(255,255,255,0.08)', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <Space direction="vertical" align="center" size="small">
                  <UserOutlined style={{ fontSize: '24px', color: 'var(--primary-600)' }} />
                  <Text strong style={{ color: 'var(--text)' }}>Looking for developers...</Text>
                  <Text style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    Status: <strong style={{ color: 'var(--text)' }}>{matchStatus}</strong>
                  </Text>
                </Space>
              </div>

              {/* Cancel Button */}
              <Button
                size="large"
                onClick={handleCancelMatch}
                style={{
                  marginTop: '20px',
                  height: '48px',
                  borderRadius: '6px',
                  minWidth: '200px'
                }}
              >
                Cancel & Return to Setup
              </Button>

              {/* Helpful Tips */}
              <div style={{ 
                background: 'rgba(255,255,255,0.06)', 
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '16px',
                marginTop: '20px'
              }}>
                <Text style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  💡 <strong style={{ color: 'var(--text)' }}>Tip:</strong> While you wait, the system is matching you based on your selected topic and difficulty level. Peak hours typically have faster matching!
                </Text>
              </div>
            </Space>
            </Card>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}