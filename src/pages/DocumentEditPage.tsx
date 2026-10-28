import { App, Button, Card, Form, Input, Space, Switch } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { documentApi } from '../api';
import { useAuth } from '../auth';
import { errorText } from '../utils';

type FormValues = {
  title: string;
  summary?: string;
  tags?: string;
  isPublic?: boolean;
  content?: string;
};

export function DocumentEditPage() {
  const { id } = useParams();
  const creating = !id;
  const { message } = App.useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    documentApi
      .get(id)
      .then((bundle) => {
        if (cancelled) return;
        form.setFieldsValue({
          title: bundle.document.title,
          summary: bundle.document.summary ?? '',
          tags: bundle.document.tags ?? '',
          isPublic: bundle.document.isPublic,
          content: bundle.content?.content ?? '',
        });
      })
      .catch((error) => message.error(errorText(error)));
    return () => {
      cancelled = true;
    };
  }, [id, form, message]);

  async function save(values: FormValues) {
    setLoading(true);
    try {
      const payload = {
        title: values.title.trim(),
        summary: values.summary?.trim() || undefined,
        tags: values.tags?.trim() || undefined,
        isPublic: !!values.isPublic,
        content: values.content ?? '',
      };
      const saved = creating
        ? await documentApi.create({
            ...payload,
            status: 0,
            authorId: user?.id,
            createBy: user?.id,
          })
        : await documentApi.update(id, { ...payload, updateBy: user?.id });
      message.success(creating ? '已创建草稿' : '已保存');
      navigate(`/documents/${saved.document.id}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{creating ? '新建文档' : '编辑文档'}</h1>
          <p>保存后仍是草稿，需要发布或审核通过才会进入检索。</p>
        </div>
      </div>
      <Card>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ isPublic: false }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请填写标题' }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="tags" label="标签" extra="多个标签用逗号分开">
            <Input />
          </Form.Item>
          <Form.Item name="isPublic" label="公开" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="content" label="正文">
            <Input.TextArea rows={16} placeholder="支持 Markdown 标题" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
            <Button onClick={() => navigate(id ? `/documents/${id}` : '/documents')}>取消</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
