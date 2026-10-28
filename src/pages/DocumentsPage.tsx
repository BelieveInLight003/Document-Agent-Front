import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Modal, Space, Table, Tag, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentApi } from '../api';
import { useAuth } from '../auth';
import type { DocumentRecord } from '../types';
import { can, documentStatus, errorText, formatTime, splitTags } from '../utils';

export function DocumentsPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await documentApi.list();
      setRows(list.map((item) => item.document));
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>文档管理</h1>
          <p>草稿可以编辑后提交审核，通过后进入检索和图谱。</p>
        </div>
        <Space>
          {can(user, 'document:create') ? (
            <>
              <Button icon={<InboxOutlined />} onClick={() => setUploadOpen(true)}>
                上传解析
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/documents/new')}>
                新建文档
              </Button>
            </>
          ) : null}
        </Space>
      </div>
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
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
              title: '标签',
              dataIndex: 'tags',
              render: (tags: string | null) =>
                splitTags(tags).map((tag) => <Tag key={tag}>{tag}</Tag>),
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
            { title: '字数', dataIndex: 'wordCount', width: 90 },
            {
              title: '更新时间',
              dataIndex: 'updatedAt',
              width: 170,
              render: (value: string) => formatTime(value),
            },
          ]}
        />
      </Card>
      <Modal
        title="上传并解析"
        open={uploadOpen}
        footer={null}
        onCancel={() => setUploadOpen(false)}
        destroyOnClose
      >
        <Upload.Dragger
          maxCount={1}
          accept=".doc,.docx,.pdf,.txt,.ppt,.pptx,.xls,.xlsx,.xml"
          showUploadList={false}
          disabled={uploading}
          customRequest={async ({ file, onError, onSuccess }) => {
            setUploading(true);
            try {
              const bundle = await documentApi.parseUpload(file as File);
              message.success('解析完成，已保存为草稿');
              onSuccess?.(bundle);
              setUploadOpen(false);
              navigate(`/documents/${bundle.document.id}`);
            } catch (error) {
              message.error(errorText(error));
              onError?.(error as Error);
            } finally {
              setUploading(false);
            }
          }}
        >
          <p>点击或拖入文档。支持 doc、docx、pdf、txt、ppt、xls。</p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
}
