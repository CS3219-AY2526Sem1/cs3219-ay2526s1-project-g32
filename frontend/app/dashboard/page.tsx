"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button, Card, Col, ConfigProvider, Layout, Row, Space, Typography } from "antd";

import { useAuth } from "../../hooks/useAuth";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { peerPrepTheme } from "../../lib/theme";
import { fetchActiveSessionForUser, type ActiveSessionResponse } from "../../lib/collab-client";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LANDING_ROUTE = "/" as Route;

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useRequireAuth();
  const { user, session, logout } = useAuth();

  const [activeSession, setActiveSession] = useState<ActiveSessionResponse | null>(null);
  const [checkingActive, setCheckingActive] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !user || !session?.accessToken) {
      setActiveSession(null);
      return;
    }

    let cancelled = false;
    setCheckingActive(true);
    setActiveError(null);

    fetchActiveSessionForUser({ userId: user.id, accessToken: session.accessToken })
      .then((result) => {
        if (cancelled) return;
        setActiveSession(result);
      })
      .catch((error) => {
        if (cancelled) return;
        setActiveSession(null);
        if (error instanceof Error) {
          setActiveError(error.message);
        } else {
          setActiveError("Unable to check active session");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingActive(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, session?.accessToken, user?.id]);

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

              {activeError && !checkingActive && (
                <Card className="dark-card" bordered>
                  <Text style={{ color: "#ff7875" }}>{activeError}</Text>
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
            </Space>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
