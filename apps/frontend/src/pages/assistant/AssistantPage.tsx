import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Spin, message as antMessage } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, MessageCircle, Send, BookOpen, Sparkles,
  Bot, User, RotateCcw, ChevronRight,
} from 'lucide-react'
import { useKnowledgeSpaceStore } from '../../stores/knowledge-space.store'
import { streamChat, type ChatHistoryItem } from '../../api/assistant'
import type { KnowledgeSpace } from '../../types/knowledge.types'
import './assistant.css'

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function renderMarkdown(raw: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const segments = raw.split(/(```[\s\S]*?```)/g)
  segments.forEach((seg, si) => {
    if (seg.startsWith('```') && seg.endsWith('```')) {
      const firstNewline = seg.indexOf('\n')
      const lang = firstNewline !== -1 ? seg.slice(3, firstNewline).trim() : ''
      const code = firstNewline !== -1 ? seg.slice(firstNewline + 1, -3) : seg.slice(3, -3)
      nodes.push(
        <pre key={`code-${si}`} className="ast-code-block">
          {lang && <span className="ast-code-lang">{lang}</span>}
          <code>{code}</code>
        </pre>,
      )
      return
    }
    seg.split('\n').forEach((line, li) => {
      const key = `${si}-${li}`
      if (line.startsWith('### ')) nodes.push(<h3 key={key} className="ast-h3">{parseInline(line.slice(4))}</h3>)
      else if (line.startsWith('## ')) nodes.push(<h2 key={key} className="ast-h2">{parseInline(line.slice(3))}</h2>)
      else if (line.startsWith('# ')) nodes.push(<h2 key={key} className="ast-h2">{parseInline(line.slice(2))}</h2>)
      else if (line.startsWith('- ') || line.startsWith('* '))
        nodes.push(<ul key={key} className="ast-ul"><li>{parseInline(line.slice(2))}</li></ul>)
      else if (/^\d+\. /.test(line))
        nodes.push(<ol key={key} className="ast-ol"><li>{parseInline(line.replace(/^\d+\. /, ''))}</li></ol>)
      else if (line.startsWith('> '))
        nodes.push(<blockquote key={key} className="ast-quote">{parseInline(line.slice(2))}</blockquote>)
      else if (line.trim() === '' || line.trim() === '---') nodes.push(<br key={key} />)
      else nodes.push(<p key={key} className="ast-p">{parseInline(line)}</p>)
    })
  })
  return nodes
}

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="ast-inline-code">{part.slice(1, -1)}</code>
    return part
  })
}

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  streaming?: boolean
}

// ─── 消息气泡 ─────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: ChatMessage
}

