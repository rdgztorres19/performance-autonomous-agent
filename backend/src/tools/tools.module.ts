import { Module } from '@nestjs/common';
import { ToolRegistry } from './tool-registry.js';
import { ConnectionsModule } from '../connections/connections.module.js';

@Module({
  imports: [ConnectionsModule],
  providers: [ToolRegistry],
  exports: [ToolRegistry],
})
export class ToolsModule {}
