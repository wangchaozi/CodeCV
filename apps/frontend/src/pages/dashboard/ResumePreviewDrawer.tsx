import { memo, useMemo, lazy, Suspense } from 'react'
import { Drawer, Progress, Tag, Divider, Tabs } from 'antd'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  FileText,
  Calendar,
  BarChart3,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  FileX,
} from 'lucide-react'
import type { Resume } from '../../types/resume.types'

// bundle-dynamic-imports: PdfViewer 含 pdfjs 运行时，仅在打开 PDF Tab 时加载
const PdfViewer = lazy(() =>
  import('./PdfViewer').then((m) => ({ default: m.PdfViewer })),
)

interface ResumePreviewDrawerProps {
  resume: Resume | null
  open: boolean
  onClose: () => void
}

const SCORE_INSIGHTS: Record<string, string[]> = {
  high: [
    '项目描述量化指标丰富，突出了业务价值',
    '技术栈与目标岗位匹配度高，关键词覆盖完整',
    '工作经历的 STAR 法则应用出色，建议继续保持',
    '格式排版专业，信息密度合理',
    '可补充开源项目或技术分享链接进一步加分',
  ],
  medium: [
    '项目经验描述较好，建议加入更多可量化的业务指标',
    '技术栈匹配度较高，部分关键词可进一步补充',
    '建议在个人简介中加入 2-3 句核心竞争力描述',
    '工作经历结构清晰，可增加解决问题的思路说明',
    '格式整洁，建议适当精简冗余文字',
  ],
  low: [
    '项目描述需要加入数据支撑，量化成果更有说服力',
    '技术关键词覆盖不足，建议对照 JD 针对性补充',
    '个人简介部分过于笼统，需要体现差异化竞争力',
    '工作经历建议使用 STAR 法则重新梳理',
    '整体格式需要优化，建议参考目标岗位的简历模板',
  ],
}

const DIMENSION_LABELS = ['项目经验', '技术能力', '表达清晰', '关键词匹配', '格式排版']

function getScoreLevel(score: number) {
  if (score >= 85) return 'high'
  if (score >= 70) return 'medium'
  return 'low'
}

function getStrokeColor(score: number) {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#facc15'
  return '#f97316'
}

function getScoreLabel(score: number) {
  if (score >= 85) return { text: '优秀', color: 'success' as const }
  if (score >= 70) return { text: '良好', color: 'warning' as const }
  return { text: '待优化', color: 'error' as const }
}

function getScoreHint(score: number) {
  if (score >= 85) return '优秀简历，与目标岗位高度匹配，强烈推荐投递'
  if (score >= 70) return '良好简历，建议按 AI 建议小幅优化后投递'
  return '简历需要针对性优化，建议重点改进后再投递'
}

function buildRadarData(score: number) {
  const offsets = [3, 6, -4, 2, -7]
  return DIMENSION_LABELS.map((subject, i) => ({
    subject,
    value: Math.min(100, Math.max(40, score + offsets[i])),
    fullMark: 100,
  }))
}

// ── AI 分析面板（纯展示，单独 memo 避免 PDF Tab 切换时重渲染）────────────
interface AnalysisPanelProps {
  resume: Resume
}

