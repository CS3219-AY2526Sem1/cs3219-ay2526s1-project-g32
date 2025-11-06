'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Col, ConfigProvider, Layout, Row, Select, Space, Typography, message } from 'antd';
import { PlayCircleOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { startMatchmaking, getMatchStatus, cancelMatch } from '../../lib/api-client';
import { peerPrepTheme } from '../../lib/theme';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Define the available topics and difficulties
const TOPICS = [
  'Array',
  'String', 
  'Linked List',
  'Tree',
  'Graphs',
  'Dynamic Programming',
  'Sorting',
  'Searching',
  'Hash Table',
  'Stacks and Queues'
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function MatchingPage() {
  const { isAuthenticated, isReady } = useRequireAuth();
  const { user, session, logout } = useAuth();
  
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [isMatching, setIsMatching] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const displayName =
    typeof user?.userMetadata?.username === 'string' && user.userMetadata.username.trim().length > 0
      ? (user.userMetadata.username as string)
      : user?.email ?? user?.id ?? 'Anonymous';

  // Poll for match status when matching
  useEffect(() => {
    if (isMatching && user && session) {
      const interval = setInterval(async () => {
        try {
          const status = await getMatchStatus(user.id, session.accessToken);
          if (status.status === 'success') {
            message.success('Match found! Redirecting to collaboration...');
            setIsMatching(false);
            if (status.sessionId) {
              router.push(`/session/${status.sessionId}`);
              return;
            }
          } else if (status.status === 'not_found') {
            message.info('No active match request found');
            setIsMatching(false);
          }
        } catch (error) {
          console.error('Error polling match status:', error);
        }
      }, 2000); // Poll every 2 seconds

      setPollInterval(interval);
      return () => clearInterval(interval);
    }
  }, [isMatching, user, session]);

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

  const handleStartMatching = async () => {
    if (!selectedTopic || !selectedDifficulty) {
      message.error('Please select both topic and difficulty');
      return;
    }

    setIsMatching(true);
    
    try {
      const response = await startMatchmaking(
        selectedTopic,
        selectedDifficulty,
        session.accessToken,
        displayName,
      );
      
      if (response.status === 'success') {
        message.success('Match found! Redirecting to collaboration...');
        setIsMatching(false);
        // Redirect to collaboration session if sessionId is provided by the server
        if (response.sessionId) {
          router.push(`/session/${response.sessionId}`);
          return;
        }
      } else {
        message.success(`Looking for a match in ${selectedTopic} (${selectedDifficulty})...`);
      }
      
    } catch (error: any) {
      message.error(error.message || 'Failed to start matchmaking');
      setIsMatching(false);
    }
  };

  const handleCancelMatching = async () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    try {
      if (selectedTopic) {
        await cancelMatch(selectedTopic, session.accessToken);
      }
      setIsMatching(false);
      message.info('Matchmaking cancelled');
    } catch (error: any) {
      console.error('Error cancelling match:', error);
      setIsMatching(false);
      message.info('Matchmaking cancelled');
    }
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
                🧩 Find Your Coding Partner
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
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', margin: '0 auto' }}>
            <Row gutter={[24, 24]} justify="center">
              <Col xs={24} sm={20} md={16} lg={12} xl={10}>
                  <Card
                    className="dark-card"
                    title={
                      <Space>
                        <UserOutlined />
                        <span>Matchmaking Setup</span>
                      </Space>
                    }
                    bordered
                    headStyle={{ padding: '16px 24px' }}
                    bodyStyle={{ padding: '24px' }}
                  >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Paragraph style={{ color: 'var(--muted)' }}>
                    Select your preferred coding topic and difficulty level to find the perfect practice partner.
                  </Paragraph>
                </div>

                {/* Topic Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
                    Coding Topic
                  </Text>
                  <Select
                    placeholder="Choose a topic"
                    size="large"
                    style={{ width: '100%' }}
                    value={selectedTopic}
                    onChange={setSelectedTopic}
                    disabled={isMatching}
                  >
                    {TOPICS.map(topic => (
                      <Option key={topic} value={topic}>
                        {topic}
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Difficulty Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
                    Difficulty Level
                  </Text>
                  <Select
                    placeholder="Choose difficulty"
                    size="large"
                    style={{ width: '100%' }}
                    value={selectedDifficulty}
                    onChange={setSelectedDifficulty}
                    disabled={isMatching}
                  >
                    {DIFFICULTIES.map(difficulty => (
                      <Option key={difficulty} value={difficulty}>
                        <Space>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 
                                difficulty === 'Easy' ? '#52c41a' : 
                                difficulty === 'Medium' ? '#faad14' : '#f5222d'
                            }}
                          />
                          {difficulty}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Action Buttons */}
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                  {!isMatching ? (
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={handleStartMatching}
                      disabled={!selectedTopic || !selectedDifficulty}
                      style={{
                        height: '48px',
                        fontSize: '16px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        minWidth: '200px'
                      }}
                    >
                      Start Matchmaking
                    </Button>
                  ) : (
                    <Space direction="vertical" size="middle">
                      <div style={{ textAlign: 'center' }}>
                        <ClockCircleOutlined 
                          spin 
                          style={{ 
                            fontSize: '24px', 
                            color: '#1890ff',
                            marginBottom: '12px'
                          }} 
                        />
                        <div>
                          <Text strong style={{ fontSize: '16px', color: 'var(--text)' }}>
                            Finding your coding partner...
                          </Text>
                          <br />
                          <Text style={{ color: 'var(--muted)' }}>
                            Topic: {selectedTopic} • Difficulty: {selectedDifficulty}
                          </Text>
                        </div>
                      </div>
                      <Button
                        size="large"
                        onClick={handleCancelMatching}
                        style={{
                          height: '40px',
                          borderRadius: '6px',
                          minWidth: '160px'
                        }}
                      >
                        Cancel
                      </Button>
                    </Space>
                  )}
                </div>

                {/* Info Section */}
                {!isMatching && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.08)', 
                    padding: '16px', 
                    borderRadius: '6px',
                    marginTop: '24px',
                    border: '1px solid var(--border)'
                  }}>
                    <Text style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      💡 <strong style={{ color: 'var(--text)' }}>How it works:</strong> We'll match you with another developer who selected the same topic and difficulty. Once matched, you'll be redirected to a collaborative coding session.
                    </Text>
                  </div>
                )}
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
