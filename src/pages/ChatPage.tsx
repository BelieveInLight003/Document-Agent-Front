import { App, Button, Input, Tag } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { aiApi } from '../api';
import type { HybridHit } from '../types';
import { errorText } from '../utils';

type Turn = {
  id: number;
  question: string;
  items?: HybridHit[];
  pending?: boolean;
};

const CHANNEL: Record<string, string> = { keyword: '关键词', vector: '向量' };

export function ChatPage() {
  const { message } = App.useApp();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);

  async function send() {
    const text = question.trim();
    if (!text) return;
    const id = Date.now();
    setQuestion('');
    setSending(true);
    setTurns((current) => [...current, { id, question: text, pending: true }]);
    try {
      const result = await aiApi.retrieve(text, 5);
      setTurns((current) =>
        current.map((item) =>
          item.id === id ? { ...item, pending: false, items: result.items } : item,
        ),
      );
    } catch (error) {
      message.error(errorText(error));
      setTurns((current) => current.filter((item) => item.id !== id));
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
        <div className="chat-log">
          {turns.length === 0 ? (
            <div style={{ color: '#64748b' }}>例如：入职当天要做什么</div>
          ) : (
            turns.map((turn) => (
              <div key={turn.id} className="chat-turn">
                <div className="bubble user">{turn.question}</div>
                <div className="bubble assistant">
                  {turn.pending ? '正在检索资料…' : null}
                  {!turn.pending && turn.items && turn.items.length === 0 ? '没有检索到相关资料。' : null}
                  {!turn.pending && turn.items && turn.items.length > 0 ? (
                    <div className="hit-list">
                      <div className="hit-count">混合检索 {turn.items.length} 条</div>
                      {turn.items.map((item, index) => (
                        <article key={item.chunkId} className="hit">
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
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
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
  );
}
