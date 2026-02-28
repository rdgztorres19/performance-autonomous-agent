import { Module } from '@nestjs/common';
import { ConnectionFactory } from './connection.factory.js';

@Module({
  providers: [ConnectionFactory],
  exports: [ConnectionFactory],
})
export class ConnectionsModule {}