const MessageBubble = memo(function MessageBubble({ msg }: MessageBubbleProps) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      className={`ast-msg-row ${isUser ? 'ast-msg-row--user' : 'ast-msg-row--assistant'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`ast-msg-avatar ${isUser ? 'ast-msg-avatar--user' : 'ast-msg-avatar--bot'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={`ast-msg-bubble ${isUser ? 'ast-msg-bubble--user' : 'ast-msg-bubble--bot'}`}>
        {isUser ? (
          <p className="ast-msg-text">{msg.content}</p>
        ) : (
          <>
            <div className="ast-msg-content">
              {msg.streaming && msg.content === '' ? (
                <span className="ast-thinking">
                  <span className="ast-thinking-dot" />
                  <span className="ast-thinking-dot" />
                  <span className="ast-thinking-dot" />
                </span>
              ) : (
                renderMarkdown(msg.content)
              )}
              {msg.streaming && msg.content !== '' && (
                <span className="ast-cursor" />
              )}
            </div>
            {!msg.streaming && msg.sources && msg.sources.length > 0 && (
              <div className="ast-msg-sources">
                <span className="ast-sources-label">
                  <BookOpen size={11} /> 参考来源
                </span>
                {msg.sources.map((s) => (
                  <span key={s} className="ast-source-tag">{s}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
})

// ─── 空间选择器 ────────────────────────────────────────────────────────────────

interface SpacePanelProps {
  spaces: KnowledgeSpace[]
  selectedId: number | null
  onSelect: (id: number) => void
  collapsed: boolean
  onToggle: () => void
}

const SpacePanel = memo(function SpacePanel({
  spaces, selectedId, onSelect, collapsed, onToggle,
}: SpacePanelProps) {
  return (
    <aside className={`ast-sidebar ${collapsed ? 'ast-sidebar--collapsed' : ''}`}>
      <div className="ast-sidebar-header">
        {!collapsed && <span className="ast-sidebar-title">选择知识库</span>}
        <button
          type="button"
          className="ast-sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? '展开' : '收起'}
        >
          <ChevronRight size={14} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .2s' }} />
        </button>
      </div>

      {!collapsed && (
        <div className="ast-space-list">
          {spaces.length === 0 ? (
            <div className="ast-space-empty">
              <BookOpen size={20} color="#d1d5db" />
              <span>暂无知识库</span>
            </div>
          ) : (
            spaces.map((sp) => (
              <button
                key={sp.id}
                type="button"
                className={`ast-space-item ${selectedId === sp.id ? 'is-active' : ''}`}
                onClick={() => onSelect(sp.id)}
              >
                <span
                  className="ast-space-dot"
                  style={{ background: sp.coverColor }}
                />
                <div className="ast-space-item-info">
                  <span className="ast-space-item-name">{sp.name}</span>
                  <span className="ast-space-item-count">{sp.articleCount} 篇文章</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  )
})

// ─── 欢迎屏 ───────────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  hasSpaces: boolean
  navigate: (path: string) => void
}

function WelcomeScreen({ hasSpaces, navigate }: WelcomeScreenProps) {
  return (
    <div className="ast-welcome">
      <motion.div
        className="ast-welcome-inner"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="ast-welcome-icon">
          <Sparkles size={32} color="#5b5bd6" />
        </div>
        <h2 className="ast-welcome-title">RAG 问答助手</h2>
        <p className="ast-welcome-desc">
          基于你的知识库内容智能作答，支持多轮对话。
          <br />
          从左侧选择一个知识库开始提问吧。
        </p>
        {!hasSpaces && (
          <Button type="primary" onClick={() => navigate('/knowledge')}>
            前往创建知识库
          </Button>
        )}
      </motion.div>
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const navigate = useNavigate()
  const { spaces, loading, fetchSpaces } = useKnowledgeSpaceStore()

  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchSpaces() }, [fetchSpaces])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId)

  const handleSelectSpace = useCallback((id: number) => {
    setSelectedSpaceId(id)
    setMessages([])
    setInput('')
  }, [])

  const handleClearChat = useCallback(() => {
    setMessages([])
  }, [])

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || !selectedSpaceId || isSending) return

    setInput('')
    setIsSending(true)

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
    }

    // 占位 AI 消息（流式）
    const aiMsgId = `ai-${Date.now()}`
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      streaming: true,
    }

    setMessages((prev) => [...prev, userMsg, aiMsg])

    // 构建历史（去掉当前 streaming 的消息）
    const history: ChatHistoryItem[] = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      await streamChat(selectedSpaceId, q, history, {
        onToken: (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: m.content + text } : m,
            ),
          )
        },
        onSources: (sources) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, sources } : m)),
          )
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, streaming: false } : m)),
          )
          setIsSending(false)
        },
        onError: (errMsg) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, content: `⚠️ 出错了：${errMsg}`, streaming: false }
                : m,
            ),
          )
          setIsSending(false)
          antMessage.error('问答请求失败')
        },
      })
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: `⚠️ 网络错误`, streaming: false }
            : m,
        ),
      )
      setIsSending(false)
    }
  }, [input, selectedSpaceId, isSending, messages])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // 自动高度
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  return (
    <div className="ast-root">
      {/* 顶部导航 */}
      <header className="ast-topbar">
        <button type="button" className="ast-topbar-back" onClick={() => navigate('/dashboard/library')}>
          <ChevronLeft size={15} />
          <span>返回</span>
        </button>
        <div className="ast-topbar-divider" />
        <div className="ast-topbar-icon">
          <MessageCircle size={15} color="#5b5bd6" />
        </div>
        <span className="ast-topbar-title">问答助手</span>
        {selectedSpace && (
          <>
            <span className="ast-topbar-sep">/</span>
            <span
              className="ast-topbar-space"
              style={{ '--dot-color': selectedSpace.coverColor } as React.CSSProperties}
            >
              {selectedSpace.name}
            </span>
          </>
        )}
        <div className="ast-topbar-actions">
          {messages.length > 0 && (
            <Button
              size="small"
              icon={<RotateCcw size={13} />}
              onClick={handleClearChat}
            >
              清空对话
            </Button>
          )}
        </div>
      </header>

      <div className="ast-body">
        {/* 左侧空间面板 */}
        {loading ? (
          <aside className="ast-sidebar">
            <div className="ast-sidebar-loading"><Spin size="small" /></div>
          </aside>
        ) : (
          <SpacePanel
            spaces={spaces}
            selectedId={selectedSpaceId}
            onSelect={handleSelectSpace}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        )}

        {/* 主聊天区域 */}
        <main className="ast-main">
          {selectedSpaceId === null ? (
            <WelcomeScreen hasSpaces={spaces.length > 0} navigate={navigate} />
          ) : (
            <>
              {/* 消息列表 */}
              <div className="ast-messages">
                {messages.length === 0 ? (
                  <div className="ast-chat-empty">
                    <Sparkles size={28} color="#c7d2fe" />
                    <p>
                      你正在使用 <strong>{selectedSpace?.name}</strong> 知识库
                      <br />
                      <span>直接输入问题，AI 将基于知识库内容为你解答</span>
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                  </AnimatePresence>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* 输入区域 */}
              <div className="ast-input-area">
                <div className={`ast-input-box ${isSending ? 'is-sending' : ''}`}>
                  <textarea
                    ref={textareaRef}
                    className="ast-textarea"
                    placeholder={`向「${selectedSpace?.name ?? '知识库'}」提问... (Enter 发送，Shift+Enter 换行)`}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    rows={1}
                  />
                  <button
                    type="button"
                    className={`ast-send-btn ${(!input.trim() || isSending) ? 'is-disabled' : ''}`}
                    onClick={handleSend}
                    disabled={!input.trim() || isSending}
                    title="发送 (Enter)"
                  >
                    {isSending ? <Spin size="small" /> : <Send size={16} />}
                  </button>
                </div>
                <p className="ast-input-hint">
                  AI 回答基于知识库内容生成，仅供参考
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
