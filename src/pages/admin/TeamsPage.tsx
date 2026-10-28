import { App, Button, Drawer, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { teamApi, userApi } from '../../api';
import { useAuth } from '../../auth';
import type { Account, Team, TeamMember } from '../../types';
import { can, errorText } from '../../utils';

type TeamForm = {
  teamName: string;
  teamCode?: string;
  description?: string;
  status?: number;
};

export function TeamsPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const canCreate = can(user, 'system:team:create');
  const canEdit = can(user, 'system:team:edit');
  const canDelete = can(user, 'system:team:delete');
  const [form] = Form.useForm<TeamForm>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [current, setCurrent] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [userId, setUserId] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTeams(await teamApi.list());
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    userApi
      .list({ page: 1, pageSize: 100 })
      .then((result) => setUsers(result.list))
      .catch(() => setUsers([]));
  }, []);

  async function openMembers(team: Team) {
    setCurrent(team);
    try {
      const result = await teamApi.members(team.id);
      setMembers(result.members);
    } catch (error) {
      message.error(errorText(error));
    }
  }

  async function save(values: TeamForm) {
    const payload = {
      teamName: values.teamName.trim(),
      teamCode: values.teamCode?.trim() || undefined,
      description: values.description?.trim() || undefined,
      status: values.status,
    };
    try {
      if (editing) await teamApi.update(editing.id, payload);
      else await teamApi.create(payload);
      message.success(editing ? '已更新' : '已创建');
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
          <h1>团队管理</h1>
          <p>维护团队资料，并把用户加进团队。</p>
        </div>
        {canCreate ? (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ status: 1 });
              setOpen(true);
            }}
          >
            新建团队
          </Button>
        ) : null}
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={teams}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'teamName' },
          { title: '编码', dataIndex: 'teamCode', render: (value: string | null) => value || '—' },
          {
            title: '负责人',
            dataIndex: 'leader',
            render: (leader: Team['leader']) => leader?.realName || leader?.username || '—',
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (status: number) => (status === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>),
          },
          {
            title: '操作',
            width: 200,
            render: (_, team) => (
              <Space>
                <Button type="link" onClick={() => void openMembers(team)}>
                  成员
                </Button>
                {canEdit ? (
                  <Button
                    type="link"
                    onClick={() => {
                      setEditing(team);
                      form.setFieldsValue({
                        teamName: team.teamName,
                        teamCode: team.teamCode ?? undefined,
                        description: team.description ?? undefined,
                        status: team.status,
                      });
                      setOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                ) : null}
                {canDelete ? (
                  <Popconfirm
                    title="删除这个团队？"
                    onConfirm={async () => {
                      try {
                        await teamApi.remove(team.id);
                        message.success('已删除');
                        await load();
                      } catch (error) {
                        message.error(errorText(error));
                      }
                    }}
                  >
                    <Button type="link" danger>
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
        title={editing ? '编辑团队' : '新建团队'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="teamName" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="teamCode" label="编码">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} />
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
      <Drawer title={current ? `${current.teamName} 的成员` : '成员'} open={!!current} onClose={() => setCurrent(null)} width={480}>
        <Space style={{ marginBottom: 16 }}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择用户"
            style={{ width: 220 }}
            value={userId}
            onChange={setUserId}
            options={users.map((item) => ({
              value: item.id,
              label: item.realName ? `${item.realName}（${item.username}）` : item.username,
            }))}
          />
          {canEdit ? (
            <Button
              type="primary"
              disabled={!current || !userId}
              onClick={async () => {
                if (!current || !userId) return;
                try {
                  await teamApi.addMember(current.id, userId, 'member');
                  setUserId(undefined);
                  const result = await teamApi.members(current.id);
                  setMembers(result.members);
                  await load();
                } catch (error) {
                  message.error(errorText(error));
                }
              }}
            >
              加入
            </Button>
          ) : null}
        </Space>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={members}
          columns={[
            {
              title: '用户',
              render: (_, member) => member.realName || member.username || member.userId,
            },
            {
              title: '角色',
              dataIndex: 'memberRole',
              render: (role: string, member) => (
                <Select
                  size="small"
                  disabled={!canEdit}
                  value={role}
                  style={{ width: 110 }}
                  options={[
                    { value: 'leader', label: '负责人' },
                    { value: 'member', label: '成员' },
                  ]}
                  onChange={async (memberRole) => {
                    if (!current) return;
                    try {
                      await teamApi.updateMember(current.id, member.userId, memberRole);
                      const result = await teamApi.members(current.id);
                      setMembers(result.members);
                      await load();
                    } catch (error) {
                      message.error(errorText(error));
                    }
                  }}
                />
              ),
            },
            {
              title: '',
              width: 80,
              render: (_, member) =>
                canEdit ? (
                <Button
                  type="link"
                  danger
                  onClick={async () => {
                    if (!current) return;
                    try {
                      await teamApi.removeMember(current.id, member.userId);
                      const result = await teamApi.members(current.id);
                      setMembers(result.members);
                      await load();
                    } catch (error) {
                      message.error(errorText(error));
                    }
                  }}
                >
                  移出
                </Button>
                ) : null,
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
