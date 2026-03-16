import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 统一 JWT 守卫，应用在需要登录态的接口
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
