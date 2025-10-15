'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Monaco } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Layout,
  List,
  Result,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  LinkOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { useAuth } from '../../../hooks/useAuth';
import {
  fetchSession,
  requestSessionToken,
  type SessionSnapshot,
} from '../../../lib/collab-client';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type SessionPageProps = {
  params: {
    sessionId: string;
  };
};

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const difficultyColor: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'green',
  medium: 'gold',
  hard: 'red',
};

const wsBaseUrl =
  (process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? 'ws://localhost:4010/collab').replace(/\/$/, '');

export default function SessionPage({ params }: SessionPageProps) {
  const { user, session: authSession, isAuthenticated, isReady: authReady } = useAuth();

  const [sessionSnapshot, setSessionSnapshot] = useState<SessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [language, setLanguage] = useState<string>('javascript');

  const ydoc = useMemo(() => new Y.Doc(), [params.sessionId]);
  const yText = useMemo(() => ydoc.getText('monaco'), [ydoc]);

  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => () => ydoc.destroy(), [ydoc]);

  useEffect(() => {
    initializedRef.current = false;
  }, [params.sessionId]);

  useEffect(() => {
    initializedRef.current = false;
  }, [params.sessionId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!authReady || !isAuthenticated || !authSession?.accessToken || !user?.id) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const session = await fetchSession(params.sessionId);
        if (cancelled) return;
        setSessionSnapshot(session);

        const defaultLanguage =
          Object.keys(session.question.starterCode ?? {}).find(Boolean) ?? 'javascript';
        setLanguage((prev) =>
          (session.question.starterCode && session.question.starterCode[prev] !== undefined)
            ? prev
            : defaultLanguage,
        );

        const { sessionToken: token } = await requestSessionToken(params.sessionId, {
          userId: user.id,
          accessToken: authSession.accessToken,
        });

        if (cancelled) return;
        setSessionToken(token);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load session');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    authReady,
    isAuthenticated,
    authSession?.accessToken,
    params.sessionId,
    user?.id,
  ]);

  useEffect(() => {
    if (!sessionSnapshot || !sessionToken || !user) {
      return;
    }

    const provider = new WebsocketProvider(wsBaseUrl, sessionSnapshot.sessionId, ydoc, {
      params: {
        token: sessionToken,
      },
    });

    providerRef.current = provider;
    setConnectionStatus(provider.wsconnected ? 'connected' : 'connecting');

    const displayName =
      sessionSnapshot.participants.find((participant) => participant.userId === user.id)?.displayName ??
      (typeof user.userMetadata?.username === 'string'
        ? (user.userMetadata.username as string)
        : user.email ?? user.id);

    provider.awareness.setLocalStateField('user', {
      name: displayName,
    });

    const handleStatus = (event: { status: ConnectionStatus }) => {
      setConnectionStatus(event.status);
    };

    provider.on('status', handleStatus);

    return () => {
      provider.off('status', handleStatus);
      provider.destroy();
      providerRef.current = null;
    };
  }, [sessionSnapshot, sessionToken, user, ydoc]);

  useEffect(() => {
    const editor = editorRef.current;
    const provider = providerRef.current;

    if (!sessionSnapshot || !editor || !provider) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [sessionSnapshot, yText]);

  useEffect(() => {
    if (!sessionSnapshot) {
      return;
    }

    const initialCode = sessionSnapshot.question.starterCode?.[language];

    if (!initializedRef.current && typeof initialCode === 'string' && yText.length === 0) {
      yText.insert(0, initialCode);
      initializedRef.current = true;
    }
  }, [language, sessionSnapshot, yText]);

  const handleEditorMount = (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    setTimeout(() => editor.layout(), 0);
    const model = editor.getModel();
    if (!model) {
      return;
    }

    monaco.editor.setModelLanguage(model, language);

    const provider = providerRef.current;
    if (provider) {
      bindingRef.current?.destroy();
      bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) {
      return;
    }

    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }, [language]);

  const participantBanner = useMemo(() => {
    if (!sessionSnapshot) return null;

    return (
      <Space size="large">
        {sessionSnapshot.participants.map((participant) => (
          <Badge
            key={participant.userId}
            status={participant.connected ? 'success' : 'default'}
            text={
              <Space size="small">
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>
                  {participant.displayName ?? participant.userId}
                </Text>
              </Space>
            }
          />
        ))}
      </Space>
    );
  }, [sessionSnapshot]);

  const questionMetadata = useMemo(() => {
    const question = sessionSnapshot?.question;
    if (!question) return null;

    const difficulty = question.metadata.difficulty as 'easy' | 'medium' | 'hard';
    const badgeColor = difficultyColor[difficulty] ?? 'default';
    const topics = question.metadata.topics ?? [];
    const starterCodeEntries = Object.entries(question.starterCode ?? {}) as Array<[string, string]>;

    return (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space align="baseline" size="middle">
          <Title level={3} style={{ margin: 0 }}>
            {question.title}
          </Title>
          <Tag color={badgeColor}>{difficulty.toUpperCase()}</Tag>
        </Space>
        <Space wrap>
          {topics.map((topic: string) => (
            <Tag key={topic}>{topic}</Tag>
          ))}
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <div>
          <Title level={5}>Description</Title>
          <Paragraph style={{ whiteSpace: 'pre-line' }}>
            {question.prompt}
          </Paragraph>
        </div>
        <div>
          <Title level={5}>Starter Code</Title>
          <List
            size="small"
            dataSource={starterCodeEntries}
            renderItem={([lang, code]: [string, string]) => (
              <List.Item style={{ paddingInline: 0 }}>
                <Space>
                  <Tag>{lang}</Tag>
                  <Text type="secondary">
                    {code.slice(0, 48)}
                    {code.length > 48 ? '…' : ''}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      </Space>
    );
  }, [sessionSnapshot]);

  if (!authReady || (authReady && !isAuthenticated)) {
    return (
      <Result
        status="403"
        title="Please sign in"
        subTitle="An authenticated account is required to join collaboration sessions."
      />
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin tip="Preparing your session…" size="large" />
      </div>
    );
  }

  if (error || !sessionSnapshot) {
    return (
      <Result
        status="error"
        title="Unable to load session"
        subTitle={error ?? 'Unknown error'}
        extra={
          <Button type="primary" href="/dashboard">
            Back to dashboard
          </Button>
        }
      />
    );
  }

  const sessionTitle = `Session ${sessionSnapshot.sessionId.slice(0, 8).toUpperCase()}`;

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
          <Space size="middle">
            <Title level={4} style={{ margin: 0 }}>
              {sessionTitle}
            </Title>
            <Tag icon={<LinkOutlined />} color={connectionStatus === 'connected' ? 'green' : connectionStatus === 'connecting' ? 'gold' : 'default'}>
              {connectionStatus.toUpperCase()}
            </Tag>
          </Space>
        </Space>
        {participantBanner}
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
            {loading ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : (
              questionMetadata
            )}
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
                <Tag>{language}</Tag>
                <Space.Compact>
                  {(sessionSnapshot.question.starterCode
                    ? Object.keys(sessionSnapshot.question.starterCode)
                    : ['javascript']
                  ).map((lang) => (
                    <Button
                      key={lang}
                      size="small"
                      type={lang === language ? 'primary' : 'default'}
                      onClick={() => setLanguage(lang)}
                    >
                      {lang}
                    </Button>
                  ))}
                </Space.Compact>
              </Space>
              <Button type="primary" icon={<ArrowRightOutlined />}>
                Ready to Submit
              </Button>
            </div>
            <div style={{ flex: 1, minHeight: 480 }}>
              <MonacoEditor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
                onMount={handleEditorMount}
                onChange={() => {
                  // No-op: Yjs binding already syncs content; change handler allows React 18 strict mode compatibility.
                }}
              />
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
