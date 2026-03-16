import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {
    // 从环境变量获取加密盐值
    this.saltRounds = +this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
  }

  /**
   * 创建用户（注册）
   */
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // 1. 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('该邮箱已注册');
    }

    // 2. 密码加密
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.saltRounds,
    );

    // 3. 创建用户
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword, // 存储加密后的密码
    });

    // 4. 保存到数据库
    const savedUser = await this.userRepository.save(user);

    // 5. 移除密码字段（避免返回）
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword as UserEntity;
  }

  /**
   * 按ID查询用户
   */
  async findOneById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在或已禁用');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserEntity;
  }

  /**
   * 按邮箱查询用户（用于登录）
   * @param withPassword 是否返回密码（仅登录时使用）
   */
  async findOneByEmail(
    email: string,
    withPassword = false,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在或已禁用');
    }

    // 非登录场景隐藏密码
    if (!withPassword) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as UserEntity;
    }
    return user;
  }

  /**
   * 更新用户信息
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    // 1. 检查用户是否存在
    await this.findOneById(id);

    // 2. 禁止更新邮箱/密码（单独接口处理）
    if (updateUserDto.email) {
      throw new BadRequestException('邮箱不支持修改');
    }
    if (updateUserDto.password) {
      throw new BadRequestException('请使用专用接口修改密码');
    }

    // 3. 更新用户信息
    await this.userRepository.update(id, updateUserDto);

    // 4. 返回更新后的用户
    return this.findOneById(id);
  }

  /**
   * 修改密码
   */
  async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    // 1. 检查用户
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 2. 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('旧密码错误');
    }

    // 3. 加密新密码并更新
    const hashedNewPassword = await bcrypt.hash(newPassword, this.saltRounds);
    await this.userRepository.update(id, { password: hashedNewPassword });

    return true;
  }

  /**
   * 禁用/启用用户
   */
  async toggleActive(id: string, isActive: boolean): Promise<boolean> {
    await this.findOneById(id);
    await this.userRepository.update(id, { isActive });
    return true;
  }

  /**
   * 删除用户（软删除，实际禁用）
   */
  async remove(id: string): Promise<boolean> {
    return this.toggleActive(id, false);
  }
}
