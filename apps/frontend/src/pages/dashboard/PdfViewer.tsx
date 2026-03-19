import { memo, useState, useCallback, useRef } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileX } from 'lucide-react'

interface PdfViewerProps {
  url: string
}

const MIN_SCALE = 0.5
const MAX_SCALE = 2.0
const SCALE_STEP = 0.2

export const PdfViewer = memo(function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(false)
  }, [])

  const onLoadError = useCallback(() => {
    setLoading(false)
    setError(true)
  }, [])

  const prevPage = useCallback(() => {
    setPageNumber((p) => Math.max(1, p - 1))
  }, [])

  const nextPage = useCallback(() => {
    setPageNumber((p) => Math.min(numPages, p + 1))
  }, [numPages])

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(1)))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(1)))
  }, [])

  if (error) {
    return (
      <div className="pdf-error">
        <FileX size={40} color="#d1d5db" />
        <p className="pdf-error-text">PDF 加载失败</p>
        <p className="pdf-error-sub">请检查文件链接是否有效</p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer">
      {/* 工具栏 */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-left">
          <button
            className="pdf-btn"
            onClick={prevPage}
            disabled={pageNumber <= 1}
            title="上一页"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pdf-page-info">
            {loading ? '—' : pageNumber} / {loading ? '—' : numPages}
          </span>
          <button
            className="pdf-btn"
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            title="下一页"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="pdf-toolbar-right">
          <button
            className="pdf-btn"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            title="缩小"
          >
            <ZoomOut size={15} />
          </button>
          <span className="pdf-scale-text">{Math.round(scale * 100)}%</span>
          <button
            className="pdf-btn"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            title="放大"
          >
            <ZoomIn size={15} />
          </button>
        </div>
      </div>

      {/* PDF 渲染区 */}
      <div className="pdf-canvas-wrap" ref={containerRef}>
        {loading && (
          <div className="pdf-loading">
            <div className="pdf-loading-spinner" />
            <p>加载中...</p>
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={null}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer
            renderTextLayer
            loading={null}
          />
        </Document>
      </div>
    </div>
  )
})
