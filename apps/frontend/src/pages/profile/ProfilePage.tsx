import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  message,
  Modal,
  Tooltip,
} from 'antd'
import {
  User,
  Lock,
  AlertTriangle,
  ChevronLeft,
  Building2,
  Phone,
  Mail,
  Save,
  Camera,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { userApi } from '../../api/user'
import './profile.css'

interface BasicFormValues {
  username: string
  phone: string
  organization: string
}

interface PasswordFormValues {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

/** 将 File 对象压缩为指定尺寸的 JPEG base64 data URI */
function compressImage(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarLoading, setAvatarLoading] = useState(false)
  const [basicLoading, setBasicLoading] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [basicForm] = Form.useForm<BasicFormValues>()
  const [pwdForm] = Form.useForm<PasswordFormValues>()

  if (!user) return null

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('图片大小不能超过 5MB')
      return
    }
    setAvatarLoading(true)
    try {
      const base64 = await compressImage(file, 200)
      const res = await userApi.update(user.id, { avatar: base64 })
      updateUser(res.data)
      message.success('头像已更新')
    } catch {
      message.error('头像上传失败，请重试')
    } finally {
      setAvatarLoading(false)
      // 清空 input，允许重复选同一文件
      e.target.value = ''
    }
  }

  const handleBasicSubmit = async (values: BasicFormValues) => {
    setBasicLoading(true)
    try {
      const res = await userApi.update(user.id, {
        username: values.username,
        phone: values.phone || undefined,
        organization: values.organization || undefined,
      })
      updateUser(res.data)
      message.success('资料已更新')
    } catch {
      message.error('更新失败，请重试')
    } finally {
      setBasicLoading(false)
    }
  }

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致')
      return
    }
    setPwdLoading(true)
    try {
      await userApi.changePassword(user.id, {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success('密码已修改，请重新登录')
      pwdForm.resetFields()
      setTimeout(() => {
        logout()
        navigate('/login')
      }, 1200)
    } catch {
      message.error('旧密码错误或修改失败')
    } finally {
      setPwdLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await userApi.remove(user.id)
      message.success('账号已注销')
      logout()
      navigate('/login')
    } catch {
      message.error('注销失败，请重试')
    } finally {
      setDeleteLoading(false)
      setDeleteModalOpen(false)
    }
  }

  return (
    <div className="profile-root">
      {/* 顶部导航栏 */}
      <div className="profile-topbar">
        <button
          type="button"
          className="profile-back-btn"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={16} />
          返回
        </button>
        <h1 className="profile-topbar-title">个人信息</h1>
      </div>

      <div className="profile-body">
        {/* 用户头像卡片 */}
        <div className="profile-avatar-card">
          <Tooltip title="点击更换头像">
            <button
              type="button"
              className={`profile-avatar-circle profile-avatar-btn${avatarLoading ? ' is-loading' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
            >
              {user.avatar
                ? <img src={user.avatar} alt="avatar" className="profile-avatar-img" />
                : (user.username ?? 'U').charAt(0).toUpperCase()
              }
              <div className="profile-avatar-overlay">
                {avatarLoading
                  ? <div className="profile-avatar-spinner" />
                  : <Camera size={20} />
                }
              </div>
            </button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarFileChange}
          />
          <div className="profile-avatar-info">
            <p className="profile-avatar-name">{user.username}</p>
            <p className="profile-avatar-email">{user.email}</p>
            <span className={`profile-role-badge ${user.role === 'admin' ? 'is-admin' : ''}`}>
              {user.role === 'admin' ? '管理员' : '普通用户'}
            </span>
          </div>
        </div>

        {/* 基本资料 */}
        <section className="profile-section">
          <div className="profile-section-header">
            <User size={16} />
            <span>基本资料</span>
          </div>
          <div className="profile-section-body">
            <Form
              form={basicForm}
              layout="vertical"
              initialValues={{
                username: user.username,
                phone: user.phone ?? '',
                organization: user.organization ?? '',
              }}
              onFinish={handleBasicSubmit}
            >
              <div className="profile-form-row">
                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input prefix={<User size={14} />} placeholder="请输入用户名" />
                </Form.Item>
                <Form.Item label="邮箱">
                  <Input
                    prefix={<Mail size={14} />}
                    value={user.email}
                    disabled
                    className="profile-input-disabled"
                  />
                </Form.Item>
              </div>
              <div className="profile-form-row">
                <Form.Item label="手机号" name="phone">
                  <Input prefix={<Phone size={14} />} placeholder="请输入手机号" />
                </Form.Item>
                <Form.Item label="所属组织" name="organization">
                  <Input prefix={<Building2 size={14} />} placeholder="请输入公司/学校" />
                </Form.Item>
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={basicLoading}
                  icon={<Save size={14} />}
                  className="profile-save-btn"
                >
                  保存更改
                </Button>
              </Form.Item>
            </Form>
          </div>
        </section>

        {/* 修改密码 */}
        <section className="profile-section">
          <div className="profile-section-header">
            <Lock size={16} />
            <span>修改密码</span>
          </div>
          <div className="profile-section-body">
            <Form
              form={pwdForm}
              layout="vertical"
              onFinish={handlePasswordSubmit}
            >
              <Form.Item
                label="当前密码"
                name="oldPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password placeholder="请输入当前密码" />
              </Form.Item>
              <div className="profile-form-row">
                <Form.Item
                  label="新密码"
                  name="newPassword"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码至少 6 位' },
                  ]}
                >
                  <Input.Password placeholder="至少 6 位" />
                </Form.Item>
                <Form.Item
                  label="确认新密码"
                  name="confirmPassword"
                  rules={[{ required: true, message: '请再次输入新密码' }]}
                >
                  <Input.Password placeholder="再次输入新密码" />
                </Form.Item>
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={pwdLoading}
                  icon={<Lock size={14} />}
                  className="profile-save-btn"
                >
                  更新密码
                </Button>
              </Form.Item>
            </Form>
          </div>
        </section>

        {/* 危险区 */}
        <section className="profile-section is-danger">
          <div className="profile-section-header danger">
            <AlertTriangle size={16} />
            <span>危险操作</span>
          </div>
          <div className="profile-section-body">
            <div className="profile-danger-row">
              <div className="profile-danger-info">
                <p className="profile-danger-title">注销账号</p>
                <p className="profile-danger-desc">
                  注销后账号将被停用，所有数据不可访问，此操作不可撤销。
                </p>
              </div>
              <Button
                danger
                onClick={() => setDeleteModalOpen(true)}
                icon={<AlertTriangle size={14} />}
              >
                注销账号
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* 注销确认弹窗 */}
      <Modal
        title={
          <span className="profile-modal-title">
            <AlertTriangle size={18} style={{ color: '#ef4444', marginRight: 8 }} />
            确认注销账号
          </span>
        }
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        footer={null}
        width={420}
      >
        <div className="profile-modal-body">
          <p className="profile-modal-desc">
            你即将注销账号 <strong>{user.email}</strong>。
          </p>
          <p className="profile-modal-desc">
            账号停用后将无法登录，所有简历和数据将无法访问。该操作<strong>不可撤销</strong>，请谨慎操作。
          </p>
          <div className="profile-modal-actions">
            <Button onClick={() => setDeleteModalOpen(false)}>取消</Button>
            <Button
              danger
              type="primary"
              loading={deleteLoading}
              onClick={handleDeleteAccount}
            >
              确认注销
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
