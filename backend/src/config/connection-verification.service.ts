import { Injectable } from '@nestjs/common';
import { ConnectionFactory } from '../connections/connection.factory.js';
import type { ConnectionConfig } from '../common/interfaces/index.js';
import { Configuration, ConnectionType } from '../database/entities/index.js';

const VERIFY_TIMEOUT_MS = 5000;

export interface VerifyInput {
  connectionType: ConnectionType | 'local' | 'ssh';
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
}

@Injectable()
export class ConnectionVerificationService {
  constructor(private readonly connectionFactory: ConnectionFactory) {}

  /**
   * Verify connection for a configuration (saved or form data).
   * - Local: runs `echo 1` locally
   * - SSH: connects and runs `echo 1`
   */
  async verify(config: Configuration | VerifyInput): Promise<boolean> {
    const cfg = this.toConnectionConfig(config);
    const conn = this.connectionFactory.create(cfg);

    try {
      await conn.connect();
      const result = await conn.execute('echo 1', VERIFY_TIMEOUT_MS);
      await conn.disconnect().catch(() => {});
      return result.exitCode === 0 && result.stdout?.trim() === '1';
    } catch {
      try {
        await conn.disconnect();
      } catch {
        /* ignore */
      }
      return false;
    }
  }

  private toConnectionConfig(c: Configuration | VerifyInput): ConnectionConfig {
    const type: 'local' | 'ssh' = String(c.connectionType).toLowerCase() === 'ssh' ? 'ssh' : 'local';
    if (type === 'local') {
      return { type: 'local' };
    }
    const config = c as Configuration | (VerifyInput & { sshHost: string; sshUsername: string });
    return {
      type: 'ssh',
      ssh: {
        host: config.sshHost!,
        port: config.sshPort ?? 22,
        username: config.sshUsername!,
        password: config.sshPassword || undefined,
        privateKey: config.sshPrivateKey || undefined,
      },
    };
  }
}
