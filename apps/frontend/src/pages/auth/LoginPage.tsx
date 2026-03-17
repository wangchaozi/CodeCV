import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { motion } from 'framer-motion'
import { Zap, FileText, TrendingUp, Target, Mail, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import type { LoginDto } from '../../types/auth.types'
import './auth.css'

const features: { icon: LucideIcon; text: string }[] = [
  { icon: FileText, text: '智能解析简历，精准提取关键信息' },
  { icon: TrendingUp, text: 'AI 评分引擎，多维度综合评估' },
  { icon: Target, text: '精准岗位匹配，提升求职成功率' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const onFinish = async (values: LoginDto) => {
    try {
      setLoading(true)
      const { data } = await authApi.login(values)
      setAuth(data.user, data.accessToken)
      void message.success('登录成功，欢迎回来！')
      navigate('/dashboard')
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      void message.error(apiErr?.response?.data?.message ?? '登录失败，请检查邮箱或密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* 左侧品牌区 */}
      <motion.div
        className="auth-brand"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="brand-inner">
          <div className="brand-logo-row">
            <div className="brand-logo-icon">
              <Zap size={22} color="white" strokeWidth={2.5} />
            </div>
            <span className="brand-logo-name">CodeCV</span>
          </div>

          <h2 className="brand-headline">
            AI 驱动的<br />智能简历分析平台
          </h2>
          <p className="brand-sub">
            借助人工智能技术，精准解析你的简历<br />
            科学评分、岗位匹配，助力求职一步到位
          </p>

          <div className="brand-feature-list">
            {features.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                className="brand-feature-item"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.4 }}
              >
                <div className="feature-icon">
                  <Icon size={16} color="rgba(255,255,255,0.9)" />
                </div>
                <span>{text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 右侧表单区 */}
      <div className="auth-form-side">
        <motion.div
          className="auth-form-box"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <p className="auth-form-title">欢迎回来</p>
          <p className="auth-form-desc">登录你的 CodeCV 账户以继续</p>

          <Form<LoginDto>
            layout="vertical"
            onFinish={onFinish}
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '邮箱格式不正确' },
              ]}
            >
              <Input
                prefix={<Mail size={15} className="auth-input-icon" />}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<Lock size={15} className="auth-input-icon" />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="auth-submit-btn"
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-switch">
            还没有账户？<Link to="/register">立即注册</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
