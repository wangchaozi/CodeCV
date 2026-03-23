import { useRef, useState, useCallback } from 'react'
import { Modal, Button, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  FileText,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { resumeApi } from '../../api/resume'

interface ResumeUploadModalProps {
  open: boolean
  onClose: () => void
}

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'done' | 'error'

export function ResumeUploadModal({ open, onClose }: ResumeUploadModalProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [resumeId, setResumeId] = useState<string | null>(null)

  const validateFile = (f: File): string | null => {
    const ext = f.name.toLowerCase()
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx') && !ext.endsWith('.doc')) {
      return '仅支持 PDF / DOCX 格式的简历文件'
    }
    if (f.size > 20 * 1024 * 1024) {
      return `文件过大（当前 ${(f.size / 1024 / 1024).toFixed(1)} MB，最大 20 MB）`
    }
    return null
  }

  const handleFile = useCallback(async (f: File) => {
    const err = validateFile(f)
    if (err) {
      setErrorMsg(err)
      return
    }

    setErrorMsg('')
    setFile(f)
    setStatus('uploading')
    setProgress(0)

    try {
      // 调用真实后端上传接口
      const res = await resumeApi.upload(f, (pct) => setProgress(pct))
      const record = res.data

      setResumeId(record.id)
      setStatus('parsing')

      // 轮询解析状态（每 2s 查询一次，最多等 30s）
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const detail = await resumeApi.getById(record.id)
          const latest = detail.data
          if (latest.status === 'done') {
            clearInterval(poll)
            setStatus('done')
          } else if (latest.status === 'error') {
            clearInterval(poll)
            setErrorMsg(latest.errorMessage ?? '解析失败，请重试')
            setStatus('error')
          } else if (attempts >= 15) {
            // 超时后仍可进入分析页查看进度
            clearInterval(poll)
            setStatus('done')
          }
        } catch {
          clearInterval(poll)
          setStatus('done') // 轮询失败时不阻断用户继续操作
        }
      }, 2000)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? '上传失败，请检查网络后重试'
      setErrorMsg(msg)
      setStatus('error')
      message.error(msg)
    }
  }, [])

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
      const dropped = e.dataTransfer.files[0]
      if (dropped) void handleFile(dropped)
    },
    [handleFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files?.[0]
      if (picked) void handleFile(picked)
      e.target.value = ''
    },
    [handleFile],
  )

  const handleViewAnalysis = useCallback(() => {
    onClose()
    if (resumeId) {
      navigate(`/dashboard/resume/${resumeId}`)
    }
  }, [navigate, onClose, resumeId])

  const handleRetry = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setErrorMsg('')
    setResumeId(null)
  }, [])

  const handleClose = useCallback(() => {
    if (status === 'uploading' || status === 'parsing') return
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setErrorMsg('')
    setResumeId(null)
    onClose()
  }, [status, onClose])

  const isProcessing = status === 'uploading' || status === 'parsing'

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600 }}>
          <UploadCloud size={17} color="#4f46e5" />
          上传简历
        </span>
      }
      open={open}
      onCancel={handleClose}
      maskClosable={!isProcessing}
      closable={!isProcessing}
      footer={null}
      width={500}
      destroyOnClose
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {/* 上传区 */}
      {status === 'idle' && (
        <>
          <div
            className={`resume-drop-zone${isDragging ? ' is-dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <UploadCloud
              size={38}
              className="resume-drop-icon"
              style={{ color: isDragging ? '#4f46e5' : '#9ca3af' }}
            />
            <p className="resume-drop-title">
              {isDragging ? '松开鼠标以上传' : '拖拽简历到此处，或点击选择'}
            </p>
            <p className="resume-drop-hint">支持 PDF、DOCX 格式 · 最大 20 MB</p>
          </div>
          {errorMsg && (
            <div className="resume-upload-error">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </>
      )}

      {/* 上传进度 */}
      {status === 'uploading' && file && (
        <div className="resume-upload-progress-card">
          <div className="resume-upload-file-row">
            <div className="resume-upload-file-icon">
              <FileText size={20} color="#4f46e5" />
            </div>
            <div className="resume-upload-file-info">
              <span className="resume-upload-file-name">{file.name}</span>
              <span className="resume-upload-file-size">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
          </div>
          <div className="resume-upload-stage">
            <div className="resume-progress-bar-wrap">
              <div
                className="resume-progress-bar-fill"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <span className="resume-progress-pct">{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {/* AI 解析中 */}
      {status === 'parsing' && file && (
        <div className="resume-upload-progress-card">
          <div className="resume-upload-file-row">
            <div className="resume-upload-file-icon">
              <FileText size={20} color="#4f46e5" />
            </div>
            <div className="resume-upload-file-info">
              <span className="resume-upload-file-name">{file.name}</span>
              <span className="resume-upload-file-size">上传完成</span>
            </div>
          </div>
          <div className="resume-parsing-stage">
            <Loader2 size={15} className="resume-spin" color="#4f46e5" />
            <span>AI 正在解析简历内容...</span>
          </div>
        </div>
      )}

      {/* 解析完成 */}
      {status === 'done' && file && (
        <div className="resume-upload-done-card">
          <div className="resume-done-icon-wrap">
            <CheckCircle2 size={36} color="#16a34a" />
          </div>
          <div className="resume-done-text">
            <p className="resume-done-title">解析完成！</p>
            <p className="resume-done-sub">{file.name}</p>
          </div>
          <Button
            type="primary"
            icon={<ArrowRight size={14} />}
            iconPosition="end"
            onClick={handleViewAnalysis}
            style={{ marginTop: 16, width: '100%', height: 38 }}
          >
            查看解析结果 &amp; 开始面试准备
          </Button>
        </div>
      )}

      {/* 上传/解析失败 */}
      {status === 'error' && (
        <div className="resume-upload-done-card">
          <AlertCircle size={36} color="#dc2626" />
          <div className="resume-done-text">
            <p className="resume-done-title" style={{ color: '#dc2626' }}>上传失败</p>
            <p className="resume-done-sub">{errorMsg}</p>
          </div>
          <Button
            icon={<RefreshCw size={14} />}
            onClick={handleRetry}
            style={{ marginTop: 16, width: '100%', height: 38 }}
          >
            重新上传
          </Button>
        </div>
      )}
    </Modal>
  )
}
