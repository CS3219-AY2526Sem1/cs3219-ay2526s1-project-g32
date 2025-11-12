'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import type { ControllerRenderProps } from 'react-hook-form';
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
  Switch,
  Tag,
  Typography 
} from 'antd';
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { useAuth } from '../../hooks/useAuth';
import { peerPrepTheme } from '../../lib/theme';
import { 
  createQuestion, 
  getQuestionById,
  getQuestionBySlug,
  updateQuestion,
  deleteQuestion,
  setAdminStatusByEmail,
  type CreateQuestionPayload 
} from '../../lib/api-client';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const alertStyles = {
  info: {
    background: '#0f1c2e',
    borderColor: '#1890ff',
    color: '#e6f4ff',
  },
  warning: {
    background: '#2b1f12',
    borderColor: '#faad14',
    color: '#fff4e6',
  },
  error: {
    background: '#2a1517',
    borderColor: '#ff4d4f',
    color: '#fff1f0',
  },
  success: {
    background: '#132a13',
    borderColor: '#52c41a',
    color: '#e8ffe8',
  },
};

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

type RenderFieldProps<TName extends keyof FormValues> = {
  field: ControllerRenderProps<FormValues, TName>;
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
  const { user, session, isAuthenticated, isReady } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isSetAdminMode, setIsSetAdminMode] = useState(false);
  const [searchSlug, setSearchSlug] = useState('');
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [targetEmail, setTargetEmail] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
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

  const handleModeChange = (checked: boolean) => {
    setIsEditMode(checked);
    setIsDeleteMode(false);
    setIsSetAdminMode(false);
    setError(null);
    setSuccess(null);
    setCurrentQuestionId(null);
    reset();
    setSearchSlug('');
    setTargetEmail('');
  };

  const handleDeleteModeChange = (checked: boolean) => {
    setIsDeleteMode(checked);
    setIsEditMode(false);
    setIsSetAdminMode(false);
    setError(null);
    setSuccess(null);
    setCurrentQuestionId(null);
    reset();
    setSearchSlug('');
    setTargetEmail('');
  };

  const handleSetAdminModeChange = (checked: boolean) => {
    setIsSetAdminMode(checked);
    setIsEditMode(false);
    setIsDeleteMode(false);
    setError(null);
    setSuccess(null);
    setCurrentQuestionId(null);
    reset();
    setSearchSlug('');
    setTargetEmail('');
  };

  const handleLoadQuestion = async () => {
    if (!searchSlug.trim()) {
      setError('Please enter a slug or ID to search');
      return;
    }

    setLoadingQuestion(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      
      // Try to parse as ID first (if it's a number)
      if (/^\d+$/.test(searchSlug)) {
        response = await getQuestionById(parseInt(searchSlug));
      } else {
        // Otherwise treat as slug
        response = await getQuestionBySlug(searchSlug);
      }
      
      // Populate form with existing data
      setValue('title', response.title);
      setValue('slug', response.slug);
      setValue('description', response.description);
      setValue('difficulty', response.difficulty as 'Easy' | 'Medium' | 'Hard');
      setValue('topics', response.topics);
      setValue('starter_python', response.starterCode.python || '');
      setValue('starter_c', response.starterCode.c || '');
      setValue('starter_cpp', response.starterCode.cpp || '');
      setValue('starter_java', response.starterCode.java || '');
      setValue('starter_javascript', response.starterCode.javascript || '');
      
      setCurrentQuestionId(response.id);
      setSuccess(`Question "${response.title}" loaded successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question. Check the slug or ID.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!searchSlug.trim()) {
      setError('Please enter a slug or ID to delete');
      return;
    }

    setLoadingQuestion(true);
    setError(null);
    setSuccess(null);

    try {
      let questionId: number;
      let questionTitle: string = '';
      
      // Try to parse as ID first (if it's a number)
      if (/^\d+$/.test(searchSlug)) {
        questionId = parseInt(searchSlug);
        // Fetch the question to get its title for confirmation
        const response = await getQuestionById(questionId);
        questionTitle = response.title;
      } else {
        // Otherwise treat as slug
        const response = await getQuestionBySlug(searchSlug);
        questionId = response.id;
        questionTitle = response.title;
      }
      
      // Show confirmation dialog
      const confirmed = window.confirm(
        `⚠️ Warning! This action cannot be undone.\n\n` +
        `Are you sure you want to delete the question:\n"${questionTitle}" (ID: ${questionId})?\n\n` +
        `This will permanently remove the question from the database.`
      );
      
      if (!confirmed) {
        setLoadingQuestion(false);
        return;
      }
      
      // Delete the question
      await deleteQuestion(questionId);
      setSuccess(`Question "${questionTitle}" (ID: ${questionId}) has been permanently deleted.`);
      setSearchSlug('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question. Check the slug or ID.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleSetAdmin = async () => {
    if (!targetEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!user?.id) {
        throw new Error('You must be logged in to perform this action');
      }

      if (!session?.accessToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to grant admin permissions to:\n${targetEmail}?\n\n` +
        `This will give the user full administrative access to the system.`
      );
      
      if (!confirmed) {
        setLoading(false);
        return;
      }
      
      // Set admin status
      const result = await setAdminStatusByEmail(targetEmail, true, session.accessToken);
      setSuccess(`Successfully granted admin permissions to ${targetEmail} (User: ${result.user.email})`);
      setTargetEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set admin status. Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isEditMode) {
        // Edit mode - update existing question
        if (!currentQuestionId) {
          setError('Please load a question first before updating');
          setLoading(false);
          return;
        }

        const payload: Partial<CreateQuestionPayload> = {
          ...(values.title && { title: values.title }),
          ...(values.slug && { slug: values.slug }),
          ...(values.description && { description: values.description }),
          ...(values.difficulty && { difficulty: values.difficulty }),
          ...(values.topics && values.topics.length > 0 && { topics: values.topics }),
          ...(values.starter_python && { starter_python: values.starter_python }),
          ...(values.starter_c && { starter_c: values.starter_c }),
          ...(values.starter_cpp && { starter_cpp: values.starter_cpp }),
          ...(values.starter_java && { starter_java: values.starter_java }),
          ...(values.starter_javascript && { starter_javascript: values.starter_javascript }),
        };

        await updateQuestion(currentQuestionId, payload);
        setSuccess('Question updated successfully!');
      } else {
        // Create mode - create new question
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
        
        // Reset form after success in create mode
        setTimeout(() => {
          reset();
          setSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} question`);
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
                PeerPrep Admin - {isSetAdminMode ? 'Set Admin Permissions' : isDeleteMode ? 'Delete Question' : isEditMode ? 'Edit Question' : 'Create Question'}
              </Title>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Create</span>
                <Switch 
                  checked={isEditMode} 
                  onChange={handleModeChange}
                  checkedChildren={<EditOutlined />}
                  unCheckedChildren={<PlusOutlined />}
                  disabled={isDeleteMode || isSetAdminMode}
                />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Edit</span>
              </div>
              <Divider type="vertical" style={{ height: 24, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch 
                  checked={isDeleteMode} 
                  onChange={handleDeleteModeChange}
                  checkedChildren={<DeleteOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  disabled={isSetAdminMode}
                  style={{ 
                    background: isDeleteMode ? '#ff4d4f' : undefined 
                  }}
                />
                <span style={{ color: isDeleteMode ? '#ff4d4f' : 'rgba(255,255,255,0.7)', fontSize: 13 }}>Delete</span>
              </div>
              <Divider type="vertical" style={{ height: 24, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch 
                  checked={isSetAdminMode} 
                  onChange={handleSetAdminModeChange}
                  checkedChildren={<FileTextOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  style={{ 
                    background: isSetAdminMode ? '#52c41a' : undefined 
                  }}
                />
                <span style={{ color: isSetAdminMode ? '#52c41a' : 'rgba(255,255,255,0.7)', fontSize: 13 }}>Set Admin</span>
              </div>
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
                  
                  {/* Set Admin Mode View */}
                  {isSetAdminMode ? (
                    <Card 
                      size="small" 
                      style={{ 
                        background: 'rgba(82, 196, 26, 0.1)', 
                        border: '2px solid rgba(82, 196, 26, 0.4)' 
                      }}
                    >
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <FileTextOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                          <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                            Grant Admin Permissions
                          </Title>
                        </div>
                        
                        <Alert
                          message="Grant Administrator Access"
                          description="This will give the specified user full administrative privileges. Make sure you trust this user before granting admin access."
                          type="info"
                          showIcon
                          style={alertStyles.info}
                        />

                        <Divider style={{ margin: '12px 0', borderColor: 'rgba(82, 196, 26, 0.2)' }} />

                        <div>
                          <Paragraph style={{ marginBottom: 8, color: 'rgba(255,255,255,0.85)' }}>
                            Enter the user's email address:
                          </Paragraph>
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              size="large"
                              type="email"
                              placeholder="user@example.com"
                              value={targetEmail}
                              onChange={(e) => setTargetEmail(e.target.value)}
                              onPressEnter={handleSetAdmin}
                              disabled={loading}
                              style={{ borderColor: 'rgba(82, 196, 26, 0.3)' }}
                            />
                            <Button
                              type="primary"
                              size="large"
                              icon={<FileTextOutlined />}
                              onClick={handleSetAdmin}
                              loading={loading}
                              style={{ 
                                background: '#52c41a',
                                borderColor: '#52c41a'
                              }}
                            >
                              Grant Admin
                            </Button>
                          </Space.Compact>
                        </div>

                        {error && (
                          <Alert
                            message="Error"
                            description={error}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setError(null)}
                            style={alertStyles.error}
                          />
                        )}
                        
                        {success && (
                          <Alert
                            message="Success"
                            description={success}
                            type="success"
                            showIcon
                            closable
                            onClose={() => setSuccess(null)}
                            style={alertStyles.success}
                          />
                        )}
                      </Space>
                    </Card>
                  ) : isDeleteMode ? (
                    <Card 
                      size="small" 
                      style={{ 
                        background: 'rgba(255, 77, 79, 0.1)', 
                        border: '2px solid rgba(255, 77, 79, 0.4)' 
                      }}
                    >
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <WarningOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                          <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
                            Delete Question
                          </Title>
                        </div>
                        
                        <Alert
                          message="Warning! This action cannot be undone."
                          description="Deleting a question will permanently remove it from the database. Make sure you have the correct question before proceeding."
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          style={alertStyles.warning}
                        />

                        <Divider style={{ margin: '12px 0', borderColor: 'rgba(255, 77, 79, 0.2)' }} />

                        <div>
                          <Paragraph style={{ marginBottom: 8, color: 'rgba(255,255,255,0.85)' }}>
                            Enter the question slug or ID to delete:
                          </Paragraph>
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              size="large"
                              placeholder="Enter slug (e.g., two-sum) or ID"
                              value={searchSlug}
                              onChange={(e) => setSearchSlug(e.target.value)}
                              onPressEnter={handleDeleteQuestion}
                              disabled={loadingQuestion}
                              style={{ borderColor: 'rgba(255, 77, 79, 0.3)' }}
                            />
                            <Button
                              danger
                              type="primary"
                              size="large"
                              icon={<DeleteOutlined />}
                              onClick={handleDeleteQuestion}
                              loading={loadingQuestion}
                            >
                              Delete Question
                            </Button>
                          </Space.Compact>
                        </div>

                        {error && (
                          <Alert
                            message="Error"
                            description={error}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setError(null)}
                            style={alertStyles.error}
                          />
                        )}
                        
                        {success && (
                          <Alert
                            message="Success"
                            description={success}
                            type="success"
                            showIcon
                            closable
                            onClose={() => setSuccess(null)}
                            style={alertStyles.success}
                          />
                        )}
                      </Space>
                    </Card>
                  ) : (
                    <>
                      {/* Mode Toggle and Search Section */}
                      {isEditMode && (
                        <Card 
                          size="small" 
                          style={{ 
                            background: 'rgba(99, 102, 241, 0.1)', 
                            border: '1px solid rgba(99, 102, 241, 0.3)' 
                          }}
                        >
                          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Title level={5} style={{ margin: 0, color: '#fff' }}>
                              Load Question for Editing
                            </Title>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                              Enter the question slug (e.g., two-sum) or ID to load existing question data
                            </Paragraph>
                            <Space.Compact style={{ width: '100%' }}>
                              <Input
                                size="large"
                                placeholder="Enter slug (e.g., two-sum) or ID"
                                value={searchSlug}
                                onChange={(e) => setSearchSlug(e.target.value)}
                                onPressEnter={handleLoadQuestion}
                                disabled={loadingQuestion}
                              />
                              <Button
                                type="primary"
                                size="large"
                                icon={<SearchOutlined />}
                                onClick={handleLoadQuestion}
                                loading={loadingQuestion}
                              >
                                Load
                              </Button>
                            </Space.Compact>
                          </Space>
                        </Card>
                      )}

                  {/* Basic Information */}
                  <div>
                    <Title level={4} style={{ marginBottom: 16 }}>Basic Information</Title>
                    
                    <Form.Item
                      label="Title"
                      validateStatus={errors.title ? 'error' : ''}
                      help={errors.title?.message}
                      required={!isEditMode}
                    >
                      <Controller<FormValues, 'title'>
                        name="title"
                        control={control}
                        rules={{ required: isEditMode ? false : 'Title is required' }}
                        render={({ field }: RenderFieldProps<'title'>) => (
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
                      required={!isEditMode}
                    >
                      <Controller<FormValues, 'slug'>
                        name="slug"
                        control={control}
                        rules={{ 
                          required: isEditMode ? false : 'Slug is required',
                          pattern: {
                            value: /^[a-z0-9-]+$/,
                            message: 'Slug must be lowercase letters, numbers, and hyphens only'
                          }
                        }}
                        render={({ field }: RenderFieldProps<'slug'>) => (
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
                      required={!isEditMode}
                    >
                      <Controller<FormValues, 'difficulty'>
                        name="difficulty"
                        control={control}
                        rules={{ required: isEditMode ? false : 'Difficulty is required' }}
                        render={({ field }: RenderFieldProps<'difficulty'>) => (
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
                      required={!isEditMode}
                    >
                      <Controller<FormValues, 'topics'>
                        name="topics"
                        control={control}
                        rules={{ 
                          required: isEditMode ? false : 'At least one topic is required',
                          validate: (value: string[]) => {
                            if (isEditMode) return true;
                            return value.length > 0 || 'At least one topic is required';
                          }
                        }}
                        render={({ field }: RenderFieldProps<'topics'>) => (
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
                      required={!isEditMode}
                    >
                      <Controller<FormValues, 'description'>
                        name="description"
                        control={control}
                        rules={{ 
                          required: isEditMode ? false : 'Description is required',
                          minLength: {
                            value: 10,
                            message: 'Description must be at least 10 characters'
                          }
                        }}
                        render={({ field }: RenderFieldProps<'description'>) => (
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
                      <Controller<FormValues, 'starter_python'>
                        name="starter_python"
                        control={control}
                        render={({ field }: RenderFieldProps<'starter_python'>) => (
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
                      <Controller<FormValues, 'starter_javascript'>
                        name="starter_javascript"
                        control={control}
                        render={({ field }: RenderFieldProps<'starter_javascript'>) => (
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
                      <Controller<FormValues, 'starter_java'>
                        name="starter_java"
                        control={control}
                        render={({ field }: RenderFieldProps<'starter_java'>) => (
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
                      <Controller<FormValues, 'starter_cpp'>
                        name="starter_cpp"
                        control={control}
                        render={({ field }: RenderFieldProps<'starter_cpp'>) => (
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
                      <Controller<FormValues, 'starter_c'>
                        name="starter_c"
                        control={control}
                        render={({ field }: RenderFieldProps<'starter_c'>) => (
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
                    <Alert
                      type="error"
                      showIcon
                      message={error}
                      closable
                      onClose={() => setError(null)}
                      style={alertStyles.error}
                    />
                  )}
                  {success && (
                    <Alert
                      type="success"
                      showIcon
                      message={success}
                      closable
                      onClose={() => setSuccess(null)}
                      style={alertStyles.success}
                    />
                  )}

                  {/* Action Buttons */}
                  <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
                      <Button
                        size="large"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          reset();
                          setSearchSlug('');
                          setCurrentQuestionId(null);
                          setError(null);
                          setSuccess(null);
                        }}
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
                        disabled={isEditMode && !currentQuestionId}
                      >
                        {isEditMode ? 'Update Question' : 'Create Question'}
                      </Button>
                    </Space>
                    </>
                  )}
                </Space>
              </form>
            </Card>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
