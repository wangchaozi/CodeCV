import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Exclude } from 'class-transformer'; // 用于隐藏密码

@Entity('user')
@Unique(['email']) // 邮箱唯一
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string; // 用户唯一ID（后续所有模块关联此字段）

  @Column({ comment: '用户名' })
  username: string;

  @Column({ comment: '邮箱' })
  email: string;

  @Column({ comment: '密码（加密后）' })
  @Exclude() // 序列化时隐藏密码
  password: string;

  @Column({ comment: '头像URL', nullable: true })
  avatar: string;

  @Column({ comment: '角色', default: 'user', enum: ['user', 'admin'] })
  role: string;

  @Column({ comment: '是否激活', default: true })
  isActive: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updateTime: Date;

  // 扩展字段（后续可补充）
  @Column({ comment: '手机号', nullable: true })
  phone: string;

  @Column({ comment: '所属院校/公司', nullable: true })
  organization: string;
}
