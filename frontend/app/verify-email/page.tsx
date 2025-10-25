'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { Alert, Button, Card, ConfigProvider, Typography, Space } from 'antd';

import { resendMagicLink } from '../../lib/api-client';
import { authTheme } from '../../lib/theme';

const LOGIN_ROUTE = '/login' as Route;
const { Title, Paragraph, Text } = Typography;

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = useCallback(async () => {
    if (!email) {
      setError('Enter your email on the registration page to request a new link.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await resendMagicLink({ email });
      setMessage('We just sent another magic link. Check your inbox and spam folder.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend magic link');
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <ConfigProvider theme={authTheme}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Brand header (reuses .auth-header) */}
        <header className="auth-header">
          <svg
            width="32"
            height="32"
            viewBox="0 0 48 48"
            fill="none"
            style={{ color: '#6366F1' }}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor" />
          </svg>
          <Title level={3} style={{ margin: 0 }}>PeerPrep</Title>
        </header>

      <div className="auth-shell">
        <Card className="auth-card" bordered>
          <div style={{ textAlign: 'center' }}>

            <Title level={2} style={{ marginBottom: 6 }}>Check your inbox</Title>

            <Paragraph style={{ color: 'rgba(255,255,255,0.8)' }}>
              We sent a magic link{' '}
              {email ? (
                <>
                  to <Text code style={{ color: '#fff' }}>{email}</Text>
                </>
              ) : (
                'to your email address'
              )}
              . Open it on the same device to verify your account.
            </Paragraph>

            <Paragraph style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
              If you don’t see the email, check your spam folder or request another link below.
            </Paragraph>

            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {message ? (
                <Alert type="success" showIcon message={message} />
              ) : null}
              {error ? (
                <Alert type="error" showIcon message={error} />
              ) : null}

              <Button
                block
                size="large"
                onClick={handleResend}
                loading={loading}
                disabled={!email}
              >
                Resend magic link
              </Button>

              <Button type="primary" href={LOGIN_ROUTE} block size="large">
                Back to login
              </Button>
            </Space>
          </div>
        </Card>
      </div>
      </div>
    </ConfigProvider>
  );
}
