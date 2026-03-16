import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { UserEntity } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 注册：创建用户并返回访问令牌
   */
  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    const token = await this.generateToken(user);
    return { user, ...token };
  }

  /**
   * 登录：校验密码，通过后签发访问令牌
   */
  async login(loginUserDto: LoginUserDto) {
    const user = await this.userService.findOneByEmail(
      loginUserDto.email,
      true,
    );
    const isPasswordValid = await bcrypt.compare(
      loginUserDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const { password, ...userWithoutPassword } = user;
    const token = await this.generateToken(userWithoutPassword as UserEntity);
    return { user: userWithoutPassword, ...token };
  }

  /**
   * 鉴权后获取当前登录用户信息
   */
  async getProfile(userId: string) {
    return this.userService.findOneById(userId);
  }

  /**
   * 统一生成 JWT AccessToken
   */
  private async generateToken(user: UserEntity) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}
