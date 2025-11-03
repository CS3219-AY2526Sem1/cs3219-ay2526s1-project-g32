'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Monaco } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import ReactMarkdown from 'react-markdown';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfigProvider,
  Layout,
  Modal,
  Result,
  Select,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ExclamationCircleOutlined, LinkOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';

import { useAuth } from '../../../hooks/useAuth';
import { peerPrepTheme } from '../../../lib/theme';
import { fetchSession, requestSessionToken, type SessionSnapshot } from '../../../lib/collab-client';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type LanguageOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

const BASE_LANGUAGE_OPTIONS: LanguageOption[] = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
];

const BASE_LANGUAGE_ORDER = BASE_LANGUAGE_OPTIONS.map((option) => option.value);
const SUPPORTED_LANGUAGES = new Set(BASE_LANGUAGE_ORDER);

const NORMALIZE_LANGUAGE_MAP: Record<string, string> = {
  typescript: 'javascript',
  'c++': 'cpp',
};

const normalizeLanguage = (language?: string | null): string => {
  if (!language) {
    return 'javascript';
  }
  const normalized = language.toLowerCase();
  const mapped = NORMALIZE_LANGUAGE_MAP[normalized] ?? normalized;
  return SUPPORTED_LANGUAGES.has(mapped) ? mapped : 'javascript';
};

const resolveMonacoLanguage = (language: string): string => (language === 'c' ? 'cpp' : language);

const difficultyColor: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'green',
  medium: 'gold',
  hard: 'red',
};

const wsBaseUrl = (process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? 'ws://localhost:4010/collab').replace(/\/$/, '');

