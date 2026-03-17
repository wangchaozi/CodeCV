export interface User {
  id: string
  username: string
  email: string
  avatar: string | null
  role: 'user' | 'admin'
  isActive: boolean
  createTime: string
  updateTime: string
  phone: string | null
  organization: string | null
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  username: string
  email: string
  password: string
  phone?: string
  organization?: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}
