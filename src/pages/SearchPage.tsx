import { App, Button, Card, Empty, Input, List, Pagination, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api';
import type { SearchHit } from '../types';
import { errorText, highlightHtml } from '../utils';

export function SearchPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [list, setList] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  async function search(nextPage: number, text = submitted) {
    const value = text.trim();
    if (!value) {
      message.warning('请输入关键词');
      return;
    }
    setLoading(true);
    setSubmitted(value);
    setPage(nextPage);
    try {
      const result = await searchApi.search(value, nextPage, pageSize);
      setList(result.list);
      setTotal(result.total);
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
          <h1>智能搜索</h1>
          <p>检索已发布文档，最多返回三段高亮摘录。</p>
        </div>
      </div>
      <Card>
        <Space.Compact style={{ width: '100%', maxWidth: 640 }}>
          <Input
            size="large"
            placeholder="输入关键词"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => void search(1, keyword)}
          />
          <Button size="large" type="primary" loading={loading} onClick={() => void search(1, keyword)}>
            搜索
          </Button>
        </Space.Compact>
      </Card>
      <Card>
        {list.length === 0 ? (
          <Empty description={submitted ? '没有匹配的文档' : '输入关键词开始检索'} />
        ) : (
          <List
            dataSource={list}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Typography.Link onClick={() => navigate(`/documents/${item.document.id}`)}>
                        {item.document.title}
                      </Typography.Link>
                      {item.score != null ? <Tag>相关度 {item.score.toFixed(2)}</Tag> : null}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={6}>
                      {item.highlights.length ? (
                        item.highlights.map((text, index) => (
                          <div
                            key={index}
                            className="hl"
                            dangerouslySetInnerHTML={{ __html: highlightHtml(text) }}
                          />
                        ))
                      ) : (
                        <span>{item.document.summary || '标题命中，正文没有摘录'}</span>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
        {total > pageSize ? (
          <Pagination
            style={{ marginTop: 16 }}
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={(next) => void search(next)}
          />
        ) : null}
      </Card>
    </div>
  );
}
