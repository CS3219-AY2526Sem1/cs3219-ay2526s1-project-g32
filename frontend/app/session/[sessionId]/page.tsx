'use client';

/* eslint-disable @next/next/no-img-element */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Monaco } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
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
};

type LanguageDocEntry = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  text: Y.Text;
  dispose: () => void;
};

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
};

const DEFAULT_LANGUAGES = Object.keys(LANGUAGE_LABELS);

const normalizeLanguage = (language?: string | null) => (language ? language.toLowerCase() : 'javascript');
const resolveMonacoLanguage = (language: string) => (language === 'c' ? 'cpp' : language);
const labelForLanguage = (language: string) => LANGUAGE_LABELS[language] ?? language.toUpperCase();
const difficultyColor: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'green',
  medium: 'gold',
  hard: 'red',
};

const wsBaseUrl = (process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? 'ws://localhost:4010/collab').replace(/\/$/, '');

const markdownComponents: Components = {
  img: ({ alt, src }) => (
    <img
      alt={alt ?? ''}
      src={src ?? ''}
      style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
    />
  ),
};

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

  const sessionSnapshotRef = useRef<SessionSnapshot | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const stateDocRef = useRef<Y.Doc | null>(null);
  const stateProviderRef = useRef<WebsocketProvider | null>(null);
  const stateProviderCleanupRef = useRef<(() => void) | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const currentLanguageRef = useRef<string>('javascript');

  const languageEntriesRef = useRef<Record<string, LanguageDocEntry>>({});
  const languageModelsRef = useRef<Record<string, MonacoEditorNS.ITextModel>>({});
  const pendingLanguageRef = useRef<string | null>(null);
  const basePresenceRef = useRef<Record<string, { name: string; connected: boolean }>>({});
  const pendingBindLanguageRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const loadMonacoContributions = async () => {
      await Promise.all([
        import('monaco-editor/esm/vs/basic-languages/python/python.contribution'),
        import('monaco-editor/esm/vs/basic-languages/java/java.contribution'),
        import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution'),
      ]);
    };

    loadMonacoContributions().catch((error) => {
      console.error('Failed to load Monaco language contributions', error);
    });
  }, []);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
      if (stateProviderCleanupRef.current) {
        stateProviderCleanupRef.current();
        stateProviderCleanupRef.current = null;
      }
      Object.values(languageEntriesRef.current).forEach((entry) => {
        entry.dispose();
      });
      languageEntriesRef.current = {};
      stateProviderRef.current?.destroy();
      stateDocRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    currentLanguageRef.current = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
    const previousSnapshot = sessionSnapshotRef.current;
    sessionSnapshotRef.current = sessionSnapshot;
    if (!sessionSnapshot || (previousSnapshot && previousSnapshot.sessionId !== sessionSnapshot.sessionId)) {
      Object.values(languageEntriesRef.current).forEach((entry) => entry.dispose());
      languageEntriesRef.current = {};
    }
    if (sessionSnapshot) {
      const base: Record<string, { name: string; connected: boolean }> = {};
      sessionSnapshot.participants.forEach((participant) => {
        base[participant.userId] = {
          name: participant.displayName ?? participant.userId,
          connected: false,
        };
      });
      basePresenceRef.current = base;
      setPresenceMap(base);
    }
  }, [sessionSnapshot]);

  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

  const resolvedDisplayName = useMemo(() => {
    if (!user) return undefined;
    const participantName =
      sessionSnapshot?.participants.find((participant) => participant.userId === user.id)?.displayName ?? null;
    if (typeof participantName === 'string' && participantName.trim().length > 0) {
      return participantName;
    }
    const usernameMetadata =
      typeof user.userMetadata?.username === 'string' && (user.userMetadata.username as string).trim().length > 0
        ? (user.userMetadata.username as string)
        : undefined;
    return usernameMetadata ?? user.email ?? user.id;
  }, [sessionSnapshot, user]);

  const sessionPath = useMemo(() => `/session/${params.sessionId}`, [params.sessionId]);
  const sessionUrl = useMemo(() => {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin.replace(/\/$/, '');
      return `${origin}${sessionPath}`;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
    return base ? `${base}${sessionPath}` : sessionPath;
  }, [sessionPath]);

  const availableLanguages = useMemo(() => {
    const docs = sessionSnapshot?.documents.languages ?? {};
    const keys = Object.keys(docs);
    if (keys.length === 0) {
      return DEFAULT_LANGUAGES;
    }
    return Array.from(new Set(keys.map((language) => normalizeLanguage(language))));
  }, [sessionSnapshot]);

  const defaultLanguage = useMemo(() => availableLanguages[0] ?? 'javascript', [availableLanguages]);

  const languageOptions = useMemo<LanguageOption[]>(() => {
    const order = new Map(DEFAULT_LANGUAGES.map((language, index) => [language, index]));
    return availableLanguages
      .slice()
      .sort((a, b) => {
        const indexA = order.has(a) ? (order.get(a) as number) : Number.MAX_SAFE_INTEGER;
        const indexB = order.has(b) ? (order.get(b) as number) : Number.MAX_SAFE_INTEGER;
        return indexA - indexB;
      })
      .map((language) => ({
        label: labelForLanguage(language),
        value: language,
      }));
  }, [availableLanguages]);

  const handleLeaveSession = useCallback(() => {
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
  }, [router, sessionUrl]);

  const updatePresenceForLanguage = useCallback(
    (language: string) => {
      if (currentLanguageRef.current !== language) {
        return;
      }
      const basePresence = basePresenceRef.current;
      const entry = languageEntriesRef.current[language];
      if (!entry) {
        setPresenceMap(basePresence);
        return;
      }
      const next: Record<string, { name: string; connected: boolean }> = { ...basePresence };
      entry.provider.awareness.getStates().forEach((state) => {
        const participant = state?.participant as { userId?: string; name?: string } | undefined;
        if (participant?.userId) {
          next[participant.userId] = {
            name: participant.name ?? participant.userId,
            connected: true,
          };
        }
      });
      setPresenceMap(next);
    },
    [setPresenceMap],
  );

  const bindEditorToLanguage = useCallback(
    (language: string) => {
      const normalized = normalizeLanguage(language);
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const entry = languageEntriesRef.current[normalized];

      if (!entry || !editor || !monaco) {
        pendingBindLanguageRef.current = normalized;
        return false;
      }

    pendingBindLanguageRef.current = null;

    let model = languageModelsRef.current[normalized];
    if (!model) {
        model = monaco.editor.createModel('', resolveMonacoLanguage(normalized));
        languageModelsRef.current[normalized] = model;
      }

      if (editor.getModel() !== model) {
      editor.setModel(model);
    }

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(entry.text, model, new Set([editor]), entry.provider.awareness);
    const providerState =
      (entry.provider as unknown as { synced?: boolean }).synced === true || entry.provider.wsconnected
        ? 'connected'
        : 'connecting';
    setConnectionStatus(providerState);
    updatePresenceForLanguage(normalized);
    return true;
  },
  [updatePresenceForLanguage],
);

  const ensureLanguageEntry = useCallback(
    (language: string): LanguageDocEntry | null => {
      const normalized = normalizeLanguage(language);
      const existing = languageEntriesRef.current[normalized];
      if (existing) {
        if (currentLanguageRef.current === normalized) {
          const bound = bindEditorToLanguage(normalized);
          if (!bound) {
            setConnectionStatus(existing.provider.wsconnected ? 'connected' : 'connecting');
          }
          updatePresenceForLanguage(normalized);
        }
        return existing;
      }

      const snapshot = sessionSnapshotRef.current;
      const token = sessionTokenRef.current;
      if (!snapshot || !token) {
        return null;
      }

      const docKey =
        snapshot.documents.languages[normalized] ??
        snapshot.documents.languages[language] ??
        snapshot.documents.languages[normalizeLanguage(normalized)];
      if (!docKey) {
        console.warn('No document ID available for language', language);
        return null;
      }

      const docPath = `${snapshot.sessionId}/${docKey}`;
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(wsBaseUrl, docPath, doc, {
        params: { token },
      });
      const text = doc.getText('monaco');

      const entry: LanguageDocEntry = {
        doc,
        provider,
        text,
        dispose: () => undefined,
      };

      const participantRecord = snapshot.participants.find((participant) => participant.userId === user?.id);
      const participantDisplayName =
        (participantRecord?.displayName && participantRecord.displayName.trim().length > 0
          ? participantRecord.displayName
          : resolvedDisplayName) ?? participantRecord?.userId ?? user?.id ?? 'Anonymous';

      provider.awareness.setLocalState({
        participant: { userId: user?.id ?? 'anonymous', name: participantDisplayName },
        editor: { language: normalized },
      });

      const handleStatus = ({ status }: { status: 'connected' | 'connecting' | 'disconnected' }) => {
        if (currentLanguageRef.current === normalized) {
          setConnectionStatus(status);
        }
      };

      const handlePresenceUpdate = () => {
        updatePresenceForLanguage(normalized);
      };

      const handleSync = (isSynced: boolean) => {
        if (currentLanguageRef.current === normalized) {
          setConnectionStatus(isSynced ? 'connected' : 'connecting');
        }
        if (!isSynced) {
          return;
        }
        bindEditorToLanguage(normalized);
        handlePresenceUpdate();
      };

      provider.awareness.on('update', handlePresenceUpdate);
      provider.on('status', handleStatus);
      provider.on('sync', handleSync);

      entry.dispose = () => {
        provider.awareness.off('update', handlePresenceUpdate);
        provider.off('status', handleStatus);
        provider.off('sync', handleSync);
        provider.destroy();
        doc.destroy();
      };

      languageEntriesRef.current[normalized] = entry;

      if (currentLanguageRef.current === normalized) {
        const bound = bindEditorToLanguage(normalized);
        if (!bound) {
          setConnectionStatus(provider.wsconnected ? 'connected' : 'connecting');
        }
        handlePresenceUpdate();
      }

      if (currentLanguageRef.current === normalized && provider.wsconnected) {
        setConnectionStatus('connected');
      }

      return entry;
    },
    [bindEditorToLanguage, resolvedDisplayName, updatePresenceForLanguage, user],
  );

  const applyLanguageSwitch = useCallback(
    (language: string, options: { force?: boolean } = {}) => {
      const normalized = normalizeLanguage(language);
      if (!options.force && normalized === currentLanguageRef.current) {
        return;
      }
      currentLanguageRef.current = normalized;
      setCurrentLanguage(normalized);
      const entry = ensureLanguageEntry(normalized);
      if (!entry) {
        setConnectionStatus('connecting');
      }
    },
    [ensureLanguageEntry],
  );

  const handleLanguageChange = useCallback(
    (value: string) => {
      const normalized = normalizeLanguage(value);
      pendingLanguageRef.current = normalized;
      const settings = stateDocRef.current?.getMap('settings');
      if (settings) {
        const current = settings.get('language');
        if (current !== normalized) {
          stateDocRef.current!.transact(() => {
            settings.set('language', normalized);
          });
        } else {
          pendingLanguageRef.current = null;
          applyLanguageSwitch(normalized, { force: true });
        }
      } else {
        applyLanguageSwitch(normalized, { force: true });
      }
    },
    [applyLanguageSwitch],
  );

  useEffect(() => {
    if (!authReady || !isAuthenticated || !authSession?.accessToken || !user?.id) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        const session = await fetchSession(params.sessionId);
        if (cancelled) return;
        setSessionSnapshot(session);

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

    bootstrap().catch((err) => {
      console.error(err);
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, authSession?.accessToken, params.sessionId, user?.id]);

  useEffect(() => {
    if (!sessionSnapshot || !sessionToken) {
      return;
    }

    if (stateProviderCleanupRef.current) {
      stateProviderCleanupRef.current();
      stateProviderCleanupRef.current = null;
    }

    const stateDocKey = sessionSnapshot.documents.state ?? 'state';
    const stateDocName = `${sessionSnapshot.sessionId}/${stateDocKey}`;
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(wsBaseUrl, stateDocName, doc, {
      params: { token: sessionToken },
    });

    stateDocRef.current = doc;
    stateProviderRef.current = provider;

    const settings = doc.getMap<string>('settings');

    const handleSync = (isSynced: boolean) => {
      if (!isSynced) {
        return;
      }
      const requested =
        pendingLanguageRef.current ??
        (typeof settings.get('language') === 'string'
          ? normalizeLanguage(settings.get('language') as string)
          : defaultLanguage);

      if (!settings.has('language')) {
        doc.transact(() => {
          settings.set('language', requested);
        });
      } else {
        pendingLanguageRef.current = null;
        applyLanguageSwitch(requested, { force: true });
      }
    };

    const handleSettingsChange = () => {
      const value = settings.get('language');
      if (typeof value === 'string') {
        pendingLanguageRef.current = null;
        applyLanguageSwitch(value);
      }
    };

    provider.on('sync', handleSync);
    settings.observe(handleSettingsChange);

    const cleanup = () => {
      provider.off('sync', handleSync);
      settings.unobserve(handleSettingsChange);
      provider.destroy();
      doc.destroy();
      stateDocRef.current = null;
      stateProviderRef.current = null;
    };

    stateProviderCleanupRef.current = cleanup;

    return cleanup;
  }, [applyLanguageSwitch, defaultLanguage, sessionSnapshot, sessionToken]);

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

  useEffect(() => {
    const targetLanguage = pendingBindLanguageRef.current ?? currentLanguageRef.current;
    const entry = ensureLanguageEntry(targetLanguage);
    if (!entry) {
      setConnectionStatus('connecting');
    }
  }, [ensureLanguageEntry, sessionSnapshot, sessionToken]);

  const handleEditorMount = useCallback(
    (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      setTimeout(() => editor.layout(), 0);
      const language = currentLanguageRef.current;
      bindEditorToLanguage(language);
    },
    [bindEditorToLanguage],
  );

  const questionContent = useMemo(() => {
    const snapshot = sessionSnapshot;
    if (!snapshot) return null;

    const question = snapshot.question;
    const rawDifficulty = question.metadata?.difficulty ?? snapshot.difficulty;
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
        <ReactMarkdown className="markdown-body" components={markdownComponents}>
          {question.prompt}
        </ReactMarkdown>
      </Space>
    );
  }, [sessionSnapshot]);

  const participantBanner = useMemo(() => {
    const snapshot = sessionSnapshot;
    if (!snapshot) return null;

    return (
      <Space size="middle" wrap>
        {snapshot.participants.map((participant) => {
          const presence = presenceMap[participant.userId];
          const connected = Boolean(presence?.connected);
          const displayName = presence?.name ?? participant.displayName ?? participant.userId;

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
  }, [presenceMap, sessionSnapshot]);

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

  if (error) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Content className="main-content">
            <Result
              status="error"
              title="Unable to load collaboration session"
              subTitle={error}
              extra={
                <Button type="primary" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              }
            />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  const sessionTitle =
    sessionSnapshot
      ? sessionSnapshot.question?.title ??
        `Session ${sessionSnapshot.sessionId.slice(-6).toUpperCase()}`
      : 'Session';

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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
                minWidth: 0,
              }}
            >
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
                <Title level={4} style={{ margin: 0, color: '#fff', lineHeight: 1.2 }}>
                  PeerPrep Collaboration Session
                </Title>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    color: 'var(--muted)',
                    minWidth: 0,
                  }}
                >
                  <Text
                    style={{
                      color: 'var(--muted)',
                      margin: 0,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {sessionTitle}
                  </Text>
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
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 16,
                rowGap: 12,
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
                      onChange={handleLanguageChange}
                      style={{ minWidth: 140 }}
                      popupMatchSelectWidth={false}
                      dropdownStyle={{ background: '#fff', color: '#000' }}
                    >
                      {languageOptions.map((option) => (
                        <Select.Option key={option.value} value={option.value} style={{ color: '#000' }}>
                          {option.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Space>
                </div>
                <div style={{ flex: 1, minHeight: 520 }}>
                  <MonacoEditor
                    height="100%"
                    language={resolveMonacoLanguage(currentLanguage)}
                    theme="vs-dark"
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                    }}
                    onMount={handleEditorMount}
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