const AnalysisPanel = memo(function AnalysisPanel({ resume }: AnalysisPanelProps) {
  const radarData = useMemo(() => buildRadarData(resume.score), [resume.score])
  const level = getScoreLevel(resume.score)
  const strokeColor = getStrokeColor(resume.score)
  const scoreLabel = getScoreLabel(resume.score)
  const insights = SCORE_INSIGHTS[level]

  return (
    <div className="preview-analysis">
      {/* AI 综合评分 */}
      <div className="preview-section">
        <div className="preview-section-title">
          <BarChart3 size={15} color="#4f46e5" />
          <span>AI 综合评分</span>
        </div>
        <div className="preview-score-row">
          <Progress
            type="circle"
            percent={resume.score}
            size={88}
            strokeColor={strokeColor}
            format={(v) => <span className="preview-score-number">{v}</span>}
          />
          <div className="preview-score-detail">
            <div className="preview-score-tags">
              <Tag color={scoreLabel.color}>{scoreLabel.text}</Tag>
              <Tag color={resume.status === '已完成' ? 'success' : 'processing'}>
                {resume.status}
              </Tag>
            </div>
            <p className="preview-score-hint">{getScoreHint(resume.score)}</p>
          </div>
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* 能力维度雷达图 */}
      <div className="preview-section">
        <div className="preview-section-title">
          <BarChart3 size={15} color="#4f46e5" />
          <span>能力维度分析</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            <Radar
              name="评分"
              dataKey="value"
              stroke="#4f46e5"
              fill="#4f46e5"
              fillOpacity={0.18}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number) => [`${value} 分`, '维度得分']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="preview-dimension-list">
          {radarData.map(({ subject, value }) => (
            <div key={subject} className="preview-dimension-item">
              <span className="preview-dimension-label">{subject}</span>
              <div className="preview-dimension-bar-wrap">
                <div className="preview-dimension-bar">
                  <div
                    className="preview-dimension-bar-inner"
                    style={{ width: `${value}%`, background: getStrokeColor(value) }}
                  />
                </div>
                <span className="preview-dimension-score">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* AI 分析建议 */}
      <div className="preview-section">
        <div className="preview-section-title">
          <Lightbulb size={15} color="#4f46e5" />
          <span>AI 分析建议</span>
        </div>
        <ul className="preview-insights">
          {insights.map((insight, i) => (
            <li key={i} className="preview-insight-item">
              {i < 2 ? (
                <CheckCircle size={14} className="preview-insight-icon insight-ok" />
              ) : (
                <AlertCircle size={14} className="preview-insight-icon insight-warn" />
              )}
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})

// ── 无 PDF 文件占位 ──────────────────────────────────────────────────────────
function NoPdfPlaceholder() {
  return (
    <div className="pdf-no-file">
      <FileX size={44} color="#d1d5db" />
      <p className="pdf-no-file-text">暂无 PDF 文件</p>
      <p className="pdf-no-file-sub">上传简历后可在此处直接预览原始文件</p>
    </div>
  )
}

// ── 主 Drawer ─────────────────────────────────────────────────────────────────
export const ResumePreviewDrawer = memo(function ResumePreviewDrawer({
  resume,
  open,
  onClose,
}: ResumePreviewDrawerProps) {
  if (!resume) return null

  const tabItems = [
    {
      key: 'analysis',
      label: 'AI 分析',
      children: <AnalysisPanel resume={resume} />,
    },
    {
      key: 'pdf',
      label: 'PDF 预览',
      children: resume.url ? (
        // async-suspense-boundaries: pdfjs 运行时懒加载，Suspense 兜底 loading
        <Suspense
          fallback={
            <div className="pdf-suspense-loading">
              <div className="pdf-loading-spinner" />
              <p>加载 PDF 引擎...</p>
            </div>
          }
        >
          <PdfViewer url={resume.url} />
        </Suspense>
      ) : (
        <NoPdfPlaceholder />
      ),
    },
  ]

  return (
    <Drawer
      title={
        <div className="preview-drawer-title">
          <FileText size={16} color="#4f46e5" />
          <span>简历详情</span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={680}
      destroyOnClose
      styles={{ body: { padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      {/* 文件信息 */}
      <div className="preview-file-card" style={{ margin: '16px 24px 0' }}>
        <div className="preview-file-icon-wrap">
          <FileText size={22} color="#4f46e5" />
        </div>
        <div className="preview-file-meta">
          <p className="preview-file-name" title={resume.name}>
            {resume.name}
          </p>
          <p className="preview-file-date">
            <Calendar size={12} />
            <span>{resume.date} 上传</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="analysis"
        items={tabItems}
        className="preview-tabs"
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ margin: '8px 24px 0', flexShrink: 0 }}
      />
    </Drawer>
  )
})
