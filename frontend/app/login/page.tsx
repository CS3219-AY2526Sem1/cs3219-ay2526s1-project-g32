'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';

import { login as loginApi, type LoginPayload } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

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
    <div className="auth-shell">
      <Card>
        <Title level={3}>Welcome back</Title>
        <Paragraph>Enter your credentials to join a session or manage your profile.</Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          initialValues={{ email: '', password: '' }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input size="large" autoComplete="email" placeholder="jane@peerprep.com" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password size="large" autoComplete="current-password" placeholder="Enter password" />
          </Form.Item>
          {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
        <Paragraph style={{ textAlign: 'center' }}>
          Need an account? <Button type="link" href={REGISTER_ROUTE}>Register here</Button>
        </Paragraph>
      </Card>
    </div>
  );
}
