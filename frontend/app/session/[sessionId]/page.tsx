'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { Monaco } from '@monaco-editor/react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Layout,
  List,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false },
);

type SessionPageProps = {
  params: {
    sessionId: string;
  };
};

type ParticipantStub = {
  userId: string;
  displayName: string;
  status: 'connected' | 'connecting' | 'disconnected';
};

type QuestionStub = {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  description: string;
  constraints: string[];
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
};

const mockParticipants: ParticipantStub[] = [
  { userId: 'u-1', displayName: 'Alice Tan', status: 'connected' },
  { userId: 'u-2', displayName: 'Wei Xuan', status: 'connected' },
];

const mockQuestion: QuestionStub = {
  title: 'Binary Tree Level Order Traversal',
  difficulty: 'Medium',
  topics: ['Tree', 'Breadth-First Search'],
  description:
    'Given the root of a binary tree, return the level order traversal of its nodes\' values. (i.e., from left to right, level by level).',
  constraints: [
    'The number of nodes in the tree is in the range [0, 2000].',
    '-1000 <= Node.val <= 1000',
  ],
  examples: [
    {
      input: 'root = [3,9,20,null,null,15,7]',
      output: '[[3],[9,20],[15,7]]',
      explanation:
        'Nodes are visited level by level. Values on the same depth share the same inner array.',
    },
    {
      input: 'root = [1]',
      output: '[[1]]',
    },
    {
      input: 'root = []',
      output: '[]',
    },
  ],
};

const difficultyColor: Record<QuestionStub['difficulty'], string> = {
  Easy: 'green',
  Medium: 'gold',
  Hard: 'red',
};

const defaultEditorCode = `function levelOrder(root) {
  if (!root) return [];
  const queue = [root];
  const result = [];

  while (queue.length) {
    const size = queue.length;
    const level = [];

    for (let i = 0; i < size; i += 1) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}
`;

export default function SessionPage({ params }: SessionPageProps) {
  const [language, setLanguage] = useState<'javascript' | 'typescript'>('javascript');

  const sessionTitle = useMemo(
    () => `Session ${params.sessionId.slice(0, 8).toUpperCase()}`,
    [params.sessionId],
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          paddingInline: 32,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Active Collaboration
          </Text>
          <Title level={4} style={{ margin: 0 }}>
            {sessionTitle}
          </Title>
        </Space>
        <Space size="large">
          {mockParticipants.map((participant) => (
            <Badge
              key={participant.userId}
              status={participant.status === 'connected' ? 'success' : participant.status === 'connecting' ? 'processing' : 'default'}
              text={
                <Space size="small">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text>{participant.displayName}</Text>
                </Space>
              }
            />
          ))}
        </Space>
      </Header>
      <Content style={{ padding: '24px 32px' }}>
        <div
          style={{
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(480px, 1.4fr)',
          }}
        >
          <Card
            bordered={false}
            style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space align="baseline" size="middle">
                <Title level={3} style={{ margin: 0 }}>
                  {mockQuestion.title}
                </Title>
                <Tag color={difficultyColor[mockQuestion.difficulty]}>{mockQuestion.difficulty}</Tag>
              </Space>
              <Space wrap>
                {mockQuestion.topics.map((topic) => (
                  <Tag key={topic}>{topic}</Tag>
                ))}
              </Space>
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <Title level={5}>Description</Title>
                <Paragraph style={{ whiteSpace: 'pre-line' }}>{mockQuestion.description}</Paragraph>
              </div>
              <div>
                <Title level={5}>Constraints</Title>
                <List
                  size="small"
                  dataSource={mockQuestion.constraints}
                  renderItem={(item) => (
                    <List.Item style={{ paddingInline: 0 }}>
                      <Text>- {item}</Text>
                    </List.Item>
                  )}
                />
              </div>
              <div>
                <Title level={5}>Examples</Title>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {mockQuestion.examples.map((example, index) => (
                    <Card
                      key={index}
                      size="small"
                      style={{ background: '#fafafa' }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong>Input:</Text>
                        <Paragraph
                          copyable
                          style={{ fontFamily: 'monospace', marginBottom: 8 }}
                        >
                          {example.input}
                        </Paragraph>
                        <Text strong>Output:</Text>
                        <Paragraph
                          style={{ fontFamily: 'monospace', marginBottom: 8 }}
                        >
                          {example.output}
                        </Paragraph>
                        {example.explanation ? (
                          <>
                            <Text strong>Explanation:</Text>
                            <Paragraph style={{ marginBottom: 0 }}>
                              {example.explanation}
                            </Paragraph>
                          </>
                        ) : null}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </div>
            </Space>
          </Card>
          <Card
            bordered={false}
            style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <div
              style={{
                borderBottom: '1px solid #f0f0f0',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Space>
                <Tag>{language === 'javascript' ? 'JavaScript' : 'TypeScript'}</Tag>
                <Button
                  size="small"
                  onClick={() =>
                    setLanguage((prev) => (prev === 'javascript' ? 'typescript' : 'javascript'))
                  }
                >
                  Switch to {language === 'javascript' ? 'TypeScript' : 'JavaScript'}
                </Button>
              </Space>
              <Button type="primary" icon={<ArrowRightOutlined />}>
                Ready to Submit
              </Button>
            </div>
            <div style={{ flex: 1, minHeight: 480 }}>
              <MonacoEditor
                height="100%"
                language={language}
                defaultValue={defaultEditorCode}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
                onMount={(editor, monaco: Monaco) => {
                  // Fit editor layout on mount; future collaborative binding goes here.
                  setTimeout(() => editor.layout(), 0);
                  monaco.editor.setModelLanguage(editor.getModel()!, language);
                }}
              />
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
