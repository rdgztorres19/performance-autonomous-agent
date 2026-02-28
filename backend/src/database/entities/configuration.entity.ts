import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ConnectionType {
  LOCAL = 'local',
  SSH = 'ssh',
}

@Entity('configurations')
export class Configuration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', enum: ConnectionType, default: ConnectionType.LOCAL })
  connectionType!: ConnectionType;

  @Column({ type: 'varchar', nullable: true })
  sshHost?: string;

  @Column({ type: 'int', nullable: true })
  sshPort?: number;

  @Column({ type: 'varchar', nullable: true })
  sshUsername?: string;

  @Column({ type: 'varchar', nullable: true })
  sshPassword?: string;

  @Column({ type: 'varchar', nullable: true })
  sshPrivateKey?: string;

  @Column({ type: 'varchar', nullable: true })
  openaiApiKey?: string;

  @Column({ type: 'varchar', nullable: true, default: 'gpt-4o' })
  openaiModel?: string;

  @Column({ type: 'simple-json', nullable: true })
  scanningPreferences?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
