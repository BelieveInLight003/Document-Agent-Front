import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Tabs } from 'antd';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { saveTokens, setSessionUser, useAuth } from '../auth';
import { Logo } from '../components/Logo';
import { errorText } from '../utils';

export function LoginPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  if (user) return <Navigate to="/" replace />;

  async function login(values: { username: string; password: string }) {
    setLoading(true);
    try {
      const result = await authApi.login(values.username.trim(), values.password);
      saveTokens(result.accessToken, result.refreshToken);
      const me = await authApi.me();
      setSessionUser(me);
      navigate('/', { replace: true });
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  async function register(values: {
    username: string;
    password: string;
    email: string;
    realName?: string;
  }) {
    setLoading(true);
    try {
      const result = await authApi.register({
        ...values,
        username: values.username.trim(),
        realName: values.realName?.trim() || undefined,
      });
      setNotice(
        result.activationLink
          ? `注册成功。请先打开激活链接，再回来登录：${result.activationLink}`
          : '注册成功，请使用新账号登录。',
      );
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <aside className="login-aside">
        <div>
          <Logo />
          <h2>把文档、检索和图谱放在同一处。</h2>
          <p>登录后可以管理知识文档，做全文检索、基于资料的对话，以及查看知识图谱。</p>
        </div>
        <span style={{ opacity: 0.7 }}>本地账号 admin / 123456</span>
      </aside>
      <section className="login-panel">
        <div className="login-card">
          <h1 style={{ marginTop: 0, color: '#0f2744' }}>欢迎回来</h1>
          {notice ? <Alert type="success" showIcon message={notice} style={{ marginBottom: 16 }} /> : null}
          <Tabs
            items={[
              {
                key: 'login',
                label: '登录',
                children: (
                  <Form layout="vertical" onFinish={login} requiredMark={false}>
                    <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                      <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                      登录
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: '注册',
                children: (
                  <Form layout="vertical" onFinish={register} requiredMark={false}>
                    <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                      <Input placeholder="用户名" size="large" />
                    </Form.Item>
                    <Form.Item name="realName">
                      <Input placeholder="姓名，可选" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      rules={[{ required: true, type: 'email', message: '请输入邮箱' }]}
                    >
                      <Input placeholder="邮箱" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, min: 6, message: '密码至少 6 位' }]}
                    >
                      <Input.Password placeholder="密码" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                      注册
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
