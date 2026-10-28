import type { GraphNode, GraphRelation } from '../types';

export const NODE_STYLES = [
  { name: '文档', color: '#3b82f6' },
  { name: '知识点', color: '#22c55e' },
  { name: '人物', color: '#f59e0b' },
  { name: '组织', color: '#8b5cf6' },
  { name: '标签', color: '#94a3b8' },
] as const;

export type NodeStyleName = (typeof NODE_STYLES)[number]['name'];

const COLOR_OF: Record<NodeStyleName, string> = {
  文档: '#3b82f6',
  知识点: '#22c55e',
  人物: '#f59e0b',
  组织: '#8b5cf6',
  标签: '#94a3b8',
};

export function nodeStyleName(node: GraphNode): NodeStyleName {
  if (node.label === 'Document') return '文档';
  if (node.label === 'Chunk') return '知识点';
  const type = node.entityType ?? '';
  if (/人物|人员|员工|岗位|职位|角色|审核员|person/i.test(type)) return '人物';
  if (/组织|公司|部门|机构|单位|团队|org/i.test(type)) return '组织';
  if (/标签|tag|主题/i.test(type)) return '标签';
  return '知识点';
}

export function nodeColor(node: GraphNode) {
  return COLOR_OF[nodeStyleName(node)];
}

export function edgeStyle(type: string) {
  if (type === 'MENTIONS') return { color: '#60a5fa', type: 'solid' as const, label: '提及' };
  if (type === 'RELATED') return { color: '#64748b', type: 'dashed' as const, label: '关联' };
  return { color: '#94a3b8', type: 'dotted' as const, label: '标注' };
}

export function graphStats(nodes: GraphNode[], relations: GraphRelation[]) {
  return [
    { label: '文档节点', value: nodes.filter((node) => node.label === 'Document').length },
    { label: '知识节点', value: nodes.filter((node) => node.label === 'Chunk').length },
    { label: '实体关系', value: relations.filter((relation) => relation.type === 'RELATED').length },
    { label: '文档提及', value: relations.filter((relation) => relation.type === 'MENTIONS').length },
    { label: '当前标签', value: nodes.filter((node) => nodeStyleName(node) === '标签').length },
    { label: '画布边数', value: relations.length },
  ];
}

export function typeSlices(nodes: GraphNode[]) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.label !== 'Entity') continue;
    const name = node.entityType?.trim() || '未分类';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, value]) => ({ name, value }));
}

export const PIE_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#eab308',
  '#64748b',
  '#ef4444',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
];
