import { Card, Empty } from 'antd';
import * as echarts from 'echarts';
import { useEffect, useMemo, useRef } from 'react';
import type { GraphNode, GraphRelation } from '../types';
import { PIE_COLORS, graphStats, typeSlices } from './graph-visual';

function TypeDonut({ slices }: { slices: Array<{ name: string; value: number }> }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const chart = echarts.init(element);
    chart.setOption({
      color: PIE_COLORS,
      tooltip: { trigger: 'item', formatter: '{b}<br/>{c}（{d}%）' },
      legend: {
        orient: 'vertical',
        left: 0,
        top: 'middle',
        type: 'scroll',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#475569', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['68%', '52%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          data: slices,
        },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [slices]);

  return <div ref={host} className="graph-donut" />;
}

export function GraphSummary({
  nodes,
  relations,
}: {
  nodes: GraphNode[];
  relations: GraphRelation[];
}) {
  const stats = useMemo(() => graphStats(nodes, relations), [nodes, relations]);
  const slices = useMemo(() => typeSlices(nodes), [nodes]);

  return (
    <div className="graph-side">
      <Card title="图谱数据统计" size="small">
        <div className="graph-stat-grid">
          {stats.map((item) => (
            <div key={item.label} className="graph-stat">
              <b>{item.value}</b>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="知识节点类型分布" size="small">
        {slices.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前结果没有实体类型" />
        ) : (
          <TypeDonut slices={slices} />
        )}
      </Card>
    </div>
  );
}
