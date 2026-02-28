import { Client, type ClientChannel } from 'ssh2';
import type { Connection, CommandResult } from '../../common/interfaces/index.js';
import { ConnectionError, CommandTimeoutError } from '../../common/errors/index.js';

const DEFAULT_TIMEOUT_MS = 30_000;

interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export class SshConnection implements Connection {
  private client: Client;
  private connected = false;

  constructor(private readonly config: SshConfig) {
    this.client = new Client();
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise<void>((resolve, reject) => {
      this.client
        .on('ready', () => {
          this.connected = true;
          resolve();
        })
        .on('error', (err: Error) => {
          this.connected = false;
          reject(new ConnectionError(`SSH connection failed to ${this.config.host}:${this.config.port}`, err));
        })
        .connect({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
          privateKey: this.config.privateKey,
          readyTimeout: 10_000,
        });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    this.client.end();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute(command: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<CommandResult> {
    if (!this.connected) {
      await this.connect();
    }

    const startTime = Date.now();

    return new Promise<CommandResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new CommandTimeoutError(command, timeoutMs));
      }, timeoutMs);

      this.client.exec(command, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          clearTimeout(timer);
          reject(new ConnectionError(`SSH command execution failed: ${err.message}`, err));
          return;
        }

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code: number) => {
            clearTimeout(timer);
            resolve({
              stdout,
              stderr,
              exitCode: code ?? 0,
              executionTimeMs: Date.now() - startTime,
            });
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }
}
