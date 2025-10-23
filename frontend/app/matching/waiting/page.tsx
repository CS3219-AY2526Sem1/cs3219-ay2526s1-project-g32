'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Layout, Progress, Space, Typography } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../../hooks/useAuth';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { getMatchStatus, cancelMatch } from '../../../lib/api-client';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function MatchingWaitingPage() {
  const { isAuthenticated, isReady } = useRequireAuth();
  const { user, session, logout } = useAuth();
  
  const [waitingTime, setWaitingTime] = useState(0);
  const [matchStatus, setMatchStatus] = useState<'pending' | 'success' | 'not_found'>('pending');

  // Poll for match status
  useEffect(() => {
    if (!user || !session) return;

    const checkStatus = async () => {
      try {
        const status = await getMatchStatus(user.id, session.accessToken);
        setMatchStatus(status.status);
        
        if (status.status === 'success') {
          // TODO: Redirect to collaboration session
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
      <Layout style={{ minHeight: '100vh' }}>
        <Content className="centered-section">
          <Title level={4}>Loading session...</Title>
        </Content>
      </Layout>
    );
  }

  if (!isAuthenticated || !user || !session) {
    return null;
  }

  const handleCancelMatch = async () => {
    try {
      // For now, we don't have the topic stored, so we'll redirect back
      window.location.href = '/matching';
    } catch (error) {
      console.error('Error cancelling match:', error);
      window.location.href = '/matching';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const username = user.userMetadata?.username as string || user.email || 'User';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#001529'
      }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          🔍 Finding Your Match...
        </Title>
        <Space>
          <Text style={{ color: '#fff' }}>Welcome, {username}</Text>
          <Button onClick={logout}>Log out</Button>
          <Button type="primary" href="/dashboard">
            Dashboard
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '50px', background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <Card
            bordered={false}
            style={{ 
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              borderRadius: '12px',
              padding: '40px 20px'
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Animated Icon */}
              <div style={{ fontSize: '80px', color: '#1890ff', marginBottom: '20px' }}>
                <ClockCircleOutlined spin />
              </div>

              {/* Main Message */}
              <div>
                <Title level={2} style={{ marginBottom: '8px', color: '#1890ff' }}>
                  Searching for Your Perfect Match
                </Title>
                <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
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
                  <Text style={{ color: '#999' }}>Elapsed time:</Text>
                  <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                    {formatTime(waitingTime)}
                  </Text>
                </div>
              </div>

              {/* Status Info */}
              <div style={{ 
                background: '#f6f8fa', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #e1e4e8'
              }}>
                <Space direction="vertical" align="center" size="small">
                  <UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Text strong>Looking for developers...</Text>
                  <Text type="secondary" style={{ textAlign: 'center' }}>
                    Status: <strong>{matchStatus}</strong>
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
                background: '#fff7e6', 
                border: '1px solid #ffd591',
                borderRadius: '6px',
                padding: '16px',
                marginTop: '20px'
              }}>
                <Text style={{ fontSize: '14px', color: '#ad6800' }}>
                  💡 <strong>Tip:</strong> While you wait, the system is matching you based on your selected topic and difficulty level. Peak hours typically have faster matching!
                </Text>
              </div>
            </Space>
          </Card>
        </div>
      </Content>
    </Layout>
  );
}