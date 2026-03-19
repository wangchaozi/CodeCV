export interface Resume {
  id: number
  name: string
  date: string
  score: number
  status: '已完成' | '待面试'
  /** PDF 文件的访问地址，后端返回的 URL 或本地 blob URL */
  url?: string
}
