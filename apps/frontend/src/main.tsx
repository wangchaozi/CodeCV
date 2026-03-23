import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { pdfjs } from 'react-pdf'
import './index.css'
import App from './App.tsx'

// 通过 unpkg CDN 加载 PDF.js Worker，避免 Vite dev 模式本地路径解析不稳定的问题
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
