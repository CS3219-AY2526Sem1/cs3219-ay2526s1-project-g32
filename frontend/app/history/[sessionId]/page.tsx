'use client';

/* eslint-disable @next/next/no-img-element */

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import {
  Button,
  Card,
  ConfigProvider,
  Layout,
  Result,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { LogoutOutlined, ReadOutlined } from '@ant-design/icons';

import { useAuth } from '../../../hooks/useAuth';
import { peerPrepTheme } from '../../../lib/theme';
import {
  fetchSessionAttemptDetail,
  type SessionAttemptRecord,
} from '../../../lib/api-client';
import { fetchQuestionById, type QuestionDetail } from '../../../lib/question-client';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
};

const LANGUAGE_FIELD_MAP = {
  javascript: 'code_javascript',
  python: 'code_python',
  java: 'code_java',
  c: 'code_c',
  cpp: 'code_cpp',
} as const;

const difficultyColor: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'green',
  medium: 'gold',
  hard: 'red',
};

const markdownComponents: Components = {
  img: ({ alt, src }) => (
    <img
      alt={alt ?? ''}
      src={src ?? ''}
      style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
    />
  ),
};

type AttemptParticipant = {
  userId: string;
  displayName?: string;
};

const normalizeLanguage = (language?: string | null) =>
  language ? language.toLowerCase() : 'javascript';

const resolveMonacoLanguage = (language: string) => (language === 'c' ? 'cpp' : language);

const labelForLanguage = (language: string) =>
  LANGUAGE_LABELS[language] ?? language.toUpperCase();

type ParticipantPayload = { userId?: unknown; displayName?: unknown };

const toParticipantList = (participants: SessionAttemptRecord['participants']) => {
  if (!participants) {
    return [];
  }

  if (Array.isArray(participants)) {
    return participants as ParticipantPayload[];
  }

  if (typeof participants === 'object') {
    return Object.values(participants) as ParticipantPayload[];
  }

  return [];
};

const parseParticipants = (
  participants: SessionAttemptRecord['participants'],
): AttemptParticipant[] => {
  return toParticipantList(participants)
    .map((entry): AttemptParticipant | null => {
      if (!entry || typeof entry !== 'object' || typeof entry.userId !== 'string') {
        return null;
      }

      return {
        userId: entry.userId,
        displayName:
          typeof entry.displayName === 'string' ? entry.displayName : undefined,
      };
    })
    .filter((entry): entry is AttemptParticipant => entry !== null);
};

type LanguageField = typeof LANGUAGE_FIELD_MAP[keyof typeof LANGUAGE_FIELD_MAP];

const buildCodeMap = (attempt: SessionAttemptRecord | null) => {
  return (Object.entries(LANGUAGE_FIELD_MAP) as Array<[string, LanguageField]>).reduce<
    Record<string, string>
  >((acc, [language, field]) => {
    const value = attempt ? attempt[field] : null;
    acc[language] = typeof value === 'string' ? value : '';
    return acc;
  }, {});
};

const selectInitialLanguage = (codeMap: Record<string, string>) => {
  const languages = Object.keys(codeMap);
  if (languages.length === 0) {
    return 'javascript';
  }

  const populated = languages.find((language) => (codeMap[language] ?? '').trim().length > 0);
  return populated ?? languages[0];
};

