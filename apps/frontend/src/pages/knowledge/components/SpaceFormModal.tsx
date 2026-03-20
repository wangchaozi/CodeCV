import { useEffect } from 'react'
import { Modal, Form, Input, message } from 'antd'
import { useKnowledgeSpaceStore, SPACE_PRESET_COLORS } from '../../../stores/knowledge-space.store'
import type { KnowledgeSpace, CreateSpaceDto } from '../../../types/knowledge.types'

interface SpaceFormModalProps {
  open: boolean
  /** 传入已有空间表示编辑模式，null 为新建 */
  space?: KnowledgeSpace | null
  onClose: () => void
}

interface FormValues {
  name: string
  description: string
  coverColor: string
}

export function SpaceFormModal({ open, space, onClose }: SpaceFormModalProps) {
  const [form] = Form.useForm<FormValues>()
  const { createSpace, updateSpace } = useKnowledgeSpaceStore()
  const isEdit = space != null

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        isEdit
          ? { name: space.name, description: space.description, coverColor: space.coverColor }
          : { coverColor: SPACE_PRESET_COLORS[0] },
      )
    } else {
      form.resetFields()
    }
  }, [open, space, isEdit, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const dto: CreateSpaceDto = {
        name: values.name.trim(),
        description: values.description?.trim() ?? '',
        coverColor: values.coverColor,
      }
      if (isEdit) {
        await updateSpace(space.id, dto)
        message.success('知识库更新成功')
      } else {
        await createSpace(dto)
        message.success('知识库创建成功')
      }
      onClose()
    } catch {
      // antd form 校验失败时抛出，无需额外处理
    }
  }

  return (
    <Modal
      title={isEdit ? '编辑知识库' : '新建知识库'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? '保存修改' : '创建'}
      cancelText="取消"
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="知识库名称"
          rules={[
            { required: true, message: '请输入名称' },
            { max: 40, message: '名称最多 40 个字符' },
          ]}
        >
          <Input placeholder="例如：JavaScript 核心" allowClear />
        </Form.Item>

        <Form.Item name="description" label="简介">
          <Input.TextArea
            placeholder="一句话描述这个知识库的内容..."
            rows={2}
            maxLength={120}
            showCount
          />
        </Form.Item>

        <Form.Item name="coverColor" label="封面色">
          <ColorPicker />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// 内联颜色选择器，antd v6 的 ColorPicker 组件较重，用简单色块代替
function ColorPicker({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {SPACE_PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange?.(color)}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: color,
            border: value === color ? '3px solid #111827' : '3px solid transparent',
            cursor: 'pointer',
            outline: 'none',
            padding: 0,
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          title={color}
        />
      ))}
    </div>
  )
}
