import { App, Button, Card, Checkbox, Col, Form, Input, List, Modal, Row, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { permissionApi, userApi } from '../../api';
import { useAuth } from '../../auth';
import type { Permission, RoleItem } from '../../types';
import { can, errorText, roleLabel } from '../../utils';

function normalizeRoleCode(value: string) {
  const raw = value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_');
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw : `ROLE_${raw}`;
}

export function RolesPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const canCreate = can(user, 'system:role:create');
  const canEdit = can(user, 'system:role:edit');
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [current, setCurrent] = useState<RoleItem | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftChecked, setDraftChecked] = useState<string[]>([]);
  const [form] = Form.useForm<{ roleName: string; roleCode: string; description?: string }>();

  useEffect(() => {
    Promise.all([userApi.roles(), permissionApi.list()])
      .then(([roleList, permissionList]) => {
        setRoles(roleList);
        setPermissions(permissionList.filter((item) => item.status === 1));
        if (roleList[0]) void select(roleList[0]);
      })
      .catch((error) => message.error(errorText(error)));
  }, [message]);

  async function select(role: RoleItem) {
    setCurrent(role);
    try {
      const result = await permissionApi.ofRole(role.id);
      setChecked(result.permissions.map((item) => item.id));
    } catch (error) {
      message.error(errorText(error));
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const item of permissions) {
      const key = item.permissionCode.split(':')[0] || '其他';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [permissions]);

  async function save() {
    if (!current) return;
    setSaving(true);
    try {
      await permissionApi.replaceRole(current.id, checked);
      message.success('权限已更新');
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
          <h1>角色管理</h1>
          <p>新建角色时勾选权限，也可以之后在右侧调整并保存。</p>
        </div>
        <Space>
          {canCreate ? (
            <Button
              onClick={() => {
                form.resetFields();
                setDraftChecked([]);
                setOpen(true);
              }}
            >
              新建角色
            </Button>
          ) : null}
          {canEdit ? (
            <Button type="primary" loading={saving} disabled={!current} onClick={() => void save()}>
              保存权限
            </Button>
          ) : null}
        </Space>
      </div>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card title="角色">
            <List
              dataSource={roles}
              renderItem={(role) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    background: current?.id === role.id ? '#eff6ff' : undefined,
                    paddingInline: 8,
                  }}
                  onClick={() => void select(role)}
                >
                  <List.Item.Meta
                    title={role.roleName || roleLabel(role.roleCode)}
                    description={role.description ? `${role.roleCode} · ${role.description}` : role.roleCode}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title={current ? `${current.roleName} 的权限` : '权限'}>
            <Checkbox.Group
              style={{ width: '100%' }}
              value={checked}
              disabled={!canEdit}
              onChange={(values) => setChecked(values.map(String))}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {groups.map(([name, items]) => (
                  <div key={name}>
                    <Typography.Text type="secondary">{name}</Typography.Text>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      {items.map((item) => (
                        <Checkbox key={item.id} value={item.id}>
                          {item.permissionName}
                          <Typography.Text type="secondary"> {item.permissionCode}</Typography.Text>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </Space>
            </Checkbox.Group>
          </Card>
        </Col>
      </Row>
      <Modal
        title="新建角色"
        open={open}
        confirmLoading={creating}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            const roleCode = normalizeRoleCode(values.roleCode);
            if (!/^ROLE_[A-Z0-9_]+$/.test(roleCode)) {
              message.warning('角色编码需要以 ROLE_ 开头，只能包含大写字母、数字和下划线');
              return;
            }
            setCreating(true);
            try {
              const created = await userApi.createRole({
                roleName: values.roleName.trim(),
                roleCode,
                description: values.description?.trim() || undefined,
                permissionIds: draftChecked,
              });
              setRoles((currentRoles) => [...currentRoles, created]);
              setCurrent(created);
              setChecked(created.permissions.map((item) => item.id));
              setOpen(false);
              message.success('角色已创建');
            } catch (error) {
              message.error(errorText(error));
            } finally {
              setCreating(false);
            }
          }}
        >
          <Form.Item name="roleName" label="名称" rules={[{ required: true, message: '请填写角色名称' }]}>
            <Input maxLength={50} placeholder="例如：编辑" />
          </Form.Item>
          <Form.Item
            name="roleCode"
            label="编码"
            extra="会自动补上 ROLE_ 并转为大写，例如 editor 会保存为 ROLE_EDITOR"
            rules={[{ required: true, message: '请填写角色编码' }]}
          >
            <Input maxLength={50} placeholder="ROLE_EDITOR" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item label="权限">
            <Checkbox.Group
              style={{ width: '100%' }}
              value={draftChecked}
              onChange={(values) => setDraftChecked(values.map(String))}
            >
              <Space direction="vertical" size={12} style={{ width: '100%', maxHeight: 280, overflow: 'auto' }}>
                {groups.map(([name, items]) => (
                  <div key={name}>
                    <Typography.Text type="secondary">{name}</Typography.Text>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      {items.map((item) => (
                        <Checkbox key={item.id} value={item.id}>
                          {item.permissionName}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