export default function SessionHistoryPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { session: authSession, isAuthenticated, isReady: authReady } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<SessionAttemptRecord | null>(null);
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(() =>
    buildCodeMap(null),
  );
  const [currentLanguage, setCurrentLanguage] = useState<string>('javascript');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const loadContributions = async () => {
      await Promise.all([
        import('monaco-editor/esm/vs/basic-languages/python/python.contribution'),
        import('monaco-editor/esm/vs/basic-languages/java/java.contribution'),
        import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution'),
      ]);
    };

    loadContributions().catch((err) => {
      console.warn('Failed to load Monaco contributions', err);
    });
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated || !authSession?.accessToken) {
      setLoading(false);
      setError('You must be signed in to view this history entry.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadHistory = async () => {
      try {
        const { attempt } = await fetchSessionAttemptDetail(
          params.sessionId,
          authSession.accessToken,
        );
        if (cancelled) return;

        setAttempt(attempt);

        const codeMap = buildCodeMap(attempt);
        setCodeByLanguage(codeMap);
        setCurrentLanguage((previous) => {
          if (previous && Object.prototype.hasOwnProperty.call(codeMap, previous)) {
            return previous;
          }
          return selectInitialLanguage(codeMap);
        });

        if (attempt.question_id) {
          try {
            const question = await fetchQuestionById(attempt.question_id);
            if (!cancelled) {
              setQuestion(question);
            }
          } catch (fetchError) {
            console.warn('Unable to load question', fetchError);
          }
        }
      } catch (historyError) {
        if (!cancelled) {
          setError(historyError instanceof Error ? historyError.message : 'Failed to load history');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, authSession?.accessToken, params.sessionId]);

  const participants = useMemo(() => parseParticipants(attempt?.participants ?? null), [attempt]);

  const languageOptions = useMemo(() => {
    return Object.keys(codeByLanguage).map((language) => ({
      value: language,
      label: labelForLanguage(language),
    }));
  }, [codeByLanguage]);

  useEffect(() => {
    if (languageOptions.length === 0) {
      return;
    }

    if (!languageOptions.some((option) => option.value === currentLanguage)) {
      setCurrentLanguage(languageOptions[0].value);
    }
  }, [languageOptions, currentLanguage]);

  const sessionTitle = question?.title ?? attempt?.question_title ?? 'Collaboration attempt';
  const description = question?.description ?? 'Question description unavailable.';
  const difficultyKey = question?.difficulty
    ? (normalizeLanguage(question.difficulty) as 'easy' | 'medium' | 'hard')
    : undefined;
  const topics = question?.topics ?? [];
  const codeValue = codeByLanguage[currentLanguage] ?? '';
  const startedAt = attempt?.started_at
    ? new Date(attempt.started_at).toLocaleString()
    : 'Unknown';
  const endedAt = attempt?.ended_at ? new Date(attempt.ended_at).toLocaleString() : 'Unknown';

  const handleExit = () => {
    router.push('/dashboard');
  };

  if (!authReady) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Content className="main-content">
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh',
              }}
            >
              <Title level={4} style={{ color: 'var(--text)' }}>
                Loading session history...
              </Title>
            </div>
          </Content>
        </Layout>
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
              title="Unable to load session history"
              subTitle={error}
              extra={
                <Button type="primary" onClick={() => router.push('/dashboard')}>
                  Back to dashboard
                </Button>
              }
            />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: 'var(--primary-500)' }}
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
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <Text style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: 0.5 }}>
                  Peerprep Collaboration Session History
                </Text>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sessionTitle}
                </Text>
                <Space size="small" wrap>
                  {question?.difficulty && (
                    <Tag
                      color={difficultyKey ? difficultyColor[difficultyKey] : 'default'}
                      style={{ marginInlineEnd: 0 }}
                    >
                      {question.difficulty}
                    </Tag>
                  )}
                  <Tag icon={<ReadOutlined />} color="geekblue" style={{ marginInlineEnd: 0 }}>
                    Read only
                  </Tag>
                </Space>
              </div>
            </div>
            <Button type="primary" icon={<LogoutOutlined />} onClick={handleExit}>
              Exit
            </Button>
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
                {loading ? (
                  <Skeleton active paragraph={{ rows: 8 }} />
                ) : (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Text style={{ color: 'var(--muted)', fontSize: 13 }}>
                        Started: {startedAt}
                      </Text>
                      <Text style={{ color: 'var(--muted)', fontSize: 13 }}>Ended: {endedAt}</Text>
                      {topics.length > 0 && (
                        <Space size="small" wrap>
                          {topics.map((topic) => (
                            <Tag key={topic} color="purple">
                              {topic}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </div>

                    {participants.length > 0 && (
                      <div>
                        <Text style={{ color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                          Participants
                        </Text>
                        <Space size={[12, 12]} wrap>
                          {participants.map((participant) => (
                            <Tag key={participant.userId} color="volcano">
                              {participant.displayName ?? participant.userId}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}

                    <div className="markdown-body">
                      <ReactMarkdown components={markdownComponents}>{description}</ReactMarkdown>
                    </div>
                  </Space>
                )}
              </Card>

              <Card
                className="dark-card"
                bordered
                bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 560 }}
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
                      onChange={(value) => setCurrentLanguage(value)}
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
                <div style={{ flex: 1 }}>
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 12 }} style={{ padding: 24 }} />
                  ) : (
                    <MonacoEditor
                      height="100%"
                      language={resolveMonacoLanguage(currentLanguage)}
                      value={codeValue}
                      theme="vs-dark"
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        readOnly: true,
                        lineNumbers: 'on',
                      }}
                    />
                  )}
                </div>
              </Card>
            </div>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
