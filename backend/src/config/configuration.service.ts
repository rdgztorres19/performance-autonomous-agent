import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration, ConnectionType } from '../database/entities/index.js';

export class CreateConfigDto {
  name!: string;
  connectionType!: ConnectionType;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  scanningPreferences?: Record<string, unknown>;
}

export class UpdateConfigDto {
  name?: string;
  connectionType?: ConnectionType;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  scanningPreferences?: Record<string, unknown>;
}

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
  ) {}

  async create(dto: CreateConfigDto): Promise<Configuration> {
    const config = this.configRepo.create(dto);
    return this.configRepo.save(config);
  }

  async update(id: string, dto: UpdateConfigDto): Promise<Configuration> {
    const existing = await this.configRepo.findOneByOrFail({ id });
    Object.assign(existing, dto);
    return this.configRepo.save(existing);
  }

  async findById(id: string): Promise<Configuration> {
    return this.configRepo.findOneByOrFail({ id });
  }

  async findActive(): Promise<Configuration | null> {
    return this.configRepo.findOneBy({ isActive: true });
  }

  async findAll(): Promise<Configuration[]> {
    return this.configRepo.find({ order: { createdAt: 'DESC' } });
  }

  async delete(id: string): Promise<void> {
    await this.configRepo.delete(id);
  }

  toSafeResponse(config: Configuration): Partial<Configuration> {
    const { openaiApiKey, sshPassword, sshPrivateKey, ...safe } = config;
    return {
      ...safe,
      openaiApiKey: openaiApiKey ? '***configured***' : undefined,
      sshPassword: sshPassword ? '***configured***' : undefined,
      sshPrivateKey: sshPrivateKey ? '***configured***' : undefined,
    };
  }
}
