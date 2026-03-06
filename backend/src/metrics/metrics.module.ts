import { Module } from '@nestjs/common';
import { MetricsCollectorService } from './metrics-collector.service.js';
import { ConnectionsModule } from '../connections/connections.module.js';
import { ConfigModule } from '../config/config.module.js';
import { ToolsModule } from '../tools/tools.module.js';

@Module({
  imports: [ConnectionsModule, ConfigModule, ToolsModule],
  providers: [MetricsCollectorService],
  exports: [MetricsCollectorService],
})
export class MetricsModule {}
