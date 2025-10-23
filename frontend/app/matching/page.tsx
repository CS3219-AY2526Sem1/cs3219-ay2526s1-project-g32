'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Col, Layout, Row, Select, Space, Typography, message } from 'antd';
import { PlayCircleOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { startMatchmaking, getMatchStatus, cancelMatch } from '../../lib/api-client';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Define the available topics and difficulties
const TOPICS = [
  'Arrays',
  'Strings', 
  'Linked Lists',
  'Trees',
  'Graphs',
  'Dynamic Programming',
  'Sorting',
  'Searching',
  'Hash Tables',
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

  // Poll for match status when matching
  useEffect(() => {
    if (isMatching && user && session) {
      const interval = setInterval(async () => {
        try {
          const status = await getMatchStatus(user.id, session.accessToken);
          if (status.status === 'success') {
            message.success('Match found! Redirecting to collaboration...');
            setIsMatching(false);
            // TODO: Redirect to collaboration session
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

  const handleStartMatching = async () => {
    if (!selectedTopic || !selectedDifficulty) {
      message.error('Please select both topic and difficulty');
      return;
    }

    setIsMatching(true);
    
    try {
      const response = await startMatchmaking(selectedTopic, selectedDifficulty, session.accessToken);
      
      if (response.status === 'success') {
        message.success('Match found! Redirecting to collaboration...');
        setIsMatching(false);
        // TODO: Redirect to collaboration session
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
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#001529'
      }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          🧩 Find Your Coding Partner
        </Title>
        <Space>
          <Text style={{ color: '#fff' }}>Welcome, {username}</Text>
          <Button onClick={logout}>Log out</Button>
          <Button type="primary" href="/dashboard">
            Dashboard
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            <Card
              title={
                <Space>
                  <UserOutlined />
                  <span>Matchmaking Setup</span>
                </Space>
              }
              bordered={false}
              style={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                borderRadius: '8px'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Paragraph>
                    Select your preferred coding topic and difficulty level to find the perfect practice partner.
                  </Paragraph>
                </div>

                {/* Topic Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>
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
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>
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
                          <Text strong style={{ fontSize: '16px' }}>
                            Finding your coding partner...
                          </Text>
                          <br />
                          <Text type="secondary">
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
                    background: '#f6f8fa', 
                    padding: '16px', 
                    borderRadius: '6px',
                    marginTop: '24px'
                  }}>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      💡 <strong>How it works:</strong> We'll match you with another developer who selected the same topic and difficulty. Once matched, you'll be redirected to a collaborative coding session.
                    </Text>
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}