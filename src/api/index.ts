import type {
  Account,
  ChatMessage,
  ChatResult,
  ChatSession,
  DocumentBundle,
  GraphView,
  HybridHit,
  LoginResult,
  Page,
  Permission,
  ReviewRecord,
  RoleItem,
  SearchHit,
  SessionUser,
  Team,
  TeamMember,
} from '../types';
import { api } from './client';

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const authApi = {
  login(username: string, password: string) {
    return api<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  register(input: {
    username: string;
    password: string;
    email: string;
    realName?: string;
  }) {
    return api<Account & { activationLink?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  me() {
    return api<SessionUser>('/auth/me');
  },
};

export const documentApi = {
  list() {
    return api<DocumentBundle[]>('/documents');
  },
  get(id: string) {
    return api<DocumentBundle>(`/documents/${id}`);
  },
  create(input: {
    title: string;
    content?: string;
    summary?: string;
    tags?: string;
    isPublic?: boolean;
    authorId?: string;
    createBy?: string;
    status?: number;
  }) {
    return api<DocumentBundle>('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(
    id: string,
    input: {
      title?: string;
      content?: string;
      summary?: string;
      tags?: string;
      isPublic?: boolean;
      updateBy?: string;
    },
  ) {
    return api<DocumentBundle>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  remove(id: string) {
    return api<{ id: string }>(`/documents`, {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
  publish(id: string) {
    return api<{ message?: string }>(`/documents/${id}/publish`, { method: 'PUT' });
  },
  archive(id: string) {
    return api<{ id: string; status: number }>(`/documents/${id}/archive`, {
      method: 'PUT',
    });
  },
  parseUpload(file: File, title?: string) {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return api<DocumentBundle>('/documents/upload/parse', {
      method: 'POST',
      body: form,
    });
  },
  submitReview(id: string, submitterId?: string) {
    return api<{ review: ReviewRecord }>(`/documents/${id}/review/submit`, {
      method: 'POST',
      body: JSON.stringify(submitterId ? { submitterId } : {}),
    });
  },
  reviews(id: string) {
    return api<ReviewRecord[]>(`/documents/${id}/reviews`);
  },
  pendingReviews(page = 1, pageSize = 10) {
    return api<Page<ReviewRecord>>(
      `/documents/reviews/pending${query({ page, pageSize })}`,
    );
  },
  pendingCount() {
    return api<{ count: number }>('/documents/reviews/pending/count');
  },
  approve(taskId: string, opinion?: string) {
    return api<{ review: ReviewRecord }>(`/documents/reviews/${taskId}/approve`, {
      method: 'POST',
      body: JSON.stringify(opinion ? { opinion } : {}),
    });
  },
  reject(taskId: string, opinion: string) {
    return api<{ review: ReviewRecord }>(`/documents/reviews/${taskId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ opinion }),
    });
  },
};

export const searchApi = {
  search(keyword: string, page = 1, pageSize = 10) {
    return api<Page<SearchHit>>(`/search${query({ keyword, page, pageSize })}`);
  },
};

export const graphApi = {
  nodes(keyword: string, label?: string) {
    return api<GraphView>(`/graph/nodes${query({ keyword, label, limit: 20 })}`);
  },
  relations(keyword: string, relation?: string) {
    return api<GraphView>(
      `/graph/relations${query({ keyword, relation, limit: 20 })}`,
    );
  },
};

export const aiApi = {
  chat(question: string, limit = 5) {
    return api<ChatResult>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ question, limit }),
    });
  },
  retrieve(question: string, limit = 5) {
    return api<{ question: string; items: HybridHit[] }>('/ai/retrieve', {
      method: 'POST',
      body: JSON.stringify({ question, limit }),
    });
  },
  sessions() {
    return api<{ list: ChatSession[] }>('/ai/sessions');
  },
  createSession(title?: string) {
    return api<ChatSession>('/ai/sessions', {
      method: 'POST',
      body: JSON.stringify(title ? { title } : {}),
    });
  },
  session(id: string) {
    return api<{ session: ChatSession; messages: ChatMessage[] }>(`/ai/sessions/${id}`);
  },
  removeSession(id: string) {
    return api<{ id: string }>(`/ai/sessions/${id}`, { method: 'DELETE' });
  },
  ask(id: string, question: string, limit = 5) {
    return api<{ session: ChatSession; messages: ChatMessage[] }>(`/ai/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ question, limit }),
    });
  },
};

export const userApi = {
  list(params: { page?: number; pageSize?: number; username?: string; status?: number }) {
    return api<Page<Account>>(`/users${query(params)}`);
  },
  create(input: {
    username: string;
    password: string;
    email?: string;
    realName?: string;
    status?: number;
    roleCodes?: string[];
  }) {
    return api<Account>('/users', { method: 'POST', body: JSON.stringify(input) });
  },
  update(
    id: string,
    input: {
      email?: string;
      realName?: string;
      status?: number;
      password?: string;
      roleCodes?: string[];
    },
  ) {
    return api<Account>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  remove(id: string) {
    return api<{ id: string; deleted: boolean }>(`/users/${id}`, { method: 'DELETE' });
  },
  updateMe(input: {
    email?: string;
    realName?: string;
    oldPassword?: string;
    password?: string;
  }) {
    return api<Account>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  roles() {
    return api<RoleItem[]>('/roles');
  },
  createRole(input: {
    roleName: string;
    roleCode: string;
    description?: string;
    permissionIds?: string[];
  }) {
    return api<RoleItem & { permissions: Permission[] }>('/roles', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

export const permissionApi = {
  list() {
    return api<Permission[]>('/permissions');
  },
  ofRole(roleId: string) {
    return api<{ roleId: string; roleCode: string; permissions: Permission[] }>(
      `/roles/${roleId}/permissions`,
    );
  },
  replaceRole(roleId: string, permissionIds: string[]) {
    return api<{ roleId: string; permissions: Permission[] }>(
      `/roles/${roleId}/permissions`,
      { method: 'PUT', body: JSON.stringify({ permissionIds }) },
    );
  },
};

export const teamApi = {
  list() {
    return api<Team[]>('/teams');
  },
  create(input: {
    teamName: string;
    teamCode?: string;
    description?: string;
    status?: number;
  }) {
    return api<Team>('/teams', { method: 'POST', body: JSON.stringify(input) });
  },
  update(
    id: string,
    input: { teamName?: string; teamCode?: string; description?: string; status?: number },
  ) {
    return api<Team>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(id: string) {
    return api<{ id: string }>(`/teams/${id}`, { method: 'DELETE' });
  },
  members(teamId: string) {
    return api<{ teamId: string; members: TeamMember[] }>(`/teams/${teamId}/members`);
  },
  addMember(teamId: string, userId: string, memberRole?: string) {
    return api<TeamMember>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, memberRole }),
    });
  },
  updateMember(teamId: string, userId: string, memberRole: string) {
    return api<TeamMember>(`/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ memberRole }),
    });
  },
  removeMember(teamId: string, userId: string) {
    return api<{ teamId: string; userId: string }>(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
};
