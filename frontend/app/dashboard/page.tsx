"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button, Card, Col, ConfigProvider, Layout, List, Row, Space, Typography } from "antd";

import { useAuth } from "../../hooks/useAuth";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { peerPrepTheme } from "../../lib/theme";
import { fetchActiveSessionForUser, type ActiveSessionResponse } from "../../lib/collab-client";
import { fetchUserHistory, fetchSessionAttemptDetail } from "../../lib/api-client";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LANDING_ROUTE = "/" as Route;
type HistoryListItem = {
  sessionAttemptId: string;
  questionTitle: string;
  endedAt: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useRequireAuth();
  const { user, session, logout } = useAuth();

  const accessToken = session?.accessToken ?? null;
  const userId = user?.id ?? null;
  const [activeSession, setActiveSession] = useState<ActiveSessionResponse | null>(null);
  const [checkingActive, setCheckingActive] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !userId || !accessToken) {
      setActiveSession(null);
      return;
    }

    let cancelled = false;
    setCheckingActive(true);

    fetchActiveSessionForUser({ userId, accessToken })
      .then((result) => {
        if (cancelled) return;
        setActiveSession(result);
      })
      .catch((error) => {
        if (cancelled) return;
        setActiveSession(null);
        console.warn("Failed to fetch active session", error);
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingActive(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, isReady, userId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !accessToken) {
      setHistoryItems([]);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    const loadHistory = async () => {
      try {
        const { attempts } = await fetchUserHistory(accessToken);
        if (cancelled) return;

        if (attempts.length === 0) {
          setHistoryItems([]);
          return;
        }

        const details = await Promise.all(
          attempts.map(async (attempt) => {
            try {
              const { attempt: detail } = await fetchSessionAttemptDetail(
                attempt.session_attempt_id,
                accessToken,
              );
              return {
                sessionAttemptId: detail.id ?? attempt.session_attempt_id,
                questionId: detail.question_id ?? null,
                questionTitle: detail.question_title ?? null,
                endedAt: detail.ended_at ?? null,
              };
            } catch {
              return null;
            }
          }),
        );

        if (cancelled) return;

        const validDetails = details.filter(
          (
            detail,
          ): detail is {
            sessionAttemptId: string;
            questionId: number | null;
            questionTitle: string | null;
            endedAt: string | null;
          } => Boolean(detail && detail.sessionAttemptId),
        );

        if (validDetails.length === 0) {
          setHistoryItems([]);
          return;
        }

        const toTimestamp = (value: string | null) => {
          if (!value) return 0;
          const parsed = Date.parse(value);
          return Number.isNaN(parsed) ? 0 : parsed;
        };

        const items = validDetails
          .map((detail) => ({
            sessionAttemptId: detail.sessionAttemptId,
            questionTitle:
              typeof detail.questionTitle === "string" && detail.questionTitle.trim().length > 0
                ? detail.questionTitle
                : detail.questionId !== null
                  ? `Question #${detail.questionId}`
                  : "Unknown question",
            endedAt: detail.endedAt,
          }))
          .sort((a, b) => toTimestamp(b.endedAt) - toTimestamp(a.endedAt));

        setHistoryItems(items);
      } catch (error) {
        if (!cancelled) {
          setHistoryItems([]);
          if (error instanceof Error) {
            setHistoryError(error.message);
          } else {
            setHistoryError("Unable to load attempt history");
          }
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, isReady]);

  if (!isReady) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: "100vh", background: "var(--bg)" }}>
          <Content className="main-content">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
              <Title level={4} style={{ color: "var(--text)" }}>
                Loading session...
              </Title>
            </div>
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const username =
    user && typeof user.userMetadata?.username === "string"
      ? (user.userMetadata.username as string)
      : "-";

  const formatAttemptDate = (value: string | null) => {
    if (!value) {
      return "In progress";
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return "In progress";
    }
    return new Date(parsed).toLocaleString();
  };

  return (
    <ConfigProvider theme={peerPrepTheme}>
      <Layout style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Header className="header-dark">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: "var(--primary-600)" }}
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
              <Title level={4} style={{ color: "#fff", margin: 0 }}>
                PeerPrep Dashboard
              </Title>
            </div>

            <Space>
              <Button type="link" onClick={logout}>
                Log out
              </Button>
              <Button type="primary" href={LANDING_ROUTE}>
                Back to landing
              </Button>
            </Space>
          </div>
        </Header>

        <Content className="main-content">
          <div className="blob" aria-hidden="true" />
          <div className="blob-bottom" aria-hidden="true" />
          <div className="bg-blur-overlay" aria-hidden="true" />

          <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto" }}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {checkingActive && (
                <Card className="dark-card" bordered>
                  <Text style={{ color: "var(--muted)" }}>Checking for active sessions...</Text>
                </Card>
              )}

              {activeSession && (
                <Card
                  className="dark-card"
                  bordered
                  style={{ borderColor: "#52c41a", background: "rgba(82, 196, 26, 0.1)" }}
                >
                  <Space
                    style={{ width: "100%", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
                  >
                    <Space direction="vertical" size={0}>
                      <Text style={{ color: "#52c41a", fontWeight: 700, fontSize: 18 }}>
                        You have an active session
                      </Text>
                      <Text style={{ color: "var(--muted)" }}>{activeSession.question.title}</Text>
                    </Space>
                    <Button
                      type="primary"
                      onClick={() => router.push(`/session/${activeSession.sessionId}`)}
                      style={{ backgroundColor: "#237804", borderColor: "#237804" }}
                    >
                      Return to session
                    </Button>
                  </Space>
                </Card>
              )}

              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <Card
                    className="dark-card"
                    title="Your account"
                    bordered
                    headStyle={{ padding: "16px 24px" }}
                    bodyStyle={{ padding: "24px" }}
                  >
                    <Space direction="vertical">
                      <Text style={{ color: "var(--muted)" }}>Username: {username}</Text>
                      <Text style={{ color: "var(--muted)" }}>Email: {user?.email ?? "Unknown"}</Text>
                      <Text style={{ color: "var(--muted)" }}>
                        Email verified: {user?.emailConfirmed ? "Yes" : "Pending verification"}
                      </Text>
                      <Text style={{ color: "var(--muted)" }}>
                        Created: {user ? new Date(user.createdAt).toLocaleString() : "-"}
                      </Text>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card
                    className="dark-card"
                    title="Start Coding"
                    bordered
                    headStyle={{ padding: "16px 24px" }}
                    bodyStyle={{ padding: "24px" }}
                  >
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Text style={{ color: "var(--muted)" }}>
                        Ready to practice coding with a peer? Find your perfect coding partner!
                      </Text>
                      <Button type="primary" size="large" href="/matching" style={{ width: "100%", marginTop: 16 }}>
                        Find Coding Partner
                      </Button>
                      <Text style={{ fontSize: 12, color: "var(--muted)" }}>
                        Choose your topic and difficulty to get matched instantly.
                      </Text>
                    </Space>
                  </Card>
                </Col>
              </Row>

              <Card
                className="dark-card"
                title="Attempt history"
                bordered
                headStyle={{ padding: "16px 24px" }}
                bodyStyle={{ padding: 0 }}
              >
                {historyLoading ? (
                  <div style={{ padding: "24px" }}>
                    <Text style={{ color: "var(--muted)" }}>Loading attempt history...</Text>
                  </div>
                ) : historyError ? (
                  <div style={{ padding: "24px" }}>
                    <Text style={{ color: "#ff7875" }}>{historyError}</Text>
                  </div>
                ) : historyItems.length === 0 ? (
                  <div style={{ padding: "24px" }}>
                    <Text style={{ color: "var(--muted)" }}>No recent attempts! Try coding something</Text>
                  </div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    <List
                      dataSource={historyItems}
                      rowKey="sessionAttemptId"
                      renderItem={(item) => (
                        <List.Item
                          style={{
                            cursor: "pointer",
                            padding: "16px 24px",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                          }}
                          onClick={() => router.push(`/history/${item.sessionAttemptId}`)}
                        >
                          <Space direction="vertical" size={0} style={{ width: "100%" }}>
                            <Text style={{ color: "#fff", fontWeight: 600 }}>{item.questionTitle}</Text>
                            <Text style={{ color: "var(--muted)", fontSize: 12 }}>
                              {formatAttemptDate(item.endedAt)}
                            </Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </Card>
            </Space>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
