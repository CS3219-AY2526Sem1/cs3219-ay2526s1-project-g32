'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { Alert, Button, Card, Typography } from 'antd';

import { resendMagicLink } from '../../lib/api-client';

const LOGIN_ROUTE = '/login' as Route;

const { Title, Paragraph } = Typography;

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
    <div className="auth-shell">
      <Card>
        <Title level={3}>Check your inbox</Title>
        <Paragraph>
          We sent a magic link {email ? `to ${email}` : 'to your email address'}. Open it on the same device to verify your
          account.
        </Paragraph>
        <Paragraph>If you don&apos;t see the email, check your spam folder or request another link below.</Paragraph>
        {message ? <Alert type="success" showIcon message={message} style={{ marginBottom: 16 }} /> : null}
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
        <Button block size="large" onClick={handleResend} loading={loading} disabled={!email} style={{ marginBottom: 12 }}>
          Resend magic link
        </Button>
        <Button type="primary" href={LOGIN_ROUTE} block size="large">
          Back to login
        </Button>
      </Card>
    </div>
  );
}
