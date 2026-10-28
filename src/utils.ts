import type { SessionUser } from './types';

export function can(user: SessionUser | null, code: string) {
  return !!user?.permissionList.some(
    (item) => item.permissionCode === code && item.status !== 0,
  );
}

export function canAny(user: SessionUser | null, codes: string[]) {
  return codes.some((code) => can(user, code));
}

export type AppModule = {
  path: string;
  label: string;
  permission: string | string[];
  group?: 'admin';
};

/** 侧边栏和路由共用。permission 为数组时，具备其中任一编码即可进入。 */
export const APP_MODULES: AppModule[] = [
  { path: '/', label: '仪表盘', permission: 'dashboard' },
  { path: '/documents', label: '文档管理', permission: ['document', 'document:list'] },
  { path: '/search', label: '智能搜索', permission: 'search' },
  { path: '/chat', label: 'AI 问答', permission: 'search' },
  { path: '/graph', label: '知识图谱', permission: 'search' },
  { path: '/profile', label: '个人中心', permission: 'profile' },
  { path: '/admin/users', label: '用户管理', permission: 'system:user', group: 'admin' },
  { path: '/admin/roles', label: '角色管理', permission: 'system:role', group: 'admin' },
  { path: '/admin/teams', label: '团队管理', permission: 'system:team', group: 'admin' },
  { path: '/admin/reviews', label: '内容审核', permission: 'document:review', group: 'admin' },
];

export function moduleAllowed(user: SessionUser | null, permission: string | string[]) {
  return Array.isArray(permission) ? canAny(user, permission) : can(user, permission);
}

export function visibleModules(user: SessionUser | null) {
  return APP_MODULES.filter((item) => moduleAllowed(user, item.permission));
}

export function firstAllowedPath(user: SessionUser | null) {
  return visibleModules(user)[0]?.path ?? null;
}

export function pathAllowed(user: SessionUser | null, pathname: string) {
  if (pathname === '/documents/new') return can(user, 'document:create');
  if (/^\/documents\/[^/]+\/edit$/.test(pathname)) return can(user, 'document:edit');
  if (pathname.startsWith('/documents')) {
    return moduleAllowed(user, ['document', 'document:list']);
  }
  const match = [...APP_MODULES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) =>
      item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`),
    );
  return match ? moduleAllowed(user, match.permission) : false;
}

export function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DOCUMENT_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '草稿', color: 'default' },
  1: { text: '已发布', color: 'green' },
  2: { text: '已归档', color: 'gold' },
  3: { text: '待审核', color: 'blue' },
};

const REVIEW_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '待审核', color: 'blue' },
  1: { text: '已通过', color: 'green' },
  2: { text: '已驳回', color: 'red' },
};

export function documentStatus(status: number) {
  return DOCUMENT_STATUS[status] ?? { text: '未知', color: 'default' };
}

export function reviewStatus(status: number) {
  return REVIEW_STATUS[status] ?? { text: '未知', color: 'default' };
}

export function roleLabel(code: string) {
  if (code === 'ROLE_ADMIN') return '管理员';
  if (code === 'ROLE_REVIEWER') return '审核员';
  if (code === 'ROLE_USER') return '普通用户';
  return code;
}

export function splitTags(tags: string | null) {
  if (!tags) return [];
  return tags
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 高亮片段只保留 em，其余字符按文本显示。 */
export function highlightHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>');
}

export function errorText(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return '请求失败';
}
