'use client';

import type { Route } from 'next';
import { Button, Card, Typography } from 'antd';

const LOGIN_ROUTE = '/login' as Route;

const { Title, Paragraph } = Typography;

export default function VerifySuccessPage() {
  return (
    <div className="auth-shell">
      <Card>
        <Title level={3}>Email verified</Title>
        <Paragraph>Your magic link worked. You can now sign in with your email and password.</Paragraph>
        <Button type="primary" href={LOGIN_ROUTE} block size="large">
          Go to login
        </Button>
      </Card>
    </div>
  );
}
