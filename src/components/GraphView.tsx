import * as echarts from 'echarts';
import { Empty } from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GraphNode, GraphRelation } from '../types';
import { NODE_STYLES, edgeStyle, nodeColor, nodeStyleName } from './graph-visual';

export type GraphChartHandle = {
  exportImage: () => void;
};

function shortName(name: string) {
  return name.length > 10 ? `${name.slice(0, 10)}…` : name;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOption(nodes: GraphNode[], relations: GraphRelation[]): echarts.EChartsOption {
  const degree = new Map<string, number>();
  for (const relation of relations) {
    degree.set(relation.source, (degree.get(relation.source) ?? 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) ?? 0) + 1);
  }
  const crowded = nodes.length > 28;
  const dense = nodes.length > 80;

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: '#0f2744', fontSize: 13 },
      extraCssText: 'box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12); border-radius: 8px;',
      formatter: (params) => {
        const item = params as { dataType?: string; name?: string; data?: { kind?: string; relationName?: string } };
        if (item.dataType === 'edge') {
          return `<div style="font-weight:600">${escapeHtml(item.data?.relationName || item.name || '关系')}</div>`;
        }
        return `<div style="min-width:128px"><div style="font-weight:600">${escapeHtml(item.name || '')}</div><div style="margin-top:4px;color:#64748b">${escapeHtml(item.data?.kind || '')}</div></div>`;
      },
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        zoom: 1,
        scaleLimit: { min: 0.4, max: 3 },
        force: {
          repulsion: dense ? 90 : crowded ? 180 : 360,
          edgeLength: dense ? [24, 70] : [48, 130],
          gravity: dense ? 0.2 : 0.12,
          friction: 0.25,
        },
        labelLayout: { hideOverlap: true },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 2.2 },
        },
        lineStyle: { opacity: 0.9 },
        label: {
          show: true,
          position: 'right',
          color: '#334155',
          fontSize: 12,
          formatter: (params) => shortName(params.name),
        },
        data: nodes.map((node) => ({
          id: node.id,
          name: node.name,
          kind: nodeStyleName(node),
          symbolSize:
            node.label === 'Document'
              ? dense
                ? 28
                : crowded
                  ? 36
                  : 52
              : Math.min(
                  dense ? 16 : 40,
                  (dense ? 8 : crowded ? 16 : 22) + (degree.get(node.id) ?? 0) * (dense ? 0.35 : 3),
                ),
          itemStyle: {
            color: nodeColor(node),
            shadowBlur: 10,
            shadowColor: 'rgba(15, 23, 42, 0.12)',
          },
        })),
        links: relations.map((relation) => {
          const style = edgeStyle(relation.type);
          return {
            source: relation.source,
            target: relation.target,
            relationName: relation.name || style.label,
            lineStyle: {
              color: style.color,
              type: style.type,
              width: 1.4,
              curveness: 0.08,
            },
          };
        }),
      },
    ],
  };
}

export const GraphView = forwardRef<
  GraphChartHandle,
  { nodes: GraphNode[]; relations: GraphRelation[] }
>(function GraphView({ nodes, relations }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const zoomRef = useRef(1);

  useImperativeHandle(ref, () => ({
    exportImage() {
      const chart = chartRef.current;
      if (!chart) return;
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#f8fafc' });
      const link = document.createElement('a');
      link.href = url;
      link.download = '知识图谱.png';
      link.click();
    },
  }));

  useEffect(() => {
    const element = host.current;
    if (!element || nodes.length === 0) return;
    const chart = echarts.init(element);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [nodes.length === 0]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || nodes.length === 0) return;
    zoomRef.current = 1;
    chart.setOption(buildOption(nodes, relations), true);
  }, [nodes, relations]);

  function changeZoom(factor: number) {
    const chart = chartRef.current;
    if (!chart) return;
    zoomRef.current = Math.min(3, Math.max(0.4, Number((zoomRef.current * factor).toFixed(2))));
    chart.setOption({ series: [{ zoom: zoomRef.current }] });
  }

  return (
    <div className="graph-stage">
      {nodes.length === 0 ? (
        <div className="graph-empty">
          <Empty description="输入关键词后检索" />
        </div>
      ) : (
        <>
          <div ref={host} className="graph-canvas" />
          <div className="graph-zoom">
            <button type="button" aria-label="放大" onClick={() => changeZoom(1.2)}>
              +
            </button>
            <button type="button" aria-label="缩小" onClick={() => changeZoom(1 / 1.2)}>
              −
            </button>
          </div>
        </>
      )}
      <div className="graph-legend">
        {NODE_STYLES.map((item) => (
          <span key={item.name}>
            <i className="legend-dot" style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
        <span>
          <i className="legend-line" style={{ borderTopStyle: 'solid', borderTopColor: '#60a5fa' }} />
          提及
        </span>
        <span>
          <i className="legend-line" style={{ borderTopStyle: 'dashed', borderTopColor: '#64748b' }} />
          关联
        </span>
        <span>
          <i className="legend-line" style={{ borderTopStyle: 'dotted', borderTopColor: '#94a3b8' }} />
          标注
        </span>
      </div>
    </div>
  );
});
