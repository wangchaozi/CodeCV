import { lazy, Suspense, memo, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, Pagination, Spin, Popconfirm, Empty, message } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpenDot, FileText, BarChart2, Loader2, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { resumeApi, type ResumeRecord, type ResumeStatus } from '../../api/resume'

const ResumePreviewDrawer = lazy(() =>
  import('./ResumePreviewDrawer').then((m) => ({ default: m.ResumePreviewDrawer })),
)

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const STATUS_MAP: Record<ResumeStatus, { label: string; type: 'done' | 'pending' | 'parsing' | 'error' }> = {
  done:    { label: '已完成',   type: 'done' },
  parsing: { label: 'AI 解析中', type: 'parsing' },
  pending: { label: '排队中',   type: 'pending' },
  error:   { label: '解析失败', type: 'error' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

// ─── 行组件 ───────────────────────────────────────────────────────────────────

interface ResumeRowProps {
  resume: ResumeRecord
  onView: (r: ResumeRecord) => void
  onAnalyse: (r: ResumeRecord) => void
  onDelete: (r: ResumeRecord) => Promise<void>
}

const ResumeRow = memo(function ResumeRow({ resume, onView, onAnalyse, onDelete }: ResumeRowProps) {
  const { label, type } = STATUS_MAP[resume.status]
  const isParsing = resume.status === 'parsing' || resume.status === 'pending'
  const isDone = resume.status === 'done'

  return (
    <div className="dashboard-row">
      <div className="col-name">
        <FileText size={16} className="row-icon" />
        <span className="row-name" title={resume.originalName}>
          {resume.originalName}
        </span>
      </div>

      <div className="col-date">{formatDate(resume.createTime)}</div>

      <div className="col-score">
        {isParsing ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af', fontSize: 12 }}>
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            解析中
          </span>
        ) : resume.score != null ? (
          <>
            <div className="score-bar">
              <div
                className={`score-bar-inner score-${Math.round(resume.score / 10)}`}
                style={{ width: `${resume.score}%` }}
              />
            </div>
            <span className="score-text">{resume.score}</span>
          </>
        ) : (
          <span style={{ color: '#dc2626', fontSize: 12 }}>解析失败</span>
        )}
      </div>

      <div className="col-status">
        <span className={`status-pill status-${type}`}>{label}</span>
      </div>

      <div className="col-actions">
        <Button type="link" size="small" onClick={() => onView(resume)} disabled={!isDone}>
          预览
        </Button>
        <Button
          type="link"
          size="small"
          icon={<BarChart2 size={12} />}
          onClick={() => onAnalyse(resume)}
          disabled={!isDone}
          style={{ color: isDone ? '#4f46e5' : undefined }}
        >
          解析
        </Button>
        <Popconfirm
          title="确认删除此简历？"
          description="删除后数据将无法恢复"
          onConfirm={() => onDelete(resume)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>
      </div>
    </div>
  )
})

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [items, setItems] = useState<ResumeRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [selectedResume, setSelectedResume] = useState<ResumeRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ─── 拉取列表 ───────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await resumeApi.list({
        limit: PAGE_SIZE,
        offset: (p - 1) * PAGE_SIZE,
      })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取简历列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchList(page) }, [page, fetchList])

  // ─── 操作 ───────────────────────────────────────────────────────────────────

  const handleView = useCallback((r: ResumeRecord) => {
    setSelectedResume(r)
    setDrawerOpen(true)
  }, [])

  const handleAnalyse = useCallback((r: ResumeRecord) => {
    navigate(`/dashboard/resume/${r.id}`)
  }, [navigate])

  const handleDelete = useCallback(async (r: ResumeRecord) => {
    try {
      await resumeApi.remove(r.id)
      message.success('已删除')
      // 若当前页删完了就回到上一页
      const newTotal = total - 1
      const maxPage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
      const targetPage = page > maxPage ? maxPage : page
      if (targetPage !== page) {
        setPage(targetPage)
      } else {
        void fetchList(targetPage)
      }
    } catch {
      message.error('删除失败，请重试')
    }
  }, [total, page, fetchList])

  const handlePageChange = useCallback((p: number) => setPage(p), [])

  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">简历库</h1>
          <p className="dashboard-subtitle">管理和分析所有简历及面试记录</p>
        </div>
        <div className="dashboard-header-right">
          <Button
            icon={<RefreshCw size={14} />}
            size="small"
            onClick={() => void fetchList(page)}
            loading={loading}
          >
            刷新
          </Button>
          <Tag color="purple" className="dashboard-tag">
            {user?.role === 'admin' ? '管理员' : '普通用户'}
          </Tag>
        </div>
      </header>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FolderOpenDot size={18} />
            <span>我的简历</span>
          </div>
          <span className="dashboard-card-sub">
            共 {total} 份简历
          </span>
        </div>

        <div className="dashboard-table">
          <div className="dashboard-table-head">
            <span className="col-name">简历名称</span>
            <span className="col-date">上传日期</span>
            <span className="col-score">AI 评分</span>
            <span className="col-status">状态</span>
            <span className="col-actions">操作</span>
          </div>

          {loading ? (
            <div className="dashboard-table-loading">
              <Spin size="default" />
            </div>
          ) : items.length === 0 ? (
            <div className="dashboard-table-empty">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无简历，点击左侧「上传简历」开始"
              />
            </div>
          ) : (
            <motion.div
              className="dashboard-table-body"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence>
                {items.map((item) => (
                  <ResumeRow
                    key={item.id}
                    resume={item}
                    onView={handleView}
                    onAnalyse={handleAnalyse}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="dashboard-pagination">
            <Pagination
              current={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              showTotal={(t) => `共 ${t} 份`}
              showSizeChanger={false}
              size="small"
            />
          </div>
        )}
      </section>

      <Suspense fallback={null}>
        <ResumePreviewDrawer
          resume={selectedResume}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </Suspense>
    </main>
  )
}
