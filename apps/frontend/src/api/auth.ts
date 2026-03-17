import client from './client'
import type { LoginDto, RegisterDto, AuthResponse, User } from '../types/auth.types'

export const authApi = {
  register: (data: RegisterDto) =>
    client.post<AuthResponse>('/auth/register', data),

  login: (data: LoginDto) =>
    client.post<AuthResponse>('/auth/login', data),

  getProfile: () =>
    client.get<User>('/auth/profile'),
}
