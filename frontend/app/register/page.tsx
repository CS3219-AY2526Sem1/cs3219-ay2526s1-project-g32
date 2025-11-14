/* AI Assistance Disclosure:
Scope: Implement and debug page components, and standardize theme with globals.
Author Review: Validated for style and accuracy.
*/

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useState } from 'react';
import { Alert, Button, Card, ConfigProvider, Form, Input, Typography } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';

import { register as registerApi, type RegisterPayload } from '../../lib/api-client';
import { authTheme } from '../../lib/theme';

const LOGIN_ROUTE = '/login' as Route;
const VERIFY_EMAIL_ROUTE = '/verify-email' as Route;

const { Title, Paragraph, Text } = Typography;

export default function RegisterPage() {
  const [form] = Form.useForm<RegisterPayload>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: RegisterPayload) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await registerApi(values);
      if (response.verificationEmailSent) {
        setSuccess('Magic link sent. Check your inbox to verify the account.');
      }
      setTimeout(() => {
        router.push(VERIFY_EMAIL_ROUTE + `?email=${encodeURIComponent(values.email)}`);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={authTheme}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Brand header (reusing .auth-header) */}
        <header className="auth-header">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none" style={{ color: '#6366F1' }}
               xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor" />
          </svg>
          <Title level={3} style={{ margin: 0 }}>PeerPrep</Title>
        </header>

      <div className="auth-shell">
        <Card className="auth-card" bordered>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Title level={2} style={{ marginBottom: 6 }}>Create your account</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 0 }}>
              Pick a username and we’ll email you a magic link to verify your address.
            </Paragraph>
          </div>

          <Form<RegisterPayload>
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleFinish}
            initialValues={{ username: '', email: '', password: '' }}
            className="form-inter auth-input auth-primary"
            style={{ marginTop: 24 }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Username is required' }]}
            >
              <Input
                size="large"
                autoComplete="username"
                placeholder="Username"
                prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Invalid email' },
              ]}
            >
              <Input
                size="large"
                autoComplete="email"
                placeholder="Email"
                prefix={<MailOutlined style={{ color: '#9CA3AF' }} />}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Password is required' },
                { min: 8, message: 'Minimum 8 characters' },
              ]}
            >
              <Input.Password
                size="large"
                autoComplete="new-password"
                placeholder="Password"
                iconRender={(visible) => (
                  <LockOutlined style={{ color: visible ? '#ffffff' : '#9CA3AF' }} />
                )}
              />
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
            {success ? (
              <Alert
                type="success"
                showIcon
                message={success}
                style={{
                  marginBottom: 12,
                  background: '#132a13',
                  borderColor: '#52c41a',
                  color: '#e8ffe8',
                }}
              />
            ) : null}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                Sign up
              </Button>
            </Form.Item>
          </Form>

          <Paragraph style={{ textAlign: 'center', marginTop: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Already have an account? </Text>
            <Link href={LOGIN_ROUTE} className="ant-typography" style={{ color: '#6366F1' }}>
              Log in
            </Link>
          </Paragraph>
        </Card>
      </div>
      </div>
    </ConfigProvider>
  );
}
