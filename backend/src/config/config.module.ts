import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ConnectionsModule } from '../connections/connections.module.js';
import { WebsocketModule } from '../websocket/websocket.module.js';
import { ConfigurationService } from './configuration.service.js';
import { ConnectionVerificationService } from './connection-verification.service.js';
import { ConnectionMonitorService } from './connection-monitor.service.js';

@Module({
  imports: [DatabaseModule, ConnectionsModule, WebsocketModule],
  providers: [ConfigurationService, ConnectionVerificationService, ConnectionMonitorService],
  exports: [ConfigurationService, ConnectionVerificationService],
})
export class ConfigModule {}
