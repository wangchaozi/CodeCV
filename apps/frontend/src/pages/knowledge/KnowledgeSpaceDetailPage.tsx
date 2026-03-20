import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tag, Popconfirm, Spin, message } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, FileText, Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { useKnowledgeSpaceStore } from '../../stores/knowledge-space.store'
import { useKnowledgeArticleStore } from '../../stores/knowledge-article.store'
import { ArticleFormModal } from './components/ArticleFormModal'
import { SpaceFormModal } from './components/SpaceFormModal'
import type { KnowledgeArticle, KnowledgeSpace } from '../../types/knowledge.types'
import './knowledge.css'

// ─── Markdown 渲染器（轻量版，仅处理常见语法）────────────────────────────────

function renderMarkdown(raw: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // 按代码块分割
  const segments = raw.split(/(```[\s\S]*?```)/g)

  segments.forEach((seg, si) => {
    if (seg.startsWith('```') && seg.endsWith('```')) {
      const firstNewline = seg.indexOf('\n')
      const code = firstNewline !== -1 ? seg.slice(firstNewline + 1, -3) : seg.slice(3, -3)
      nodes.push(<pre key={`code-${si}`}><code>{code}</code></pre>)
      return
    }

    seg.split('\n').forEach((line, li) => {
      const key = `${si}-${li}`
      if (line.startsWith('### ')) {
        nodes.push(<h3 key={key}>{parseInline(line.slice(4))}</h3>)
      } else if (line.startsWith('## ')) {
        nodes.push(<h2 key={key}>{parseInline(line.slice(3))}</h2>)
      } else if (line.startsWith('# ')) {
        nodes.push(<h2 key={key}>{parseInline(line.slice(2))}</h2>)
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        nodes.push(<ul key={key}><li>{parseInline(line.slice(2))}</li></ul>)
      } else if (/^\d+\. /.test(line)) {
        const text = line.replace(/^\d+\. /, '')
        nodes.push(<ol key={key}><li>{parseInline(text)}</li></ol>)
      } else if (line.startsWith('> ')) {
        nodes.push(<blockquote key={key}>{parseInline(line.slice(2))}</blockquote>)
      } else if (line.startsWith('|') && line.endsWith('|')) {
        // 简单表格行——整行作为文本显示
        nodes.push(<p key={key}>{line}</p>)
      } else if (line.trim() === '' || line.trim() === '---') {
        nodes.push(<br key={key} />)
      } else {
        nodes.push(<p key={key}>{parseInline(line)}</p>)
      }
    })
  })
  return nodes
}

/** 处理行内语法：**bold**、`code`、`[text](url)` */
function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

// ─── ArticleListItem ──────────────────────────────────────────────────────────

interface ArticleItemProps {
  article: KnowledgeArticle
  isActive: boolean
  onClick: (article: KnowledgeArticle) => void
}

const ArticleListItem = memo(function ArticleListItem({
  article,
  isActive,
  onClick,
}: ArticleItemProps) {
  const handleClick = useCallback(() => onClick(article), [onClick, article])
  return (
    <button
      type="button"
      className={`kn-article-item${isActive ? ' is-active' : ''}`}
      onClick={handleClick}
      title={article.title}
    >
      <FileText size={13} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {article.title}
      </span>
    </button>
  )
})

// ─── ArticleView ──────────────────────────────────────────────────────────────

interface ArticleViewProps {
  article: KnowledgeArticle
  onEdit: (article: KnowledgeArticle) => void
  onDelete: (article: KnowledgeArticle) => void
}

