import { exec } from 'child_process';
import type { Connection, CommandResult } from '../../common/interfaces/index.js';
import { CommandTimeoutError } from '../../common/errors/index.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export class LocalConnection implements Connection {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute(command: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<CommandResult> {
    const startTime = Date.now();

    return new Promise<CommandResult>((resolve, reject) => {
      const child = exec(command, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const executionTimeMs = Date.now() - startTime;

        if (error && error.killed) {
          reject(new CommandTimeoutError(command, timeoutMs));
          return;
        }

        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: error?.code ?? 0,
          executionTimeMs,
        });
      });

      child.on('error', (err) => {
        reject(new CommandTimeoutError(command, timeoutMs));
      });
    });
  }
}
