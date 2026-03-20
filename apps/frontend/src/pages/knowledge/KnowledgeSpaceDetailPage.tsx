import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tag, Popconfirm, Spin, message } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, FileText, Plus, Pencil, Trash2, BookOpen,
  Paperclip, UploadCloud, RefreshCw, Loader2,
} from 'lucide-react'
import { useKnowledgeSpaceStore } from '../../stores/knowledge-space.store'
import {
  useKnowledgeArticleStore,
  FORMAT_CONFIG,
  formatFileSize,
} from '../../stores/knowledge-article.store'
import { ArticleFormModal } from './components/ArticleFormModal'
import { SpaceFormModal } from './components/SpaceFormModal'
import { DocumentUploader } from './components/DocumentUploader'
import type { KnowledgeArticle, KnowledgeSpace } from '../../types/knowledge.types'
import './knowledge.css'

// ─── Markdown 渲染器（轻量版） ────────────────────────────────────────────────

function renderMarkdown(raw: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
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
      if (line.startsWith('### ')) nodes.push(<h3 key={key}>{parseInline(line.slice(4))}</h3>)
      else if (line.startsWith('## ')) nodes.push(<h2 key={key}>{parseInline(line.slice(3))}</h2>)
      else if (line.startsWith('# ')) nodes.push(<h2 key={key}>{parseInline(line.slice(2))}</h2>)
      else if (line.startsWith('- ') || line.startsWith('* '))
        nodes.push(<ul key={key}><li>{parseInline(line.slice(2))}</li></ul>)
      else if (/^\d+\. /.test(line))
        nodes.push(<ol key={key}><li>{parseInline(line.replace(/^\d+\. /, ''))}</li></ol>)
      else if (line.startsWith('> '))
        nodes.push(<blockquote key={key}>{parseInline(line.slice(2))}</blockquote>)
      else if (line.trim() === '' || line.trim() === '---') nodes.push(<br key={key} />)
      else nodes.push(<p key={key}>{parseInline(line)}</p>)
    })
  })
  return nodes
}

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    return part
  })
}

// ─── ArticleListItem ──────────────────────────────────────────────────────────
// 统一展示手动编写和上传来源的文章，上传文章附带进度/状态指示器

interface ArticleItemProps {
  article: KnowledgeArticle
  isActive: boolean
  onClick: (article: KnowledgeArticle) => void
  onRetry: (article: KnowledgeArticle) => void
  onDelete: (article: KnowledgeArticle) => void
}

