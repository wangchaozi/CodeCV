import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeEntity } from './entities/resume.entity';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResumeEntity])],
  providers: [ResumeService],
  controllers: [ResumeController],
  exports: [ResumeService],
})
export class ResumeModule {}
