/* AI Assistance Disclosure:
Scope: Implement and debug page components, and standardize theme with globals.
Author Review: Validated for style and accuracy.
*/

'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useState } from 'react';
import { Alert, Button, Card, ConfigProvider, Form, Input, Typography } from 'antd';

import { login as loginApi, type LoginPayload } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';
import { authTheme } from '../../lib/theme';

const { Title, Paragraph } = Typography;
const REGISTER_ROUTE = '/register' as Route;
const DASHBOARD_ROUTE = '/dashboard' as Route;

export default function LoginPage() {
  const [form] = Form.useForm<LoginPayload>();
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: LoginPayload) => {
    setError(null);
    setLoading(true);

    try {
      const response = await loginApi(values);
      login(response);
      router.push(DASHBOARD_ROUTE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={authTheme}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <header className="auth-header">
          <Title level={3} style={{ margin: 0 }}>PeerPrep</Title>
        </header>

      <div className="auth-shell">
        <Card className="auth-card" bordered>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Title level={2} style={{ marginBottom: 4 }}>Welcome back</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
              Don&apos;t have an account?{' '}
              <Button type="link" href={REGISTER_ROUTE}>
                Sign up
              </Button>
            </Paragraph>
          </div>

          <Form<LoginPayload>
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            requiredMark={false}
            initialValues={{ email: '', password: '' }}
            className="form-inter auth-input auth-primary"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Invalid email' },
              ]}
            >
              <Input size="large" autoComplete="email" placeholder="Email address" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password size="large" autoComplete="current-password" placeholder="Password" />
            </Form.Item>

            {error ? (
              <Alert
                type="error"
                showIcon
                message={error}
                style={{
                  marginBottom: 12,
                  background: '#2a1517',
                  borderColor: '#ff4d4f',
                  color: '#fff',
                }}
              />
            ) : null}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                Log in
              </Button>
            </Form.Item>
          </Form>

          <Paragraph className="auth-link" style={{ textAlign: 'center', marginTop: 16 }}>
            Need an account?{' '}
            <Button type="link" href={REGISTER_ROUTE}>
              Register here
            </Button>
          </Paragraph>
        </Card>
      </div>
      </div>
    </ConfigProvider>
  );
}
