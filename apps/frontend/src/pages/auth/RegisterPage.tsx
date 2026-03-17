import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { motion } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Mail,
  Lock,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/auth.store";
import type { RegisterDto } from "../../types/auth.types";
import "./auth.css";

const features: { icon: LucideIcon; text: string }[] = [
  { icon: Sparkles, text: "一键生成专业简历优化建议" },
  { icon: BarChart3, text: "可视化数据报告，量化求职竞争力" },
  { icon: ShieldCheck, text: "数据安全加密，隐私严格保护" },
];

interface RegisterFormValues extends RegisterDto {
  confirmPassword: string;
}

const brandVariants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const formVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.15, ease: "easeOut" },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.5 + i * 0.12, duration: 0.4 },
  }),
};

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const onFinish = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      const { confirmPassword: _, ...registerData } = values;
      void _;
      const { data } = await authApi.register(registerData);
      setAuth(data.user, data.accessToken);
      void message.success("注册成功，欢迎加入 CodeCV！");
      navigate("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      void message.error(
        apiErr?.response?.data?.message ?? "注册失败，请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* 左侧品牌区 */}
      <motion.div
        className="auth-brand"
        variants={brandVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="brand-inner">
          <div className="brand-logo-row">
            <div className="brand-logo-icon">
              <Zap size={22} color="white" strokeWidth={2.5} />
            </div>
            <span className="brand-logo-name">CodeCV</span>
          </div>

          <h2 className="brand-headline">
            开启你的
            <br />
            AI 求职新旅程
          </h2>
          <p className="brand-sub">
            注册 CodeCV，让 AI 成为你的专属
            <br />
            求职顾问，简历分析从此不再烦恼
          </p>

          <div className="brand-feature-list">
            {features.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                className="brand-feature-item"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                custom={i}
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
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="auth-form-title">创建账户</p>
          <p className="auth-form-desc">免费注册，立即体验 AI 简历分析</p>

          <Form<RegisterFormValues>
            layout="vertical"
            onFinish={onFinish}
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: "请输入用户名" },
                { min: 2, message: "用户名至少 2 个字符" },
              ]}
            >
              <Input
                prefix={<User size={15} className="auth-input-icon" />}
                placeholder="你的用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: "请输入邮箱地址" },
                { type: "email", message: "邮箱格式不正确" },
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
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "密码至少 6 位" },
              ]}
            >
              <Input.Password
                prefix={<Lock size={15} className="auth-input-icon" />}
                placeholder="至少 6 位密码"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={["password"]}
              rules={[
                { required: true, message: "请再次输入密码" },
                ({ getFieldValue }) => ({
                  validator(_, value: string) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("两次输入的密码不一致"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<Lock size={15} className="auth-input-icon" />}
                placeholder="再次输入密码"
                autoComplete="new-password"
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
                注册
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-switch">
            已有账户？<Link to="/login">立即登录</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
