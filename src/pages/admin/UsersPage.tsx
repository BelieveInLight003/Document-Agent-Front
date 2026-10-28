import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { userApi } from '../../api';
import { useAuth } from '../../auth';
import type { Account, RoleItem } from '../../types';
import { errorText, formatTime, roleLabel, can } from '../../utils';

type UserForm = {
  username: string;
  password?: string;
  email?: string;
  realName?: string;
  status?: number;
  roleCodes?: string[];
};

export function UsersPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const canCreate = can(user, 'system:user:create');
  const canEdit = can(user, 'system:user:edit');
  const canDelete = can(user, 'system:user:delete');
  const [form] = Form.useForm<UserForm>();
  const [rows, setRows] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [username, setUsername] = useState('');
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [editing, setEditing] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load(nextPage = page, name = username) {
    setLoading(true);
    try {
      const result = await userApi.list({
        page: nextPage,
        pageSize: 10,
        username: name.trim() || undefined,
      });
      setRows(result.list);
      setTotal(result.total);
      setPage(result.page);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, '');
    userApi.roles().then(setRoles).catch(() => setRoles([]));
  }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, roleCodes: ['ROLE_USER'] });
    setOpen(true);
  }

  function openEdit(row: Account) {
    setEditing(row);
    form.setFieldsValue({
      username: row.username,
      email: row.email ?? '',
      realName: row.realName ?? '',
      status: row.status,
      roleCodes: row.roles,
    });
    setOpen(true);
  }

  async function save(values: UserForm) {
    try {
      if (editing) {
        await userApi.update(editing.id, {
          email: values.email?.trim() || undefined,
          realName: values.realName?.trim() || undefined,
          status: values.status,
          password: values.password || undefined,
          roleCodes: values.roleCodes,
        });
        message.success('已更新');
      } else {
        await userApi.create({
          username: values.username.trim(),
          password: values.password || '',
          email: values.email?.trim() || undefined,
          realName: values.realName?.trim() || undefined,
          status: values.status,
          roleCodes: values.roleCodes,
        });
        message.success('已创建');
      }
      setOpen(false);
      await load();
    } catch (error) {
      message.error(errorText(error));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>用户管理</h1>
          <p>创建账号、调整角色和启用状态。</p>
        </div>
        {canCreate ? (
          <Button type="primary" onClick={openCreate}>
            新建用户
          </Button>
        ) : null}
      </div>
      <Space>
        <Input
          allowClear
          placeholder="按用户名筛选"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          onPressEnter={() => void load(1, username)}
          style={{ width: 220 }}
        />
        <Button onClick={() => void load(1, username)}>查询</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          showSizeChanger: false,
          onChange: (next) => void load(next),
        }}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'realName', render: (value: string | null) => value || '—' },
          { title: '邮箱', dataIndex: 'email', render: (value: string | null) => value || '—' },
          {
            title: '角色',
            dataIndex: 'roles',
            render: (codes: string[]) =>
              codes.map((code) => (
                <Tag key={code}>{roles.find((role) => role.roleCode === code)?.roleName || roleLabel(code)}</Tag>
              )),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (status: number) =>
              status === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
          },
          {
            title: '最近登录',
            dataIndex: 'lastLoginAt',
            width: 170,
            render: (value: string | null) => formatTime(value),
          },
          {
            title: '操作',
            width: 140,
            render: (_, row) => (
              <Space>
                {canEdit ? (
                  <Button type="link" onClick={() => openEdit(row)}>
                    编辑
                  </Button>
                ) : null}
                {canDelete ? (
                  <Popconfirm
                    title="删除这个用户？"
                    onConfirm={async () => {
                      try {
                        await userApi.remove(row.id);
                        message.success('已删除');
                        await load();
                      } catch (error) {
                        message.error(errorText(error));
                      }
                    }}
                  >
                    <Button type="link" danger disabled={row.id === user?.id}>
                      删除
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? '编辑用户' : '新建用户'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="username" label="用户名" rules={[{ required: !editing, message: '请填写用户名' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="realName" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? '重置密码' : '密码'}
            rules={[
              {
                validator: (_, value) => {
                  if (!value) {
                    return editing ? Promise.resolve() : Promise.reject(new Error('至少 6 位'));
                  }
                  if (String(value).length < 6) return Promise.reject(new Error('至少 6 位'));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password placeholder={editing ? '不修改可留空' : ''} />
          </Form.Item>
          <Form.Item name="roleCodes" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              mode="multiple"
              options={roles.map((role) => ({
                value: role.roleCode,
                label: role.roleName || roleLabel(role.roleCode),
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '禁用' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
