import client from './client'
import type { User } from '../types/auth.types'

export interface UpdateUserDto {
  username?: string
  avatar?: string
  phone?: string
  organization?: string
}

export interface ChangePasswordDto {
  oldPassword: string
  newPassword: string
}

export const userApi = {
  getMe: () =>
    client.get<User>('/user/me'),

  update: (id: string, data: UpdateUserDto) =>
    client.patch<User>(`/user/${id}`, data),

  changePassword: (id: string, data: ChangePasswordDto) =>
    client.patch<{ success: boolean }>(`/user/${id}/password`, data),

  remove: (id: string) =>
    client.delete<{ success: boolean }>(`/user/${id}`),
}
