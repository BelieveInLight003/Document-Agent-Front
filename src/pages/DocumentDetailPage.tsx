import { App, Button, Card, Descriptions, Empty, Popconfirm, Space, Tag, Timeline } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { documentApi } from '../api';
import { useAuth } from '../auth';
import type { DocumentBundle, ReviewRecord } from '../types';
import { can, documentStatus, errorText, formatTime, reviewStatus, splitTags } from '../utils';

function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      {text.split('\n').map((line, index) => {
        if (line.startsWith('### ')) return <h4 key={index}>{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={index}>{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={index}>{line.slice(2)}</h2>;
        if (!line.trim()) return <div key={index} className="gap" />;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export function DocumentDetailPage() {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<DocumentBundle | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [acting, setActing] = useState(false);

  async function load() {
    const [detail, history] = await Promise.all([
      documentApi.get(id),
      documentApi.reviews(id).catch(() => []),
    ]);
    setBundle(detail);
    setReviews(history);
  }

  useEffect(() => {
    void load().catch((error) => message.error(errorText(error)));
  }, [id]);

  async function run(action: () => Promise<unknown>, success: string) {
    setActing(true);
    try {
      const result = await action();
      if (result && typeof result === 'object' && 'message' in result && result.message) {
        message.warning(String(result.message));
      } else {
        message.success(success);
      }
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setActing(false);
    }
  }

  if (!bundle) return <Card loading />;

  const doc = bundle.document;
  const meta = documentStatus(doc.status);
  const editable = can(user, 'document:edit');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{doc.title}</h1>
          <p>{doc.summary || '暂无摘要'}</p>
        </div>
        <Space wrap>
          <Tag color={meta.color}>{meta.text}</Tag>
          {editable ? <Button onClick={() => navigate(`/documents/${doc.id}/edit`)}>编辑</Button> : null}
          {doc.status === 0 || doc.status === 1 ? (
            can(user, 'document:create') ? (
            <Button loading={acting} onClick={() => run(() => documentApi.submitReview(doc.id, user?.id), '已提交审核')}>
              提交审核
            </Button>
            ) : null
          ) : null}
          {editable && (doc.status === 0 || doc.status === 2) ? (
            <Button type="primary" loading={acting} onClick={() => run(() => documentApi.publish(doc.id), '已发布')}>
              发布
            </Button>
          ) : null}
          {editable && doc.status === 1 ? (
            <Button loading={acting} onClick={() => run(() => documentApi.archive(doc.id), '已归档')}>
              归档
            </Button>
          ) : null}
          {can(user, 'document:delete') ? (
            <Popconfirm
              title="删除这篇文档？"
              description="正文和索引会一起删除。"
              onConfirm={() =>
                run(async () => {
                  await documentApi.remove(doc.id);
                  navigate('/documents');
                }, '已删除')
              }
            >
              <Button danger>删除</Button>
            </Popconfirm>
          ) : null}
        </Space>
      </div>
      <Card>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="字数">{doc.wordCount}</Descriptions.Item>
          <Descriptions.Item label="公开">{doc.isPublic ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatTime(doc.updatedAt)}</Descriptions.Item>
          <Descriptions.Item label="标签" span={3}>
            {splitTags(doc.tags).length
              ? splitTags(doc.tags).map((tag) => <Tag key={tag}>{tag}</Tag>)
              : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="正文">
        {bundle.content?.content ? <Markdown text={bundle.content.content} /> : <Empty description="暂无正文" />}
      </Card>
      <Card title="审核记录">
        {reviews.length === 0 ? (
          <Empty description="还没有审核记录" />
        ) : (
          <Timeline
            items={reviews.map((item) => {
              const status = reviewStatus(item.reviewStatus);
              return {
                color: status.color === 'green' ? 'green' : status.color === 'red' ? 'red' : 'blue',
                children: (
                  <div>
                    <Tag color={status.color}>{status.text}</Tag>
                    <span style={{ color: '#64748b' }}>{formatTime(item.createdAt)}</span>
                    <div>{item.opinion || '无审核意见'}</div>
                  </div>
                ),
              };
            })}
          />
        )}
      </Card>
    </div>
  );
}
