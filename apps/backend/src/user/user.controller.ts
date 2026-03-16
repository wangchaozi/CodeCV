import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ToggleActiveDto } from './dto/toggle-active.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UserEntity } from './entities/user.entity';

@ApiTags('User')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户信息' })
  @ApiResponse({ status: 200, description: '查询成功', type: UserEntity })
  getMe(@CurrentUser() user: JwtUser) {
    return this.userService.findOneById(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取用户信息' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '查询成功', type: UserEntity })
  findOne(@Param('id') id: string) {
    return this.userService.findOneById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户资料（不含邮箱/密码）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: UserEntity })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: '修改用户密码' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '修改成功' })
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const success = await this.userService.changePassword(
      id,
      dto.oldPassword,
      dto.newPassword,
    );
    return { success };
  }

  @Patch(':id/active')
  @ApiOperation({ summary: '启用/禁用用户' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '操作成功' })
  async toggleActive(@Param('id') id: string, @Body() dto: ToggleActiveDto) {
    const success = await this.userService.toggleActive(id, dto.isActive);
    return { success };
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除用户（禁用）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    const success = await this.userService.remove(id);
    return { success };
  }
}
