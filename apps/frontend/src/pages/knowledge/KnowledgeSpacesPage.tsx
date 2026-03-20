import { useEffect, useState, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Popconfirm, Empty, Spin, message } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Pencil, Trash2, Zap } from 'lucide-react'
import { useKnowledgeSpaceStore } from '../../stores/knowledge-space.store'
import { SpaceFormModal } from './components/SpaceFormModal'
import type { KnowledgeSpace } from '../../types/knowledge.types'
import './knowledge.css'

// ─── SpaceCard ────────────────────────────────────────────────────────────────

interface SpaceCardProps {
  space: KnowledgeSpace
  onEdit: (space: KnowledgeSpace) => void
  onDelete: (id: number) => void
  onClick: (id: number) => void
}

const SpaceCard = memo(function SpaceCard({ space, onEdit, onDelete, onClick }: SpaceCardProps) {
  const handleEdit = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onEdit(space) },
    [onEdit, space],
  )
  const handleDelete = useCallback(
    (e?: React.MouseEvent) => { e?.stopPropagation(); onDelete(space.id) },
    [onDelete, space.id],
  )
  const handleClick = useCallback(() => onClick(space.id), [onClick, space.id])

  const updatedDate = new Date(space.updatedAt).toLocaleDateString('zh-CN', {
    month: 'short', day: 'numeric',
  })

  return (
    <motion.div
      className="kn-space-card"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
    >
      <div className="kn-space-card-cover" style={{ background: space.coverColor }} />

      <div className="kn-space-card-body">
        <h3 className="kn-space-card-name">{space.name}</h3>
        <p className="kn-space-card-desc">{space.description || '暂无描述'}</p>
      </div>

      <div className="kn-space-card-footer">
        <span className="kn-space-card-meta">
          <strong>{space.articleCount}</strong> 篇文章 · 更新于 {updatedDate}
        </span>
        <div className="kn-space-card-ops">
          <button
            type="button"
            className="kn-icon-btn"
            onClick={handleEdit}
            title="编辑"
          >
            <Pencil size={13} />
          </button>
          <Popconfirm
            title="确认删除该知识库？"
            description="所有文章将一并删除，操作不可撤销"
            onConfirm={() => handleDelete()}
            onPopupClick={(e) => e.stopPropagation()}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="kn-icon-btn kn-icon-btn-danger"
              onClick={(e) => e.stopPropagation()}
              title="删除"
            >
              <Trash2 size={13} />
            </button>
          </Popconfirm>
        </div>
      </div>
    </motion.div>
  )
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgeSpacesPage() {
  const navigate = useNavigate()
  const { spaces, loading, error, fetchSpaces, deleteSpace } = useKnowledgeSpaceStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<KnowledgeSpace | null>(null)

  useEffect(() => { fetchSpaces() }, [fetchSpaces])

  const handleOpenCreate = useCallback(() => {
    setEditingSpace(null)
    setModalOpen(true)
  }, [])

  const handleOpenEdit = useCallback((space: KnowledgeSpace) => {
    setEditingSpace(space)
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setEditingSpace(null)
  }, [])

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteSpace(id)
      message.success('知识库已删除')
    },
    [deleteSpace],
  )

  const handleClickSpace = useCallback(
    (id: number) => navigate(`/knowledge/${id}`),
    [navigate],
  )

  return (
    <div className="kn-spaces-root">
      {/* 顶部导航 */}
      <header className="kn-topbar">
        <button
          type="button"
          className="kn-topbar-back"
          style={{ color: '#5b5bd6' }}
          onClick={() => navigate('/dashboard/library')}
          title="返回简历库"
        >
          <Zap size={16} />
          <span style={{ fontWeight: 600 }}>AI Interview</span>
        </button>
        <div className="kn-topbar-divider" />
        <span className="kn-topbar-title">知识库</span>
        <div className="kn-topbar-actions">
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={handleOpenCreate}
          >
            新建知识库
          </Button>
        </div>
      </header>

      <div className="kn-spaces-body">
        <div className="kn-spaces-hero">
          <div className="kn-spaces-hero-left">
            <h2>我的知识库</h2>
            <p>共 {spaces.length} 个知识库，整理面试知识点，随时查阅复习</p>
          </div>
        </div>

        {loading && (
          <div className="kn-empty">
            <Spin size="large" />
          </div>
        )}

        {!loading && error && (
          <div className="kn-empty">
            <BookOpen size={40} color="#e5e7eb" />
            <p style={{ color: '#ef4444', marginTop: 8 }}>{error}</p>
            <Button onClick={fetchSpaces} style={{ marginTop: 4 }}>重试</Button>
          </div>
        )}

        {!loading && !error && spaces.length === 0 && (
          <Empty
            description="还没有知识库，点击右上角新建一个吧"
            style={{ padding: '80px 0' }}
          />
        )}

        {!loading && !error && spaces.length > 0 && (
          <motion.div className="kn-spaces-grid" layout>
            <AnimatePresence initial={false}>
              {spaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  onClick={handleClickSpace}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <SpaceFormModal
        open={modalOpen}
        space={editingSpace}
        onClose={handleCloseModal}
      />
    </div>
  )
}
