import { useEffect } from 'react'
import { Modal, Form, Input, Select, message } from 'antd'
import { useKnowledgeArticleStore } from '../../../stores/knowledge-article.store'
import type { KnowledgeArticle, CreateArticleDto } from '../../../types/knowledge.types'

interface ArticleFormModalProps {
  open: boolean
  spaceId: number
  /** 传入已有文章表示编辑模式，null 为新建 */
  article?: KnowledgeArticle | null
  onClose: () => void
  /** 新建成功后回调，用于自动选中新文章 */
  onCreated?: (article: KnowledgeArticle) => void
}

interface FormValues {
  title: string
  content: string
  tags: string[]
}

export function ArticleFormModal({
  open,
  spaceId,
  article,
  onClose,
  onCreated,
}: ArticleFormModalProps) {
  const [form] = Form.useForm<FormValues>()
  const { createArticle, updateArticle, articlesBySpace } = useKnowledgeArticleStore()
  const isEdit = article != null

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        isEdit
          ? { title: article.title, content: article.content, tags: article.tags }
          : {},
      )
    } else {
      form.resetFields()
    }
  }, [open, article, isEdit, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const dto: CreateArticleDto = {
        spaceId,
        title: values.title.trim(),
        content: values.content.trim(),
        tags: values.tags ?? [],
      }

      if (isEdit) {
        await updateArticle(article.id, {
          title: dto.title,
          content: dto.content,
          tags: dto.tags,
        })
        message.success('文章更新成功')
      } else {
        await createArticle(dto)
        // 取出刚创建的文章（末尾）
        const created = (articlesBySpace[spaceId] ?? []).at(-1)
        if (created) onCreated?.(created)
        message.success('文章创建成功')
      }
      onClose()
    } catch {
      // antd form 校验失败时抛出
    }
  }

  return (
    <Modal
      title={isEdit ? '编辑文章' : '新建文章'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? '保存修改' : '创建'}
      cancelText="取消"
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
        <Form.Item
          name="title"
          label="文章标题"
          rules={[
            { required: true, message: '请输入标题' },
            { max: 100, message: '标题最多 100 个字符' },
          ]}
        >
          <Input placeholder="简短、清晰的标题" allowClear />
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Select
            mode="tags"
            placeholder="输入标签后按 Enter 添加"
            tokenSeparators={[',']}
            maxCount={8}
          />
        </Form.Item>

        <Form.Item
          name="content"
          label="内容"
          rules={[
            { required: true, message: '请输入内容' },
            { min: 10, message: '内容至少 10 个字符' },
          ]}
        >
          <Input.TextArea
            placeholder="支持 Markdown 格式，例如：## 标题、**粗体**、```代码块```"
            rows={14}
            showCount
            maxLength={20000}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
