import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Configuration } from './configuration.entity.js';
import { TimelineEntry } from './timeline-entry.entity.js';
import { ProblemReport } from './problem-report.entity.js';
import { FormInteraction } from './form-interaction.entity.js';

export enum SessionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', enum: SessionStatus, default: SessionStatus.PENDING })
  status!: SessionStatus;

  @Column({ type: 'varchar', nullable: true })
  configurationId?: string;

  @ManyToOne(() => Configuration, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'configurationId' })
  configuration?: Configuration;

  @OneToMany(() => TimelineEntry, (entry) => entry.session)
  timelineEntries!: TimelineEntry[];

  @OneToMany(() => ProblemReport, (report) => report.session)
  problemReports!: ProblemReport[];

  @OneToMany(() => FormInteraction, (form) => form.session)
  formInteractions!: FormInteraction[];

  @Column({ type: 'simple-json', nullable: true })
  summary?: Record<string, unknown>;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
