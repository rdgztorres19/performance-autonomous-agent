import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity.js';

export enum TimelineEntryType {
  TOOL_EXECUTION = 'tool_execution',
  PROBLEM_DETECTED = 'problem_detected',
  AGENT_DECISION = 'agent_decision',
  USER_INTERACTION = 'user_interaction',
  INFO = 'info',
  ERROR = 'error',
}

@Entity('timeline_entries')
export class TimelineEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  sessionId!: string;

  @ManyToOne(() => Session, (session) => session.timelineEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  @Column({ type: 'varchar', enum: TimelineEntryType })
  type!: TimelineEntryType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  reasoning?: string;

  @CreateDateColumn()
  timestamp!: Date;
}
