import { App, Button, Card, Form, Input, Tag } from 'antd';
import { useState } from 'react';
import { authApi, userApi } from '../api';
import { setSessionUser, useAuth } from '../auth';
import { errorText, roleLabel } from '../utils';

export function ProfilePage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  async function save(values: {
    realName?: string;
    email?: string;
    oldPassword?: string;
    password?: string;
  }) {
    setSaving(true);
    try {
      await userApi.updateMe({
        realName: values.realName?.trim() || undefined,
        email: values.email?.trim() || undefined,
        oldPassword: values.oldPassword || undefined,
        password: values.password || undefined,
      });
      setSessionUser(await authApi.me());
      message.success('资料已更新');
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>个人中心</h1>
          <p>
            {user?.roles.map((role) => (
              <Tag key={role}>{roleLabel(role)}</Tag>
            ))}
          </p>
        </div>
      </div>
      <Card style={{ maxWidth: 560 }}>
        <Form
          layout="vertical"
          initialValues={{ realName: user?.realName ?? '', email: user?.email ?? '' }}
          onFinish={save}
        >
          <Form.Item label="用户名">
            <Input value={user?.username} disabled />
          </Form.Item>
          <Form.Item name="realName" label="姓名">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="oldPassword" label="原密码">
            <Input.Password placeholder="修改密码时填写" />
          </Form.Item>
          <Form.Item name="password" label="新密码" rules={[{ min: 6, message: '至少 6 位' }]}>
            <Input.Password placeholder="不修改可留空" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            保存
          </Button>
        </Form>
      </Card>
    </div>
  );
}
