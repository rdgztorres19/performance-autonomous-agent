import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration } from '../database/entities/index.js';
import { ConfigurationService } from './configuration.service.js';
import { ConnectionVerificationService } from './connection-verification.service.js';
import { EventsGateway } from '../websocket/events.gateway.js';
import type { ConfigStatusPayload } from './config-status.types.js';

@Injectable()
export class ConnectionMonitorService implements OnModuleInit {
  constructor(
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
    private readonly configService: ConfigurationService,
    private readonly verificationService: ConnectionVerificationService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  onModuleInit(): void {
    // Run once shortly after startup, then every 30s
    setTimeout(() => this.checkAll(), 3000);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAll(): Promise<void> {
    const configs = await this.configRepo.find({ order: { createdAt: 'DESC' } });
    if (configs.length === 0) return;

    const now = new Date();
    const results = await Promise.allSettled(
      configs.map(async (config) => {
        await this.configService.updateConnectionStatus(config.id, 'checking');
        const ok = await this.verificationService.verify(config);
        await this.configService.updateConnectionStatus(
          config.id,
          ok ? 'online' : 'offline',
        );
        return { id: config.id, status: ok ? 'online' : 'offline' as const };
      }),
    );

    const payload: ConfigStatusPayload[] = configs.map((config, i) => {
      const result = results[i];
      let status: ConfigStatusPayload['connectionStatus'] = 'offline';
      if (result?.status === 'fulfilled') {
        status = result.value.status as ConfigStatusPayload['connectionStatus'];
      } else {
        this.configService.updateConnectionStatus(config.id, 'offline').catch(() => {});
      }
      return {
        id: config.id,
        connectionStatus: status,
        connectionLastCheckedAt: now.toISOString(),
      };
    });

    if (payload.length > 0) {
      this.eventsGateway.broadcastConfigStatus(payload);
    }
  }
}