const ArticleListItem = memo(function ArticleListItem({
  article, isActive, onClick, onRetry, onDelete,
}: ArticleItemProps) {
  const isUploaded = article.source === 'upload'
  const status = article.uploadStatus
  const isProcessing = status === 'uploading' || status === 'parsing'
  const isFailed = status === 'failed'
  const isReady = !status || status === 'parsed'

  const handleClick = useCallback(() => {
    if (isReady) onClick(article)
  }, [isReady, onClick, article])

  const formatCfg = isUploaded && article.fileFormat ? FORMAT_CONFIG[article.fileFormat] : null

  return (
    <div
      className={[
        'kn-article-item',
        isActive && isReady ? 'is-active' : '',
        isProcessing ? 'is-processing' : '',
        isFailed ? 'is-failed' : '',
      ].join(' ').trim()}
      role={isReady ? 'button' : undefined}
      tabIndex={isReady ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      title={article.originalFileName ?? article.title}
    >
      <div className="kn-article-item-icon">
        {isUploaded
          ? <Paperclip size={12} style={{ flexShrink: 0 }} />
          : <FileText size={12} style={{ flexShrink: 0 }} />
        }
      </div>

      <div className="kn-article-item-body">
        <div className="kn-article-item-title-row">
          {formatCfg && (
            <span className="kn-article-item-fmt" style={{ color: formatCfg.color, background: formatCfg.bg }}>
              {formatCfg.label}
            </span>
          )}
          <span className="kn-article-item-title">
            {article.originalFileName ?? article.title}
          </span>
        </div>

        {/* 上传进度条 */}
        {status === 'uploading' && (
          <div className="kn-article-upload-row">
            <div className="kn-article-upload-bar">
              <div className="kn-article-upload-fill" style={{ width: `${article.uploadProgress ?? 0}%` }} />
            </div>
            <span className="kn-article-upload-pct">{article.uploadProgress ?? 0}%</span>
          </div>
        )}

        {/* 解析中 */}
        {status === 'parsing' && (
          <span className="kn-article-item-status parsing">
            <Loader2 size={10} className="kn-spin" /> 解析中...
          </span>
        )}

        {/* 解析完成（上传来源） */}
        {status === 'parsed' && article.fileSize && (
          <span className="kn-article-item-status parsed">
            {formatFileSize(article.fileSize)} · 已解析
          </span>
        )}

        {/* 解析失败 */}
        {isFailed && (
          <span className="kn-article-item-status failed">解析失败</span>
        )}
      </div>

      {/* 失败时的操作按钮 */}
      {isFailed && (
        <div className="kn-article-item-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="kn-icon-btn"
            title="重新解析"
            onClick={() => onRetry(article)}
          >
            <RefreshCw size={11} />
          </button>
          <Popconfirm
            title="确认删除此文章？"
            onConfirm={() => onDelete(article)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <button type="button" className="kn-icon-btn kn-icon-btn-danger" title="删除">
              <Trash2 size={11} />
            </button>
          </Popconfirm>
        </div>
      )}
    </div>
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
          <Button size="small" icon={<Pencil size={13} />} onClick={handleEdit}>编辑</Button>
          <Popconfirm
            title="确认删除该文章？"
            description="删除后无法恢复"
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<Trash2 size={13} />}>删除</Button>
          </Popconfirm>
        </div>
      </div>
      <div className="kn-article-view-meta">
        {article.source === 'upload' && article.fileFormat && (
          <Tag
            style={{
              color: FORMAT_CONFIG[article.fileFormat].color,
              background: FORMAT_CONFIG[article.fileFormat].bg,
              border: 'none',
              fontSize: 11,
            }}
          >
            {FORMAT_CONFIG[article.fileFormat].label} 文件导入
          </Tag>
        )}
        {article.tags.map((tag) => (
          <Tag key={tag} color="geekblue" style={{ fontSize: 11 }}>{tag}</Tag>
        ))}
        <span>更新于 {updatedDate}</span>
      </div>
      <div className="kn-article-content">
        <AnimatePresence mode="wait">{rendered}</AnimatePresence>
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
  const {
    articlesBySpace,
    loadingSpaceId,
    fetchBySpace,
    deleteArticle,
    deleteUploadedArticle,
    retryUpload,
  } = useKnowledgeArticleStore()

  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [spaceModalOpen, setSpaceModalOpen] = useState(false)
  const [docUploaderOpen, setDocUploaderOpen] = useState(false)
  const [retryFileMap] = useState<Map<number, File>>(new Map())

  useEffect(() => { if (spaces.length === 0) fetchSpaces() }, [spaces.length, fetchSpaces])
  useEffect(() => { if (spaceId) fetchBySpace(spaceId) }, [spaceId, fetchBySpace])

  const space: KnowledgeSpace | undefined = spaces.find((s) => s.id === spaceId)
  const articles = articlesBySpace[spaceId] ?? []
  const isLoading = loadingSpaceId === spaceId

  // 可读文章数（手动 + 已解析）
  const readyArticles = useMemo(
    () => articles.filter((a) => !a.uploadStatus || a.uploadStatus === 'parsed'),
    [articles],
  )

  // 上传中/解析中数量
  const processingCount = useMemo(
    () => articles.filter((a) => a.uploadStatus === 'uploading' || a.uploadStatus === 'parsing').length,
    [articles],
  )

  const handleDeleteArticle = useCallback(async (article: KnowledgeArticle) => {
    await deleteArticle(spaceId, article.id)
    message.success('文章已删除')
    setSelectedArticle((prev) => {
      if (prev?.id !== article.id) return prev
      return readyArticles.find((a) => a.id !== article.id) ?? null
    })
  }, [deleteArticle, spaceId, readyArticles])

  const handleDeleteUploadedArticle = useCallback(async (article: KnowledgeArticle) => {
    await deleteUploadedArticle(spaceId, article.id)
    message.success('已删除')
  }, [deleteUploadedArticle, spaceId])

  const handleRetryArticle = useCallback(async (article: KnowledgeArticle) => {
    const file = retryFileMap.get(article.id)
    if (!file) {
      message.warning('无法重试：原始文件已丢失，请重新上传')
      return
    }
    await retryUpload(spaceId, article.id, file)
    message.success('重新解析完成')
  }, [retryUpload, spaceId, retryFileMap])

  const handleArticleClick = useCallback((article: KnowledgeArticle) => {
    setSelectedArticle(article)
  }, [])

  const handleOpenCreateArticle = useCallback(() => {
    setEditingArticle(null)
    setArticleModalOpen(true)
  }, [])

  const handleOpenEditArticle = useCallback((article: KnowledgeArticle) => {
    setEditingArticle(article)
    setArticleModalOpen(true)
  }, [])

  const handleCloseArticleModal = useCallback(() => {
    setArticleModalOpen(false)
    setEditingArticle(null)
  }, [])

  const handleArticleCreated = useCallback((article: KnowledgeArticle) => {
    setSelectedArticle(article)
  }, [])

  return (
    <div className="kn-detail-root">
      {/* 顶部导航 */}
      <header className="kn-topbar">
        <button type="button" className="kn-topbar-back" onClick={() => navigate('/knowledge')}>
          <ChevronLeft size={15} />
          <span>知识库</span>
        </button>
        <div className="kn-topbar-divider" />
        {space && (
          <span
            style={{
              display: 'inline-block', width: 8, height: 8,
              borderRadius: '50%', background: space.coverColor, flexShrink: 0,
            }}
          />
        )}
        <span className="kn-topbar-title">{space?.name ?? '加载中...'}</span>
        <div className="kn-topbar-actions">
          {space && (
            <Button size="small" icon={<Pencil size={13} />} onClick={() => setSpaceModalOpen(true)}>
              编辑知识库
            </Button>
          )}
        </div>
      </header>

      <div className="kn-detail-body">
        {/* ─── 左侧目录 ─────────────────────────────────────────── */}
        <aside className="kn-detail-left">
          <div className="kn-detail-left-header">
            <div className="kn-detail-space-name">
              {space && (
                <span className="kn-detail-space-dot" style={{ background: space.coverColor }} />
              )}
              {space?.name ?? '—'}
            </div>
            <div className="kn-detail-article-count">
              {readyArticles.length} 篇
              {processingCount > 0 && (
                <span className="kn-processing-badge">
                  <Loader2 size={10} className="kn-spin" />
                  {processingCount}
                </span>
              )}
            </div>
          </div>

          <div className="kn-article-list">
            {isLoading ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <Spin size="small" />
              </div>
            ) : articles.length === 0 ? (
              <div className="kn-article-list-empty">
                <BookOpen size={24} color="#d1d5db" />
                <span>还没有文章</span>
              </div>
            ) : (
              articles.map((a) => (
                <ArticleListItem
                  key={a.id}
                  article={a}
                  isActive={selectedArticle?.id === a.id}
                  onClick={handleArticleClick}
                  onRetry={handleRetryArticle}
                  onDelete={handleDeleteUploadedArticle}
                />
              ))
            )}
          </div>

          {/* 底部操作 */}
          <div className="kn-left-actions">
            <Button
              block
              size="small"
              icon={<Plus size={13} />}
              onClick={handleOpenCreateArticle}
            >
              新建文章
            </Button>
            <Button
              block
              size="small"
              icon={<UploadCloud size={13} />}
              onClick={() => setDocUploaderOpen(true)}
            >
              上传文档
            </Button>
          </div>
        </aside>

        {/* ─── 右侧内容 ─────────────────────────────────────────── */}
        <main className="kn-detail-main">
          {isLoading && (
            <div className="kn-detail-loading">
              <Spin size="large" />
              <span>加载中...</span>
            </div>
          )}
          {!isLoading && selectedArticle === null && (
            <div className="kn-article-empty">
              <BookOpen size={48} color="#e5e7eb" />
              <p>
                {articles.length === 0
                  ? '还没有文章，点击左侧「新建文章」或「上传文档」'
                  : '从左侧选择一篇文章开始阅读'}
              </p>
              {articles.length === 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button type="primary" icon={<Plus size={14} />} onClick={handleOpenCreateArticle}>
                    新建文章
                  </Button>
                  <Button icon={<UploadCloud size={14} />} onClick={() => setDocUploaderOpen(true)}>
                    上传文档
                  </Button>
                </div>
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

      {/* 弹窗 */}
      <ArticleFormModal
        open={articleModalOpen}
        spaceId={spaceId}
        article={editingArticle}
        onClose={handleCloseArticleModal}
        onCreated={handleArticleCreated}
      />
      {space && (
        <SpaceFormModal open={spaceModalOpen} space={space} onClose={() => setSpaceModalOpen(false)} />
      )}
      <DocumentUploader
        open={docUploaderOpen}
        spaceId={spaceId}
        onClose={() => setDocUploaderOpen(false)}
      />
    </div>
  )
}
