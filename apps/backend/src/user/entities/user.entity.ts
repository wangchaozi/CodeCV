import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Exclude } from 'class-transformer'; // 用于隐藏密码
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
@Unique(['email']) // 邮箱唯一
export class UserEntity {
  @ApiProperty({ description: '用户 ID' })
  @PrimaryGeneratedColumn('uuid') // PostgreSQL 原生支持 uuid 类型，无需额外指定
  id: string; // 用户唯一ID（后续所有模块关联此字段）

  @ApiProperty({ description: '用户名' })
  @Column({
    type: 'varchar', // 显式指定 PostgreSQL 类型
    length: 50, // 限制长度，提升性能
    comment: '用户名',
  })
  username: string;

  @ApiProperty({ description: '邮箱' })
  @Column({
    type: 'varchar',
    length: 100, // 邮箱长度通常不超过100
    comment: '邮箱',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 100, // 加密后的密码长度固定，限制长度
    comment: '密码（加密后）',
  })
  @Exclude() // 序列化时隐藏密码
  password: string;

  @ApiProperty({ description: '头像 URL 或 base64 数据', required: false, nullable: true })
  @Column({
    type: 'text',
    comment: '头像（URL 或 base64 data URI）',
    nullable: true,
  })
  avatar: string | null;

  @ApiProperty({
    description: '角色',
    enum: ['user', 'admin'],
    default: 'user',
  })
  @Column({
    type: 'varchar',
    length: 20, // 角色字符串短，限制长度
    comment: '角色',
    default: 'user', // 移除 enum 配置（PostgreSQL 不兼容 TypeORM 的 enum 简写）
    // 备注：如果需要严格枚举，建议用 PostgreSQL 原生 enum 或应用层校验
  })
  role: 'user' | 'admin'; // 用 TypeScript 联合类型替代 enum，保证类型安全

  @ApiProperty({ description: '是否激活', default: true })
  @Column({
    type: 'boolean', // 显式指定布尔类型
    comment: '是否激活',
    default: true,
  })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({
    type: 'timestamp', // 显式指定时间戳类型
    comment: '创建时间',
  })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({
    type: 'timestamp', // 显式指定时间戳类型
    comment: '更新时间',
  })
  updateTime: Date;

  // 扩展字段（后续可补充）
  @ApiProperty({ description: '手机号', required: false, nullable: true })
  @Column({
    type: 'varchar',
    length: 20, // 手机号长度固定
    comment: '手机号',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: '所属院校或公司',
    required: false,
    nullable: true,
  })
  @Column({
    type: 'varchar',
    length: 100, // 组织名称长度限制
    comment: '所属院校/公司',
    nullable: true,
  })
  organization: string | null;
}
