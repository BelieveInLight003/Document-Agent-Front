import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentApi } from '../api';
import { useAuth } from '../auth';
import type { DocumentRecord } from '../types';
import { documentStatus, formatTime, can } from '../utils';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    documentApi
      .list()
      .then((rows) => {
        if (!cancelled) setDocuments(rows.map((item) => item.document));
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      });
    if (can(user, 'document:review')) {
      documentApi
        .pendingCount()
        .then((result) => {
          if (!cancelled) setPending(result.count);
        })
        .catch(() => {
          if (!cancelled) setPending(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  const published = documents.filter((item) => item.status === 1).length;
  const drafts = documents.filter((item) => item.status === 0).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>仪表盘</h1>
          <p>当前知识库的文档概况。</p>
        </div>
      </div>
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="文档" value={documents.length} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="已发布" value={published} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="草稿" value={drafts} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="待审核" value={pending ?? '—'} />
          </Card>
        </Col>
      </Row>
      <Card title="最近文档">
        <Table
          rowKey="id"
          pagination={false}
          dataSource={documents.slice(0, 6)}
          columns={[
            {
              title: '标题',
              dataIndex: 'title',
              render: (title: string, row) => (
                <Typography.Link onClick={() => navigate(`/documents/${row.id}`)}>
                  {title}
                </Typography.Link>
              ),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (status: number) => {
                const meta = documentStatus(status);
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
            },
            {
              title: '更新时间',
              dataIndex: 'updatedAt',
              width: 180,
              render: (value: string) => formatTime(value),
            },
          ]}
        />
      </Card>
    </div>
  );
}
