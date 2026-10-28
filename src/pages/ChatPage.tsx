import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Input, Popconfirm, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aiApi } from '../api';
import type { ChatMessage, ChatSession, HybridHit } from '../types';
import { errorText } from '../utils';

const CHANNEL: Record<string, string> = { keyword: '关键词', vector: '向量' };

export function ChatPage() {
  const { message } = App.useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    void aiApi
      .sessions()
      .then((result) => setSessions(result.list))
      .catch((error: unknown) => message.error(errorText(error)));
  }, []);

  async function openSession(id: string) {
    if (sending || id === activeId) return;
    setActiveId(id);
    setLoadingMessages(true);
    try {
      const result = await aiApi.session(id);
      setMessages(result.messages);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoadingMessages(false);
    }
  }

  async function createSession() {
    if (sending) return;
    try {
      const session = await aiApi.createSession();
      setSessions((current) => [session, ...current]);
      setActiveId(session.id);
      setMessages([]);
      setQuestion('');
    } catch (error) {
      message.error(errorText(error));
    }
  }

  async function removeSession(id: string) {
    try {
      await aiApi.removeSession(id);
      setSessions((current) => current.filter((item) => item.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (error) {
      message.error(errorText(error));
    }
  }

  async function send() {
    const text = question.trim();
    if (!text || sending) return;
    setQuestion('');
    setSending(true);
    const pendingId = `pending-${Date.now()}`;
    try {
      let sessionId = activeId;
      if (!sessionId) {
        const session = await aiApi.createSession();
        sessionId = session.id;
        setActiveId(session.id);
        setSessions((current) => [session, ...current]);
      }
      const resolvedId = sessionId;
      setMessages((current) => [
        ...current,
        {
          id: pendingId,
          sessionId: resolvedId,
          role: 'user',
          content: text,
          items: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      const result = await aiApi.ask(resolvedId, text);
      setMessages((current) => [
        ...current.filter((item) => item.id !== pendingId),
        ...result.messages,
      ]);
      setSessions((current) =>
        [result.session, ...current.filter((item) => item.id !== result.session.id)],
      );
    } catch (error) {
      message.error(errorText(error));
      setMessages((current) => current.filter((item) => item.id !== pendingId));
      setQuestion(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>AI 问答</h1>
          <p>问题会走混合检索：关键词和向量各查一路，融合后返回最相关的资料。</p>
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
          <div className="chat-log">
            {loadingMessages ? (
              <div style={{ color: '#64748b' }}>正在读取消息…</div>
            ) : messages.length === 0 && !sending ? (
              <div style={{ color: '#64748b' }}>例如：入职当天要做什么</div>
            ) : (
              messages.map((item) => <MessageBubble key={item.id} message={item} />)
            )}
            {sending ? <div className="bubble assistant">正在检索资料…</div> : null}
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
            <Button type="primary" loading={sending} onClick={() => void send()}>
              提问
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return <div className="bubble user">{message.content}</div>;
  }
  const items = message.items ?? [];
  return (
    <div className="bubble assistant">
      {items.length === 0 ? (
        message.content
      ) : (
        <div className="hit-list">
          <div className="hit-count">{message.content}</div>
          {items.map((item, index) => (
            <Hit key={item.chunkId} item={item} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function Hit({ item, index }: { item: HybridHit; index: number }) {
  return (
    <article className="hit">
      <div className="hit-head">
        <span className="hit-index">{index + 1}</span>
        <Link to={`/documents/${item.documentId}`}>{item.title}</Link>
        {item.chapter && item.chapter !== item.title ? (
          <span className="hit-chapter">{item.chapter}</span>
        ) : null}
        {item.channels.map((channel) => (
          <Tag key={channel} color={channel === 'vector' ? 'green' : 'blue'}>
            {CHANNEL[channel] ?? channel}
          </Tag>
        ))}
        <Tag>相关度 {item.score.toFixed(4)}</Tag>
      </div>
      <p>{item.content}</p>
    </article>
  );
}
