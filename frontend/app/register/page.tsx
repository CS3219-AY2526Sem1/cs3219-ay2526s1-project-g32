'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';

import { register as registerApi, type RegisterPayload } from '../../lib/api-client';

const LOGIN_ROUTE = '/login' as Route;
const VERIFY_EMAIL_ROUTE = '/verify-email' as Route;

const { Title, Paragraph } = Typography;

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
    <div className="auth-shell">
      <Card>
        <Title level={3}>Create your PeerPrep account</Title>
        <Paragraph>Pick a username and we will email you a magic link to verify your address.</Paragraph>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleFinish}
          initialValues={{ username: '', email: '', password: '' }}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Username is required' }]}
          >
            <Input size="large" placeholder="peerprep-user" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input size="large" placeholder="jane@peerprep.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password is required' }, { min: 8, message: 'Minimum 8 characters' }]}
          >
            <Input.Password size="large" placeholder="Create a password" autoComplete="new-password" />
          </Form.Item>
          {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
          {success ? <Alert type="success" showIcon message={success} style={{ marginBottom: 16 }} /> : null}
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Create account
            </Button>
          </Form.Item>
        </Form>
        <Paragraph style={{ textAlign: 'center' }}>
          Already verified? <Link href={LOGIN_ROUTE}>Sign in here</Link>
        </Paragraph>
      </Card>
    </div>
  );
}


