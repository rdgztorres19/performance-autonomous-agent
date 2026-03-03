import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module.js';
import { ConnectionsModule } from './connections/connections.module.js';
import { ToolsModule } from './tools/tools.module.js';
import { AgentModule } from './agent/agent.module.js';
import { ConfigModule } from './config/config.module.js';
import { ApiModule } from './api/api.module.js';
import { WebsocketModule } from './websocket/websocket.module.js';
import { TerminalModule } from './terminal/terminal.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    ConnectionsModule,
    ToolsModule,
    AgentModule,
    ConfigModule,
    ApiModule,
    WebsocketModule,
    TerminalModule,
  ],
})
export class AppModule {}
