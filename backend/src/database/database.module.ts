import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Configuration,
  Session,
  TimelineEntry,
  ProblemReport,
  FormInteraction,
} from './entities/index.js';

const entities = [Configuration, Session, TimelineEntry, ProblemReport, FormInteraction];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/performance-agent.sqlite',
      entities,
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