const ArticleView = memo(function ArticleView({ article, onEdit, onDelete }: ArticleViewProps) {
  const handleEdit = useCallback(() => onEdit(article), [onEdit, article])
  const handleDelete = useCallback(() => onDelete(article), [onDelete, article])

  const updatedDate = new Date(article.updatedAt).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })

  const rendered = useMemo(() => renderMarkdown(article.content), [article.content])

  return (
    <motion.div
      className="kn-article-view"
      key={article.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="kn-article-view-header">
        <h1 className="kn-article-view-title">{article.title}</h1>
        <div className="kn-article-view-actions">
          <Button
            size="small"
            icon={<Pencil size={13} />}
            onClick={handleEdit}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该文章？"
            description="删除后无法恢复"
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<Trash2 size={13} />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div className="kn-article-view-meta">
        {article.tags.map((tag) => (
          <Tag key={tag} color="geekblue" style={{ fontSize: 11 }}>{tag}</Tag>
        ))}
        <span>更新于 {updatedDate}</span>
      </div>

      <div className="kn-article-content">
        <AnimatePresence mode="wait">
          {rendered}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgeSpaceDetailPage() {
  const { spaceId: spaceIdParam } = useParams<{ spaceId: string }>()
  const navigate = useNavigate()

  const spaceId = Number(spaceIdParam)

  const { spaces, fetchSpaces } = useKnowledgeSpaceStore()
  const { articlesBySpace, loadingSpaceId, fetchBySpace, deleteArticle } = useKnowledgeArticleStore()

  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [spaceModalOpen, setSpaceModalOpen] = useState(false)

  // 先确保 spaces 已加载（从空间列表直接深度链接时）
  useEffect(() => {
    if (spaces.length === 0) fetchSpaces()
  }, [spaces.length, fetchSpaces])

  useEffect(() => {
    if (spaceId) fetchBySpace(spaceId)
  }, [spaceId, fetchBySpace])

  const space: KnowledgeSpace | undefined = spaces.find((s) => s.id === spaceId)
  const articles = articlesBySpace[spaceId] ?? []
  const isLoading = loadingSpaceId === spaceId

  // 文章删除后自动选中前一篇
  const handleDeleteArticle = useCallback(
    async (article: KnowledgeArticle) => {
      await deleteArticle(spaceId, article.id)
      message.success('文章已删除')
      setSelectedArticle((prev) => {
        if (prev?.id !== article.id) return prev
        const remaining = (articlesBySpace[spaceId] ?? []).filter((a) => a.id !== article.id)
        return remaining.length > 0 ? remaining[0] : null
      })
    },
    [deleteArticle, spaceId, articlesBySpace],
  )

  const handleOpenCreateArticle = useCallback(() => {
    setEditingArticle(null)
    setArticleModalOpen(true)
  }, [])

  const handleOpenEditArticle = useCallback((article: KnowledgeArticle) => {
    setEditingArticle(article)
    setArticleModalOpen(true)
  }, [])

  const handleArticleCreated = useCallback((article: KnowledgeArticle) => {
    setSelectedArticle(article)
  }, [])

  const handleCloseArticleModal = useCallback(() => {
    setArticleModalOpen(false)
    setEditingArticle(null)
  }, [])

  return (
    <div className="kn-detail-root">
      {/* 顶部导航 */}
      <header className="kn-topbar">
        <button
          type="button"
          className="kn-topbar-back"
          onClick={() => navigate('/knowledge')}
        >
          <ChevronLeft size={15} />
          <span>知识库</span>
        </button>
        <div className="kn-topbar-divider" />
        {space && (
          <span
            className="kn-detail-space-dot"
            style={{ background: space.coverColor, width: 8, height: 8, display: 'inline-block', borderRadius: '50%', flexShrink: 0 }}
          />
        )}
        <span className="kn-topbar-title">{space?.name ?? '加载中...'}</span>
        <div className="kn-topbar-actions">
          {space && (
            <Button
              size="small"
              icon={<Pencil size={13} />}
              onClick={() => setSpaceModalOpen(true)}
            >
              编辑知识库
            </Button>
          )}
        </div>
      </header>

      <div className="kn-detail-body">
        {/* 左侧目录 */}
        <aside className="kn-detail-left">
          <div className="kn-detail-left-header">
            <div className="kn-detail-space-name">
              {space && (
                <span
                  className="kn-detail-space-dot"
                  style={{ background: space.coverColor }}
                />
              )}
              {space?.name ?? '—'}
            </div>
            <div className="kn-detail-article-count">{articles.length} 篇文章</div>
          </div>

          <div className="kn-article-list">
            {isLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Spin size="small" />
              </div>
            ) : (
              articles.map((a) => (
                <ArticleListItem
                  key={a.id}
                  article={a}
                  isActive={selectedArticle?.id === a.id}
                  onClick={setSelectedArticle}
                />
              ))
            )}
          </div>

          <div className="kn-new-article-btn">
            <Button
              type="dashed"
              block
              size="small"
              icon={<Plus size={13} />}
              onClick={handleOpenCreateArticle}
            >
              新建文章
            </Button>
          </div>
        </aside>

        {/* 右侧内容 */}
        <main className="kn-detail-main">
          {isLoading && (
            <div className="kn-detail-loading">
              <Spin size="large" />
              <span>加载文章中...</span>
            </div>
          )}

          {!isLoading && selectedArticle === null && (
            <div className="kn-article-empty">
              <BookOpen size={48} color="#e5e7eb" />
              <p>
                {articles.length === 0
                  ? '这个知识库还没有文章，点击左侧「新建文章」开始写作'
                  : '从左侧选择一篇文章开始阅读'}
              </p>
              {articles.length === 0 && (
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={handleOpenCreateArticle}
                  style={{ marginTop: 4 }}
                >
                  新建第一篇文章
                </Button>
              )}
            </div>
          )}

          {!isLoading && selectedArticle !== null && (
            <ArticleView
              article={selectedArticle}
              onEdit={handleOpenEditArticle}
              onDelete={handleDeleteArticle}
            />
          )}
        </main>
      </div>

      <ArticleFormModal
        open={articleModalOpen}
        spaceId={spaceId}
        article={editingArticle}
        onClose={handleCloseArticleModal}
        onCreated={handleArticleCreated}
      />

      {space && (
        <SpaceFormModal
          open={spaceModalOpen}
          space={space}
          onClose={() => setSpaceModalOpen(false)}
        />
      )}
    </div>
  )
}
