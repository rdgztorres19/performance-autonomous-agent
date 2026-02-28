import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity.js';

export enum FormInteractionStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  EXPIRED = 'expired',
}

@Entity('form_interactions')
export class FormInteraction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  sessionId!: string;

  @ManyToOne(() => Session, (session) => session.formInteractions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  @Column({ type: 'varchar', enum: FormInteractionStatus, default: FormInteractionStatus.PENDING })
  status!: FormInteractionStatus;

  @Column({ type: 'text' })
  context!: string;

  @Column({ type: 'simple-json' })
  formSchema!: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  response?: Record<string, unknown>;

  @CreateDateColumn()
  requestedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  respondedAt?: Date;
}