export default function SessionPage({ params }: { params: { sessionId: string } }) {
  const { user, session: authSession, isAuthenticated, isReady: authReady } = useAuth();
  const router = useRouter();

  const [sessionSnapshot, setSessionSnapshot] = useState<SessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [currentLanguage, setCurrentLanguage] = useState<string>('javascript');
  const [presenceMap, setPresenceMap] = useState<Record<string, { name: string; connected: boolean }>>({});

  const ydoc = useMemo(() => new Y.Doc(), [params.sessionId]);
  const yText = useMemo(() => ydoc.getText('monaco'), [ydoc]);
  const settingsMap = useMemo(() => ydoc.getMap('settings'), [ydoc]);

  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const previousLanguageRef = useRef<string | null>(null);
  const languageContentRef = useRef<Record<string, string>>({});

  const localDisplayName = useMemo(() => {
    if (!user) return undefined;
    if (typeof user.userMetadata?.username === 'string') {
      return user.userMetadata.username as string;
    }
    return user.email ?? user.id;
  }, [user]);

  const sessionPath = useMemo(() => `/session/${params.sessionId}`, [params.sessionId]);
  const sessionUrl = useMemo(() => {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin.replace(/\/$/, '');
      return `${origin}${sessionPath}`;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
    return base ? `${base}${sessionPath}` : sessionPath;
  }, [sessionPath]);

  const questionLanguageSet = useMemo(() => {
    if (!sessionSnapshot) return new Set<string>();
    const starterCode = sessionSnapshot.question.starterCode ?? {};
    const languages = Object.entries(starterCode)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key]) => normalizeLanguage(key));
    return new Set(languages);
  }, [sessionSnapshot]);

  const languageOptions = useMemo(() => {
    const hasStrictLanguages = questionLanguageSet.size > 0;
    const options: LanguageOption[] = BASE_LANGUAGE_OPTIONS.map((option) => ({
      ...option,
      disabled: hasStrictLanguages && !questionLanguageSet.has(option.value) && option.value !== currentLanguage,
    }));

    if (hasStrictLanguages) {
      questionLanguageSet.forEach((language) => {
        if (!options.some((option) => option.value === language)) {
          options.push({
            label: language.charAt(0).toUpperCase() + language.slice(1),
            value: language,
            disabled: false,
          });
        }
      });
    }

    return options.sort((a, b) => {
      const aDisabled = Boolean(a.disabled);
      const bDisabled = Boolean(b.disabled);
      if (aDisabled !== bDisabled) {
        return aDisabled ? 1 : -1;
      }
      const aIndex = BASE_LANGUAGE_ORDER.indexOf(a.value);
      const bIndex = BASE_LANGUAGE_ORDER.indexOf(b.value);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return safeA - safeB;
    });
  }, [currentLanguage, questionLanguageSet]);

  useEffect(() => () => ydoc.destroy(), [ydoc]);

  useEffect(() => {
    previousLanguageRef.current = null;
    languageContentRef.current = {};
  }, [params.sessionId, sessionSnapshot?.sessionId]);

  useEffect(() => {
    if (!sessionSnapshot) {
      return;
    }

    setPresenceMap((prev) => {
      const next: Record<string, { name: string; connected: boolean }> = { ...prev };
      sessionSnapshot.participants.forEach((participant) => {
        const userId = participant.userId;
        const fallbackName =
          prev[userId]?.name ??
          participant.displayName ??
          (userId === user?.id && localDisplayName ? localDisplayName : userId);

        next[userId] = {
          name: fallbackName,
          connected: prev[userId]?.connected ?? false,
        };
      });

      Object.keys(next).forEach((userId) => {
        if (!sessionSnapshot.participants.some((participant) => participant.userId === userId)) {
          delete next[userId];
        }
      });

      return next;
    });
  }, [sessionSnapshot, user?.id, localDisplayName]);

  useEffect(() => {
    const observer = () => {
      const value = settingsMap.get('language');
      const normalized = normalizeLanguage(typeof value === 'string' ? value : undefined);

      if (typeof value === 'string' && normalized !== value) {
        settingsMap.set('language', normalized);
      }
      setCurrentLanguage(normalized);
    };

    observer();
    settingsMap.observe(observer);
    return () => settingsMap.unobserve(observer);
  }, [settingsMap]);

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

        const snippetLanguages = Array.from(
          new Set(
            Object.entries(session.question.starterCode ?? {})
              .filter(([, value]) => typeof value === 'string' && value && value.trim().length > 0)
              .map(([key]) => normalizeLanguage(key)),
          ),
        );
        const defaultLanguage = snippetLanguages[0] ?? 'javascript';
        if (!settingsMap.has('language')) {
          settingsMap.set('language', defaultLanguage);
        } else {
          const existing = settingsMap.get('language');
          if (typeof existing === 'string') {
            const normalizedExisting = normalizeLanguage(existing);
            if (normalizedExisting !== existing) {
              settingsMap.set('language', normalizedExisting);
            }
          }
        }

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
    settingsMap,
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

    const participantRecord = sessionSnapshot.participants.find((participant) => participant.userId === user.id);
    const resolvedDisplayName =
      participantRecord?.displayName ?? localDisplayName ?? participantRecord?.userId ?? user.id;

    const applyLocalState = (languageValue: string) => {
      const existingState = provider.awareness.getLocalState() ?? {};
      provider.awareness.setLocalState({
        ...existingState,
        participant: { userId: user.id, name: resolvedDisplayName },
        editor: { language: languageValue },
      });
    };

    applyLocalState(currentLanguage);

    const handleStatus = (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
      setConnectionStatus(event.status);
    };

    const updatePresence = () => {
      const states = provider.awareness.getStates();
      const connectedIds = new Set<string>();
      const namesFromPresence = new Map<string, string>();

      states.forEach((state) => {
        const participantState = state?.participant as { userId?: string; name?: string } | undefined;
        if (participantState?.userId) {
          connectedIds.add(participantState.userId);
          if (typeof participantState.name === 'string' && participantState.name.trim()) {
            namesFromPresence.set(participantState.userId, participantState.name);
          }
        }
      });

      setPresenceMap((prev) => {
        const next: Record<string, { name: string; connected: boolean }> = { ...prev };

        if (sessionSnapshot) {
          sessionSnapshot.participants.forEach((participant) => {
            const userId = participant.userId;
            const presenceName = namesFromPresence.get(userId);
            const previousName = prev[userId]?.name;
            const fallbackName =
              presenceName ??
              previousName ??
              participant.displayName ??
              (userId === user.id && resolvedDisplayName ? resolvedDisplayName : userId);

            next[userId] = {
              name: fallbackName,
              connected: connectedIds.has(userId),
            };
          });
        }

        Object.keys(next).forEach((userId) => {
          if (!sessionSnapshot?.participants.some((participant) => participant.userId === userId)) {
            delete next[userId];
          } else if (!connectedIds.has(userId)) {
            next[userId] = {
              ...next[userId],
              connected: false,
            };
          }
        });

        return next;
      });
    };

    provider.on('status', handleStatus);
      provider.awareness.on('update', updatePresence);
      updatePresence();

      return () => {
        provider.off('status', handleStatus);
        provider.awareness.off('update', updatePresence);
        provider.destroy();
        providerRef.current = null;
        setPresenceMap({});
        setConnectionStatus('disconnected');
      };
  }, [sessionSnapshot, sessionToken, user, ydoc, localDisplayName]);

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
  }, [sessionSnapshot, sessionToken, yText]);

  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) {
      return;
    }

    const existingState = provider.awareness.getLocalState() ?? {};
    provider.awareness.setLocalState({
      ...existingState,
      editor: { language: currentLanguage },
    });
  }, [currentLanguage]);

  const getStarterCode = useCallback(
    (language: string): string | undefined => {
      if (!sessionSnapshot) {
        return undefined;
      }
      const target = normalizeLanguage(language);
      const starterRecord = sessionSnapshot.question.starterCode ?? {};
      for (const [key, value] of Object.entries(starterRecord)) {
        if (normalizeLanguage(key) === target && typeof value === 'string' && value.trim().length > 0) {
          return value;
        }
      }
      return undefined;
    },
    [sessionSnapshot],
  );

  useEffect(() => {
    if (!sessionSnapshot) {
      return;
    }

    const docText = yText.toString();
    const previousLanguage = previousLanguageRef.current;

    if (previousLanguage && previousLanguage !== currentLanguage) {
      languageContentRef.current[previousLanguage] = docText;
    }

    const storedContent = languageContentRef.current[currentLanguage];
    const starterContent = getStarterCode(currentLanguage);

    const nextContent =
      storedContent !== undefined
        ? storedContent
        : starterContent !== undefined
        ? starterContent
        : docText;

    if (docText !== nextContent) {
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        if (nextContent) {
          yText.insert(0, nextContent);
        }
      });
    }

    if (typeof nextContent === 'string') {
      languageContentRef.current[currentLanguage] = nextContent;
    }

    previousLanguageRef.current = currentLanguage;
  }, [currentLanguage, getStarterCode, sessionSnapshot, yText, ydoc]);

  const handleEditorMount = (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    setTimeout(() => editor.layout(), 0);
    const model = editor.getModel();
    if (!model) {
      return;
    }

    monaco.editor.setModelLanguage(model, resolveMonacoLanguage(currentLanguage));

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
      monaco.editor.setModelLanguage(model, resolveMonacoLanguage(currentLanguage));
    }
  }, [currentLanguage]);

  const handleLeaveSession = () => {
    Modal.confirm({
      title: 'Leave session?',
      icon: <ExclamationCircleOutlined />,
      centered: true,
      content: (
        <Space direction="vertical" size="small">
          <Text style={{ color: '#000' }}>Are you sure you want to leave the session?</Text>
          <Text style={{ color: '#000' }}>You can rejoin in the next 5 minutes with the following URL:</Text>
          <Paragraph copyable style={{ marginBottom: 0, color: '#000' }}>
            {sessionUrl}
          </Paragraph>
        </Space>
      ),
      okText: 'Leave session',
      cancelText: 'Stay',
      okButtonProps: { danger: true },
      onOk: () => {
        router.push('/dashboard');
      },
    });
  };

  const participantBanner = useMemo(() => {
    if (!sessionSnapshot) return null;

    return (
      <Space size="large" align="center" wrap>
        {sessionSnapshot.participants.map((participant) => {
          const presence = presenceMap[participant.userId];
          const connected = presence?.connected ?? false;
          const displayName =
            presence?.name ??
            participant.displayName ??
            (participant.userId === user?.id && localDisplayName ? localDisplayName : participant.userId);

          return (
            <Badge
              key={participant.userId}
              status={connected ? 'success' : 'default'}
              text={
                <Space size="small">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text>{displayName}</Text>
                </Space>
              }
            />
          );
        })}
      </Space>
    );
  }, [presenceMap, sessionSnapshot, user?.id, localDisplayName]);

  const questionContent = useMemo(() => {
    const question = sessionSnapshot?.question;
    if (!question) return null;

    const rawDifficulty = question.metadata?.difficulty ?? sessionSnapshot?.difficulty;
    const difficulty = typeof rawDifficulty === 'string' ? (rawDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard') : 'medium';
    const badgeColor = difficultyColor[difficulty] ?? 'default';

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="baseline" size="middle">
          <Title level={3} style={{ margin: 0, color: 'var(--text)' }}>
            {question.title}
          </Title>
          <Tag color={badgeColor}>{difficulty.toUpperCase()}</Tag>
        </Space>
        {question.metadata?.topics?.length ? (
          <Space wrap>
            {question.metadata.topics.map((topic) => (
              <Tag key={topic}>{topic}</Tag>
            ))}
          </Space>
        ) : null}
        <ReactMarkdown className="markdown-body">{question.prompt}</ReactMarkdown>
      </Space>
    );
  }, [sessionSnapshot]);

  if (!authReady || (authReady && !isAuthenticated)) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Content className="main-content">
            <Result
              status="403"
              title="Please sign in"
              subTitle="An authenticated account is required to join collaboration sessions."
            />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  if (loading) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
          }}
        >
          <Spin tip="Preparing your session..." size="large" />
        </div>
      </ConfigProvider>
    );
  }

  if (error || !sessionSnapshot) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Content className="main-content">
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
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  const sessionTitle =
    sessionSnapshot.question?.title ??
    `Session ${sessionSnapshot.sessionId.slice(-6).toUpperCase()}`;

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
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>
                  PeerPrep Collaboration Session
                </Title>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Text style={{ color: 'var(--muted)' }}>{sessionTitle}</Text>
                  <Tag
                    icon={<LinkOutlined />}
                    color={
                      connectionStatus === 'connected'
                        ? 'green'
                        : connectionStatus === 'connecting'
                        ? 'gold'
                        : 'default'
                    }
                  >
                    {connectionStatus.toUpperCase()}
                  </Tag>
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {participantBanner}
              <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleLeaveSession}>
                Leave session
              </Button>
            </div>
          </div>
        </Header>
        <Content className="main-content">
          <div className="blob" aria-hidden="true" />
          <div className="blob-bottom" aria-hidden="true" />
          <div className="bg-blur-overlay" aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'grid',
                gap: 24,
                gridTemplateColumns: 'minmax(320px, 1fr) minmax(480px, 1.4fr)',
              }}
            >
              <Card
                className="dark-card"
                bordered
                title={
                  <Text style={{ color: 'var(--text)', fontWeight: 600, letterSpacing: 0.5 }}>
                    Problem Statement
                  </Text>
                }
                headStyle={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}
                bodyStyle={{ padding: 24 }}
              >
                {questionContent ?? <Skeleton active paragraph={{ rows: 8 }} />}
              </Card>
              <Card
                className="dark-card"
                bordered
                bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <div
                  style={{
                    borderBottom: '1px solid var(--border)',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <Space size="middle">
                    <Text style={{ color: 'var(--muted)' }}>Language</Text>
                    <Select
                      size="small"
                      value={currentLanguage}
                      onChange={(value) => {
                        const normalized = normalizeLanguage(value);
                        settingsMap.set('language', normalized);
                        setCurrentLanguage(normalized);
                      }}
                      style={{ minWidth: 140 }}
                      popupMatchSelectWidth={false}
                      dropdownStyle={{ background: '#fff', color: '#000' }}
                    >
                      {languageOptions.map((option) => (
                        <Select.Option
                          key={option.value}
                          value={option.value}
                          style={{ color: '#000' }}
                          disabled={option.disabled}
                        >
                          {option.label}
                          {option.disabled ? ' (not provided)' : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </Space>
                </div>
                <div style={{ flex: 1, minHeight: 520 }}>
                  <MonacoEditor
                    height="100%"
                    language={currentLanguage}
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
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
