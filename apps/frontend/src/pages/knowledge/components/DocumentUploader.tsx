import { useRef, useState, useCallback } from 'react'
import { Modal, Button } from 'antd'
import { UploadCloud, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import {
  useKnowledgeArticleStore,
  getDocFormat,
  FORMAT_CONFIG,
  formatFileSize,
  MAX_FILE_SIZE,
  ACCEPT_TYPES,
} from '../../../stores/knowledge-article.store'
import type { KnowledgeArticle } from '../../../types/knowledge.types'

interface DocumentUploaderProps {
  open: boolean
  spaceId: number
  onClose: () => void
}

interface ValidationError {
  fileName: string
  message: string
}

// ─── 格式徽章 ──────────────────────────────────────────────────────────────────

function FormatBadge({ format }: { format: KnowledgeArticle['fileFormat'] }) {
  if (!format) return null
  const cfg = FORMAT_CONFIG[format]
  return (
    <span className="kn-doc-format-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

// ─── 上传队列中的单条文章 ──────────────────────────────────────────────────────

function UploadQueueItem({ article }: { article: KnowledgeArticle }) {
  const isChunked = (article.fileSize ?? 0) > 10 * 1024 * 1024

  return (
    <div className="kn-upload-queue-item">
      <FormatBadge format={article.fileFormat} />
      <div className="kn-upload-queue-info">
        <span className="kn-upload-queue-name" title={article.originalFileName}>
          {article.originalFileName}
        </span>
        <span className="kn-upload-queue-size">
          {article.fileSize ? formatFileSize(article.fileSize) : ''}
        </span>
      </div>
      <div className="kn-upload-queue-state">
        {article.uploadStatus === 'uploading' && (
          <div className="kn-upload-queue-progress-wrap">
            <div className="kn-upload-queue-progress-bar">
              <div
                className="kn-upload-queue-progress-fill"
                style={{ width: `${article.uploadProgress ?? 0}%` }}
              />
            </div>
            <span className="kn-upload-queue-pct">
              {article.uploadProgress ?? 0}%{isChunked && ' (分片)'}
            </span>
          </div>
        )}
        {article.uploadStatus === 'parsing' && (
          <span className="kn-upload-queue-status parsing">
            <Loader2 size={12} className="kn-spin" /> 解析中
          </span>
        )}
        {article.uploadStatus === 'parsed' && (
          <span className="kn-upload-queue-status parsed">
            <CheckCircle2 size={12} /> 已生成文章
          </span>
        )}
        {article.uploadStatus === 'failed' && (
          <span className="kn-upload-queue-status failed">
            <XCircle size={12} /> 解析失败
          </span>
        )}
      </div>
    </div>
  )
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────

export function DocumentUploader({ open, spaceId, onClose }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [modal, contextHolder] = Modal.useModal()

  const { uploadArticle, articlesBySpace } = useKnowledgeArticleStore()
  const articles = articlesBySpace[spaceId] ?? []

  // 只展示本次弹窗内发起的上传（uploading/parsing/parsed/failed 状态的上传文章）
  const uploadQueue = articles.filter((a) => a.source === 'upload' && a.uploadStatus !== undefined)

  const clearErrors = useCallback(() => {
    setTimeout(() => setErrors([]), 5000)
  }, [])

  const processFiles = useCallback(
    (files: File[]) => {
      const newErrors: ValidationError[] = []

      for (const file of files) {
        // 格式校验
        if (!getDocFormat(file.name)) {
          newErrors.push({
            fileName: file.name,
            message: '仅支持 PDF / Markdown / TXT / DOCX / JS / TS / Vue 格式',
          })
          continue
        }

        // 大小校验
        if (file.size > MAX_FILE_SIZE) {
          newErrors.push({
            fileName: file.name,
            message: `文件大小超出限制（最大 50 MB，当前 ${formatFileSize(file.size)}）`,
          })
          continue
        }

        // 重复校验（同名且已解析完成的文章）
        const existing = articles.find(
          (a) => a.originalFileName === file.name && a.uploadStatus !== 'uploading',
        )

        if (existing) {
          modal.confirm({
            title: '文档已存在',
            content: `"${file.name}" 已上传过（${
              existing.uploadStatus === 'parsed' ? '已解析为文章' : '解析失败'
            }），是否覆盖并重新生成？`,
            okText: '覆盖上传',
            cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: () => uploadArticle(spaceId, file, true),
          })
        } else {
          void uploadArticle(spaceId, file, false)
        }
      }

      if (newErrors.length > 0) {
        setErrors(newErrors)
        clearErrors()
      }
    },
    [articles, spaceId, uploadArticle, modal, clearErrors],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      processFiles(Array.from(e.dataTransfer.files))
    },
    [processFiles],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(Array.from(e.target.files ?? []))
      e.target.value = ''
    },
    [processFiles],
  )

  return (
    <Modal
      title="上传文档"
      open={open}
      onCancel={onClose}
      footer={<Button type="primary" onClick={onClose}>完成</Button>}
      width={560}
      destroyOnClose={false}
    >
      {contextHolder}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_TYPES}
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {/* 拖拽上传区 */}
      <div
        className={`kn-drop-zone${isDragging ? ' is-dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <UploadCloud
          size={36}
          className="kn-drop-icon"
          style={{ color: isDragging ? '#5b5bd6' : '#9ca3af' }}
        />
        <p className="kn-drop-title">
          {isDragging ? '松开鼠标以上传' : '拖拽文件到此处，或点击选择文件'}
        </p>
        <p className="kn-drop-hint">支持 PDF、Markdown、TXT、DOCX、JS / TS / Vue · 最大 50 MB</p>
        <p className="kn-drop-chunked-hint">
          上传后自动解析为文章，可直接在知识库中查看 · 大文件（&gt;10 MB）自动分片
        </p>
      </div>

      {/* 校验错误 */}
      {errors.length > 0 && (
        <div className="kn-upload-errors">
          {errors.map((err, i) => (
            <div key={i} className="kn-upload-error-item">
              <AlertCircle size={13} />
              <span><strong>{err.fileName}</strong>：{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 上传队列 */}
      {uploadQueue.length > 0 && (
        <div className="kn-upload-queue">
          <p className="kn-upload-queue-title">解析队列</p>
          {uploadQueue.map((a) => <UploadQueueItem key={a.id} article={a} />)}
        </div>
      )}
    </Modal>
  )
}
