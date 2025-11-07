'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { 
  Alert,
  Button, 
  Card, 
  ConfigProvider, 
  Divider,
  Form,
  Input,
  Layout, 
  Result, 
  Select,
  Space, 
  Spin, 
  Tag,
  Typography 
} from 'antd';
import {
  CloseOutlined,
  FileTextOutlined,
  SaveOutlined,
} from '@ant-design/icons';

import { useAuth } from '../../hooks/useAuth';
import { peerPrepTheme } from '../../lib/theme';
import { createQuestion, type CreateQuestionPayload } from '../../lib/api-client';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;
const { TextArea } = Input;

type FormValues = {
  title: string;
  slug: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  starter_python?: string;
  starter_c?: string;
  starter_cpp?: string;
  starter_java?: string;
  starter_javascript?: string;
};

const LoadingView = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}
  >
    <Spin tip="Checking admin access..." size="large" />
  </div>
);

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isReady } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      difficulty: 'Easy',
      topics: [],
      starter_python: '',
      starter_c: '',
      starter_cpp: '',
      starter_java: '',
      starter_javascript: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload: CreateQuestionPayload = {
        ...values,
        // Only include starter code if provided
        starter_python: values.starter_python || undefined,
        starter_c: values.starter_c || undefined,
        starter_cpp: values.starter_cpp || undefined,
        starter_java: values.starter_java || undefined,
        starter_javascript: values.starter_javascript || undefined,
      };

      await createQuestion(payload);
      setSuccess('Question created successfully!');
      
      // Reset form after success
      setTimeout(() => {
        reset();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors: Record<string, string> = {
    Easy: 'green',
    Medium: 'orange',
    Hard: 'red',
  };

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (!user.isAdmin) {
      router.replace('/');
    }
  }, [isAuthenticated, isReady, router, user]);

  if (!isReady || !user || !isAuthenticated) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <LoadingView />
      </ConfigProvider>
    );
  }

  if (!user.isAdmin) {
    return (
      <ConfigProvider theme={peerPrepTheme}>
        <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Content className="main-content">
            <Result
              status="403"
              title="Access Restricted"
              subTitle="You need administrator privileges to view this page."
              extra={
                <Button type="primary" onClick={() => router.push('/')}>Go back home</Button>
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileTextOutlined style={{ fontSize: 24, color: 'var(--primary-600)' }} />
              <Title level={4} style={{ color: '#fff', margin: 0 }}>
                PeerPrep Admin - Create Question
              </Title>
            </div>
          </div>
        </Header>

        <Content className="main-content">
          <div className="blob" aria-hidden="true" />
          <div className="blob-bottom" aria-hidden="true" />
          <div className="bg-blur-overlay" aria-hidden="true" />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '24px',
              maxWidth: 1000,
              margin: '0 auto',
            }}
          >
            <Card
              style={{
                background: 'rgba(12, 18, 38, 0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 15px 45px rgba(2,12,27,0.55)',
              }}
              bodyStyle={{ padding: '48px' }}
            >
              <form onSubmit={handleSubmit(onSubmit)}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {/* Basic Information */}
                  <div>
                    <Title level={4} style={{ marginBottom: 16 }}>Basic Information</Title>
                    
                    <Form.Item
                      label="Title"
                      validateStatus={errors.title ? 'error' : ''}
                      help={errors.title?.message}
                      required
                    >
                      <Controller
                        name="title"
                        control={control}
                        rules={{ required: 'Title is required' }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            size="large"
                            placeholder="e.g., Two Sum"
                            maxLength={200}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Slug"
                      validateStatus={errors.slug ? 'error' : ''}
                      help={errors.slug?.message || 'URL-friendly identifier (e.g., two-sum)'}
                      required
                    >
                      <Controller
                        name="slug"
                        control={control}
                        rules={{ 
                          required: 'Slug is required',
                          pattern: {
                            value: /^[a-z0-9-]+$/,
                            message: 'Slug must be lowercase letters, numbers, and hyphens only'
                          }
                        }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            size="large"
                            placeholder="e.g., two-sum"
                            maxLength={100}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Difficulty"
                      validateStatus={errors.difficulty ? 'error' : ''}
                      help={errors.difficulty?.message}
                      required
                    >
                      <Controller
                        name="difficulty"
                        control={control}
                        rules={{ required: 'Difficulty is required' }}
                        render={({ field }) => (
                          <Select
                            {...field}
                            size="large"
                            placeholder="Select difficulty"
                            options={[
                              { value: 'Easy', label: <Tag color={difficultyColors.Easy}>Easy</Tag> },
                              { value: 'Medium', label: <Tag color={difficultyColors.Medium}>Medium</Tag> },
                              { value: 'Hard', label: <Tag color={difficultyColors.Hard}>Hard</Tag> },
                            ]}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Topics"
                      validateStatus={errors.topics ? 'error' : ''}
                      help={errors.topics?.message || 'Press Enter to add each topic'}
                      required
                    >
                      <Controller
                        name="topics"
                        control={control}
                        rules={{ 
                          required: 'At least one topic is required',
                          validate: (value) => value.length > 0 || 'At least one topic is required'
                        }}
                        render={({ field }) => (
                          <Select
                            {...field}
                            mode="tags"
                            size="large"
                            placeholder="e.g., Array, Hash Table"
                            style={{ width: '100%' }}
                            tokenSeparators={[',']}
                            maxCount={10}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Description"
                      validateStatus={errors.description ? 'error' : ''}
                      help={errors.description?.message || 'Full problem description (supports markdown)'}
                      required
                    >
                      <Controller
                        name="description"
                        control={control}
                        rules={{ 
                          required: 'Description is required',
                          minLength: {
                            value: 10,
                            message: 'Description must be at least 10 characters'
                          }
                        }}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            rows={8}
                            placeholder="Enter the full problem description..."
                          />
                        )}
                      />
                    </Form.Item>
                  </div>

                  <Divider />

                  {/* Starter Code Section */}
                  <div>
                    <Title level={4} style={{ marginBottom: 16 }}>
                      Starter Code (Optional)
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                      Provide initial code templates for different programming languages
                    </Paragraph>

                    <Form.Item label="Python">
                      <Controller
                        name="starter_python"
                        control={control}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            rows={4}
                            placeholder="def solution():\n    pass"
                            style={{ fontFamily: 'monospace' }}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item label="JavaScript">
                      <Controller
                        name="starter_javascript"
                        control={control}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            rows={4}
                            placeholder="function solution() {\n    // code here\n}"
                            style={{ fontFamily: 'monospace' }}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item label="Java">
                      <Controller
                        name="starter_java"
                        control={control}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            rows={4}
                            placeholder="class Solution {\n    public void solution() {\n        // code here\n    }\n}"
                            style={{ fontFamily: 'monospace' }}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item label="C++">
                      <Controller
                        name="starter_cpp"
                        control={control}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            rows={4}
                            placeholder="class Solution {\npublic:\n    void solution() {\n        // code here\n    }\n};"
                            style={{ fontFamily: 'monospace' }}
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item label="C">
                      <Controller
                        name="starter_c"
                        control={control}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            rows={4}
                            placeholder="void solution() {\n    // code here\n}"
                            style={{ fontFamily: 'monospace' }}
                          />
                        )}
                      />
                    </Form.Item>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />
                  )}
                  {success && (
                    <Alert type="success" showIcon message={success} closable onClose={() => setSuccess(null)} />
                  )}

                  {/* Action Buttons */}
                  <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      size="large"
                      icon={<CloseOutlined />}
                      onClick={() => reset()}
                      disabled={loading}
                    >
                      Reset
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      icon={<SaveOutlined />}
                      htmlType="submit"
                      loading={loading}
                    >
                      Create Question
                    </Button>
                  </Space>
                </Space>
              </form>
            </Card>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
