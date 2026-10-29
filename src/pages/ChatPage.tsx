import { CheckCircleOutlined, DeleteOutlined, DownOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useChat } from '@ai-sdk/react';
import { App, Button, Input, Popconfirm } from 'antd';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { aiApi, authorizedFetch } from '../api';
import type { ChatMessage, ChatStep, HybridHit } from '../types';
import { errorText } from '../utils';

type ChatUIMessage = UIMessage<unknown, { step: ChatStep }>;

const LEGACY_SUMMARY = /^混合检索 \d+ 条$/;

export function ChatPage() {
  const { message } = App.useApp();
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState('draft');
  const [seed, setSeed] = useState<ChatUIMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  sessionRef.current = activeId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: '/api/ai/sessions/pending/stream',
        fetch: authorizedFetch,
        prepareSendMessagesRequest: async ({ messages }) => {
          let id = sessionRef.current;
          if (!id) {
            const session = await aiApi.createSession();
            id = session.id;
            sessionRef.current = id;
            setActiveId(id);
            setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
          }
          const last = [...messages].reverse().find((item) => item.role === 'user');
          const text = textOf(last);
          return {
            api: `/api/ai/sessions/${id}/stream`,
            body: { question: text, limit: 5 },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>({
    id: chatKey,
    messages: seed,
    transport,
    onError: (err) => message.error(chatErrorText(err)),
    onFinish: ({ isAbort, isError }) => {
      if (isAbort || isError) return;
      void aiApi
        .sessions()
        .then((result) => setSessions(result.list))
        .catch(() => undefined);
    },
  });

  useEffect(() => {
    void aiApi
      .sessions()
      .then((result) => setSessions(result.list))
      .catch((err: unknown) => message.error(errorText(err)));
  }, []);

  useEffect(() => {
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, status, loadingMessages]);

  const busy = status === 'submitted' || status === 'streaming';

  async function openSession(id: string) {
    if (id === activeId) return;
    stop();
    setLoadingMessages(true);
    try {
      const result = await aiApi.session(id);
      setSeed(toUiMessages(result.messages));
      setChatKey(id);
      setActiveId(id);
    } catch (err) {
      message.error(errorText(err));
    } finally {
      setLoadingMessages(false);
    }
  }

  async function createSession() {
    if (busy) stop();
    try {
      const session = await aiApi.createSession();
      setSessions((current) => [session, ...current]);
      setSeed([]);
      setChatKey(session.id);
      setActiveId(session.id);
      setQuestion('');
    } catch (err) {
      message.error(errorText(err));
    }
  }

  async function removeSession(id: string) {
    try {
      await aiApi.removeSession(id);
      setSessions((current) => current.filter((item) => item.id !== id));
      if (activeId === id) {
        setActiveId(null);
        sessionRef.current = null;
        setSeed([]);
        setChatKey(`draft-${Date.now()}`);
      }
    } catch (err) {
      message.error(errorText(err));
    }
  }

  async function send() {
    const text = question.trim();
    if (!text || busy) return;
    if (text.length > 500) {
      message.error('问题不能超过 500 字');
      return;
    }
    setQuestion('');
    await sendMessage({ text });
  }

  const waiting = busy && messages.at(-1)?.role !== 'assistant';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>AI 问答</h1>
          <p>先展示检索步骤和参考资料，再根据知识库内容流式回答。</p>
        </div>
      </div>
      <div className="chat-shell">
        <aside className="chat-history">
          <div className="chat-history-head">
            <Button block icon={<PlusOutlined />} onClick={() => void createSession()}>
              新会话
            </Button>
          </div>
          <div className="chat-history-list">
            {sessions.length === 0 ? (
              <div style={{ color: '#94a3b8', padding: '8px 10px' }}>还没有会话</div>
            ) : (
              sessions.map((item) => (
                <div
                  key={item.id}
                  className={item.id === activeId ? 'chat-session active' : 'chat-session'}
                  onClick={() => void openSession(item.id)}
                >
                  <span className="chat-session-title">{item.title}</span>
                  <Popconfirm
                    title="删除这个会话？"
                    description="会话里的消息会一起删除。"
                    onConfirm={() => void removeSession(item.id)}
                  >
                    <button
                      type="button"
                      className="chat-session-delete"
                      aria-label="删除会话"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                </div>
              ))
            )}
          </div>
        </aside>
        <div className="chat-main">
          <div className="chat-log" ref={logRef}>
            {loadingMessages ? (
              <div className="think-note">正在读取消息…</div>
            ) : messages.length === 0 && !waiting ? (
              <div className="think-note">例如：入职当天要做什么</div>
            ) : (
              messages.map((item, index) =>
                item.role === 'user' ? (
                  <div key={item.id} className="bubble user">
                    {textOf(item)}
                  </div>
                ) : (
                  <AssistantTurn
                    key={item.id}
                    message={item}
                    live={busy && index === messages.length - 1}
                  />
                ),
              )
            )}
            {!loadingMessages && waiting ? <div className="think-note">正在整理问题…</div> : null}
            {error ? <div className="think-note">{chatErrorText(error)}</div> : null}
          </div>
          <div className="chat-bar">
            <Input.TextArea
              value={question}
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder="输入问题，检索已发布资料"
              onChange={(event) => setQuestion(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            {busy ? (
              <Button onClick={() => stop()}>停止</Button>
            ) : (
              <Button type="primary" onClick={() => void send()}>
                提问
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantTurn({ message, live }: { message: ChatUIMessage; live: boolean }) {
  const steps = message.parts.flatMap((part) => (part.type === 'data-step' ? [part.data] : []));
  const text = textOf(message);
  return (
    <div className="answer-turn">
      {steps.length > 0 ? <Thinking steps={steps} /> : null}
      {text ? (
        live ? (
          <div className="answer-body streaming">
            {text}
            <span className="answer-caret" />
          </div>
        ) : (
          <AnswerBody text={text} />
        )
      ) : live ? (
        <div className="answer-body streaming">
          <span className="answer-caret" />
        </div>
      ) : null}
    </div>
  );
}

function Thinking({ steps }: { steps: ChatStep[] }) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  return (
    <div className="think">
      {steps.map((step) => {
        if (step.kind === 'action') {
          return (
            <div key={step.id} className="think-action">
              {step.title}
              {step.status === 'running' ? (
                <span className="think-running">
                  <LoadingOutlined /> 检索中
                </span>
              ) : null}
            </div>
          );
        }
        if (step.kind === 'plan') {
          return (
            <p key={step.id} className="think-plan">
              {step.detail ?? step.title}
            </p>
          );
        }
        if (step.kind === 'done') {
          return (
            <div key={step.id} className="think-done">
              <CheckCircleOutlined />
              {step.title}
            </div>
          );
        }
        const open = opened[step.id] ?? step.kind === 'sources';
        return (
          <div key={step.id}>
            <button
              type="button"
              className="think-fold"
              onClick={() => setOpened((current) => ({ ...current, [step.id]: !open }))}
            >
              {step.title}
              <DownOutlined className={open ? 'think-chevron open' : 'think-chevron'} />
            </button>
            {open && step.kind === 'fold' && step.detail ? <p className="think-detail">{step.detail}</p> : null}
            {open && step.kind === 'sources' && (step.sources?.length ?? 0) > 0 ? (
              <ol className="think-sources">
                {step.sources?.map((source) => (
                  <li key={source.documentId}>
                    <Link to={`/documents/${source.documentId}`}>{source.title}</Link>
                    {source.chapter && source.chapter !== source.title ? (
                      <span className="think-chapter">{source.chapter}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
            {open && step.kind === 'sources' && !step.sources?.length && step.detail ? (
              <p className="think-detail">{step.detail}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AnswerBody({ text }: { text: string }) {
  return <div className="answer-body">{renderMarkdown(text)}</div>;
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.trim().startsWith('|')) {
      const table: string[] = [];
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
        table.push(lines[index] ?? '');
        index += 1;
      }
      blocks.push(<MarkdownTable key={blocks.length} lines={table} />);
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const Tag = heading[1].length === 1 ? 'h2' : 'h3';
      blocks.push(<Tag key={blocks.length}>{inline(heading[2])}</Tag>);
      index += 1;
      continue;
    }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const ordered = /^\d+\.\s/.test(line);
      const items: string[] = [];
      while (index < lines.length && (ordered ? /^\d+\.\s/.test(lines[index] ?? '') : /^[-*]\s/.test(lines[index] ?? ''))) {
        items.push((lines[index] ?? '').replace(/^([-*]|\d+\.)\s+/, ''));
        index += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={blocks.length}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </List>,
      );
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      (lines[index] ?? '').trim() &&
      !(lines[index] ?? '').trim().startsWith('|') &&
      !/^#{1,3}\s/.test(lines[index] ?? '') &&
      !/^[-*]\s/.test(lines[index] ?? '') &&
      !/^\d+\.\s/.test(lines[index] ?? '')
    ) {
      paragraph.push(lines[index] ?? '');
      index += 1;
    }
    blocks.push(<p key={blocks.length}>{inline(paragraph.join('\n'))}</p>);
  }
  return blocks;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length > 0 && !cells.every((cell) => /^:?-+:?$/.test(cell)));
  if (rows.length === 0) return null;
  const [head, ...body] = rows;
  return (
    <table>
      <thead>
        <tr>
          {head.map((cell, index) => (
            <th key={index}>{inline(cell)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{inline(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}

function textOf(message: { parts: ChatUIMessage['parts'] } | undefined) {
  if (!message) return '';
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function toUiMessages(rows: ChatMessage[]): ChatUIMessage[] {
  return rows.map((row) => {
    if (row.role === 'user') {
      return { id: row.id, role: 'user', parts: [{ type: 'text', text: row.content }] };
    }
    const steps = row.steps?.length ? row.steps : legacySteps(row);
    const text = steps.length > 0 && LEGACY_SUMMARY.test(row.content) ? '' : row.content;
    const parts: ChatUIMessage['parts'] = steps.map((step) => ({
      type: 'data-step',
      id: step.id,
      data: step,
    }));
    if (text) parts.push({ type: 'text', text });
    return { id: row.id, role: 'assistant', parts };
  });
}

function legacySteps(row: ChatMessage): ChatStep[] {
  const items = row.items ?? [];
  if (items.length === 0) return [];
  return [
    {
      id: 'sources',
      kind: 'sources',
      title: `参考 ${items.length} 条资料`,
      status: 'done',
      sources: dedupeSources(items),
    },
  ];
}

function dedupeSources(items: HybridHit[]) {
  const seen = new Set<string>();
  const sources: NonNullable<ChatStep['sources']> = [];
  for (const item of items) {
    if (seen.has(item.documentId)) continue;
    seen.add(item.documentId);
    sources.push({ documentId: item.documentId, title: item.title, chapter: item.chapter });
  }
  return sources;
}

function chatErrorText(error: Error) {
  if (/failed to fetch|network|load failed/i.test(error.message)) return '回答失败，请稍后再试。';
  return error.message || '回答失败';
}
