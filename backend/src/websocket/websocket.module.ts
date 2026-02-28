import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module.js';
import { EventsGateway } from './events.gateway.js';

@Module({
  imports: [AgentModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebsocketModule {}
