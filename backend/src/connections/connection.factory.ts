import { Injectable } from '@nestjs/common';
import type { Connection, ConnectionConfig } from '../common/interfaces/index.js';
import { ConnectionError } from '../common/errors/index.js';
import { LocalConnection } from './impl/local.connection.js';
import { SshConnection } from './impl/ssh.connection.js';

@Injectable()
export class ConnectionFactory {
  create(config: ConnectionConfig): Connection {
    switch (config.type) {
      case 'local':
        return new LocalConnection();

      case 'ssh':
        if (!config.ssh) {
          throw new ConnectionError('SSH configuration is required for SSH connection type');
        }
        return new SshConnection(config.ssh);

      default:
        throw new ConnectionError(`Unsupported connection type: ${config.type}`);
    }
  }
}
