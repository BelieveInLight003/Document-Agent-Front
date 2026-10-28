import { App, Button, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentApi } from '../../api';
import { useAuth } from '../../auth';
import type { ReviewRecord } from '../../types';
import { can, errorText, formatTime } from '../../utils';

export function ReviewsPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const canReview = can(user, 'document:review');
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReviewRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<ReviewRecord | null>(null);
  const [opinion, setOpinion] = useState('');
  const [acting, setActing] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const result = await documentApi.pendingReviews(nextPage, 10);
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
    void load(1);
  }, []);

  async function decide(approve: boolean) {
    if (!current) return;
    if (!approve && !opinion.trim()) {
      message.warning('驳回时请填写意见');
      return;
    }
    setActing(true);
    try {
      if (approve) await documentApi.approve(current.id, opinion.trim() || undefined);
      else await documentApi.reject(current.id, opinion.trim());
      message.success(approve ? '已通过' : '已驳回');
      setCurrent(null);
      setOpinion('');
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>内容审核</h1>
          <p>通过后文档会发布，并写入检索和图谱。驳回后回到草稿。</p>
        </div>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{
          current: page,
          total,
          pageSize: 10,
          showSizeChanger: false,
          onChange: (next) => void load(next),
        }}
        columns={[
          {
            title: '文档',
            dataIndex: 'title',
            render: (title: string | null, row) => (
              <Typography.Link onClick={() => navigate(`/documents/${row.documentId}`)}>
                {title || row.documentId}
              </Typography.Link>
            ),
          },
          {
            title: '状态',
            width: 100,
            render: () => <Tag color="blue">待审核</Tag>,
          },
          {
            title: '提交时间',
            dataIndex: 'createdAt',
            width: 170,
            render: (value: string) => formatTime(value),
          },
          {
            title: '操作',
            width: 120,
            render: (_, row) =>
              canReview ? (
              <Button
                type="link"
                onClick={() => {
                  setCurrent(row);
                  setOpinion('');
                }}
              >
                处理
              </Button>
              ) : null,
          },
        ]}
      />
      <Modal
        title={current?.title || '审核'}
        open={!!current}
        onCancel={() => setCurrent(null)}
        footer={
          <Space>
            {canReview ? (
              <Button danger loading={acting} onClick={() => void decide(false)}>
                驳回
              </Button>
            ) : null}
            {canReview ? (
              <Button type="primary" loading={acting} onClick={() => void decide(true)}>
                通过
              </Button>
            ) : null}
          </Space>
        }
      >
        <Input.TextArea
          rows={4}
          value={opinion}
          placeholder="审核意见。驳回时必填。"
          onChange={(event) => setOpinion(event.target.value)}
        />
      </Modal>
    </div>
  );
}
