import { useAuthStore } from '../store/auth.store'

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export type ChatStreamEvent =
  | { type: 'sources'; sources: string[] }
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

/**
 * 向知识库发起流式 RAG 问答请求
 * 通过 ReadableStream 逐行解析 SSE 事件，调用对应回调
 */
export async function streamChat(
  spaceId: number,
  question: string,
  history: ChatHistoryItem[],
  callbacks: {
    onToken: (text: string) => void
    onSources: (sources: string[]) => void
    onDone: () => void
    onError: (message: string) => void
  },
): Promise<void> {
  const token = useAuthStore.getState().token

  const response = await fetch(`/api/knowledge/spaces/${spaceId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify({ question, history }),
  })

  if (!response.ok) {
    callbacks.onError(`请求失败: ${response.status}`)
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue

      try {
        const event = JSON.parse(raw) as ChatStreamEvent
        if (event.type === 'token') callbacks.onToken(event.text)
        else if (event.type === 'sources') callbacks.onSources(event.sources)
        else if (event.type === 'done') callbacks.onDone()
        else if (event.type === 'error') callbacks.onError(event.message)
      } catch {
        // 忽略解析失败的行
      }
    }
  }
}
