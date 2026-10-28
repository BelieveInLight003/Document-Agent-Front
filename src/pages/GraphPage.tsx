import { DownloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Empty, Input, Row, Segmented, Select, Space } from 'antd';
import { useRef, useState } from 'react';
import { graphApi } from '../api';
import { GraphSummary } from '../components/GraphSummary';
import { GraphView, type GraphChartHandle } from '../components/GraphView';
import type { GraphView as GraphData } from '../types';
import { errorText } from '../utils';

export function GraphPage() {
  const { message } = App.useApp();
  const chartRef = useRef<GraphChartHandle>(null);
  const [mode, setMode] = useState<'nodes' | 'relations'>('nodes');
  const [keyword, setKeyword] = useState('');
  const [label, setLabel] = useState<string | undefined>();
  const [relation, setRelation] = useState<string | undefined>();
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    const text = keyword.trim();
    if (!text) {
      message.warning('请输入关键词');
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === 'nodes'
          ? await graphApi.nodes(text, label)
          : await graphApi.relations(text, relation);
      setData(result);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  const nodes = data?.nodes ?? [];
  const relations = data?.relations ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>知识图谱</h1>
          <p>按节点或关系检索，结果可以直接画成一张图。</p>
        </div>
      </div>
      <Card>
        <Space wrap>
          <Segmented
            value={mode}
            onChange={(value) => setMode(value as 'nodes' | 'relations')}
            options={[
              { label: '节点', value: 'nodes' },
              { label: '关系', value: 'relations' },
            ]}
          />
          <Input
            style={{ width: 240 }}
            placeholder="输入关键词检索图谱..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => void search()}
          />
          {mode === 'nodes' ? (
            <Select
              allowClear
              placeholder="节点类型"
              style={{ width: 140 }}
              value={label}
              onChange={setLabel}
              options={[
                { value: 'Document', label: '文档' },
                { value: 'Chunk', label: '切片' },
                { value: 'Entity', label: '实体' },
              ]}
            />
          ) : (
            <Select
              allowClear
              placeholder="关系类型"
              style={{ width: 160 }}
              value={relation}
              onChange={setRelation}
              options={[
                { value: 'HAS_CHUNK', label: '包含切片' },
                { value: 'MENTIONS', label: '提及' },
                { value: 'RELATED', label: '关联' },
              ]}
            />
          )}
          <Button type="primary" loading={loading} onClick={() => void search()}>
            检索
          </Button>
        </Space>
      </Card>
      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card
            extra={
              <Button
                icon={<DownloadOutlined />}
                disabled={nodes.length === 0}
                onClick={() => chartRef.current?.exportImage()}
              >
                导出图谱
              </Button>
            }
          >
            {data && nodes.length === 0 ? (
              <div className="graph-stage">
                <div className="graph-empty">
                  <Empty description="没有匹配的图谱" />
                </div>
              </div>
            ) : (
              <GraphView ref={chartRef} nodes={nodes} relations={relations} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <GraphSummary nodes={nodes} relations={relations} />
        </Col>
      </Row>
    </div>
  );
}
