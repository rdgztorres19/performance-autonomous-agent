import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity.js';

export enum ProblemCategory {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  KERNEL = 'kernel',
  VIRTUALIZATION = 'virtualization',
  APPLICATION = 'application',
  FILE_SYSTEM = 'file_system',
  OTHER = 'other',
}

export enum ProblemSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

@Entity('problem_reports')
export class ProblemReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  sessionId!: string;

  @ManyToOne(() => Session, (session) => session.problemReports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  @Column({ type: 'varchar', enum: ProblemCategory })
  category!: ProblemCategory;

  @Column({ type: 'varchar', enum: ProblemSeverity })
  severity!: ProblemSeverity;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  explanation!: string;

  @Column({ type: 'simple-json' })
  metrics!: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  recommendations?: string[];

  @Column({ type: 'simple-json', nullable: true })
  relatedReportIds?: string[];

  @CreateDateColumn()
  detectedAt!: Date;
}
