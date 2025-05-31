import { Module } from '@nestjs/common';
import { ProtosService } from './protos.service';

@Module({
  providers: [ProtosService],
  exports: [ProtosService],
})
export class ProtosModule {}
