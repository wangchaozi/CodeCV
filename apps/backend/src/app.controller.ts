import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/** 健康检查接口，供 k8s / 负载均衡探针使用 */
@ApiTags('Health')
@Controller('health')
export class AppController {
  @Get()
  @ApiOperation({ summary: '健康检查' })
  check(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
