export type Permission = {
  id: string;
  parentId: string;
  permissionName: string;
  permissionCode: string;
  permissionType: number;
  menuUrl: string | null;
  apiUrl: string | null;
  method: string | null;
  icon: string | null;
  sort: number;
  status: number;
};

export type SessionUser = {
  id: string;
  username: string;
  email: string | null;
  realName: string | null;
  avatar: string | null;
  status: number;
  emailVerified: boolean;
  lastLoginAt: string | null;
  roles: string[];
  permissionList: Permission[];
};

export type Account = Omit<SessionUser, 'permissionList'>;

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: Pick<Account, 'id' | 'username' | 'email' | 'realName' | 'roles'>;
};

export type RoleItem = {
  id: string;
  roleName: string;
  roleCode: string;
  description: string | null;
  status: number;
};

export type DocumentRecord = {
  id: string;
  title: string;
  contentId: string;
  summary: string | null;
  categoryId: string | null;
  teamId: string | null;
  authorId: string | null;
  coverImage: string | null;
  tags: string | null;
  status: number;
  remark: string | null;
  viewCount: number;
  wordCount: number;
  publishTime: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentContent = {
  contentId: string;
  content: string;
  length: number;
  contentSummary: string;
  deleted: boolean;
};

export type DocumentBundle = {
  document: DocumentRecord;
  content: DocumentContent | null;
};

export type ReviewRecord = {
  id: string;
  documentId: string;
  reviewerId: string | null;
  submitterId: string | null;
  statusBefore: number | null;
  statusAfter: number | null;
  reviewStatus: number;
  opinion: string | null;
  createdAt: string;
  approvedAt: string | null;
  updatedAt: string;
  title?: string | null;
};

export type Page<T> = {
  total: number;
  page: number;
  pageSize: number;
  list: T[];
};

export type SearchHit = {
  score: number | null;
  highlights: string[];
  document: {
    id: string;
    title: string;
    contentId: string;
    summary: string | null;
    status: number;
    tags: string | null;
    publishTime: string | null;
  };
};

export type HybridHit = {
  chunkId: string;
  documentId: string;
  contentId: string;
  title: string;
  chapter: string | null;
  content: string;
  score: number;
  channels: Array<'keyword' | 'vector' | 'graph' | 'web'>;
  url?: string;
};

export type ChatResult = {
  question: string;
  answer: string;
  items: HybridHit[];
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatStep = {
  id: string;
  kind: 'fold' | 'action' | 'sources' | 'plan' | 'done';
  title: string;
  detail?: string;
  status: 'running' | 'done';
  sources?: Array<{ documentId: string; title: string; chapter: string | null; index?: number; url?: string }>;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  items: HybridHit[] | null;
  steps: ChatStep[] | null;
  createdAt: string;
};

export type GraphNode = {
  id: string;
  label: string;
  name: string;
  entityType: string | null;
  documentId: string | null;
  contentId: string | null;
  chunkId: string | null;
  title: string | null;
  index: number | null;
  contentPreview: string | null;
  document: {
    id: string;
    title: string;
    contentId: string;
    summary: string | null;
    status: number;
  } | null;
};

export type GraphRelation = {
  id: string;
  type: string;
  name: string;
  source: string;
  target: string;
  documentId: string | null;
  chunkId: string | null;
};

export type GraphView = {
  nodes: GraphNode[];
  relations: GraphRelation[];
};

export type Team = {
  id: string;
  teamName: string;
  teamCode: string | null;
  description: string | null;
  leaderId: string | null;
  leader: { id: string; username: string; realName: string | null } | null;
  parentId: string;
  sort: number;
  status: number;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  username: string | null;
  realName: string | null;
  memberRole: string;
  createdAt: string;
};
