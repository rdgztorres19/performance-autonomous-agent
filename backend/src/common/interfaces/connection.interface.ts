export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

export interface ConnectionConfig {
  type: 'local' | 'ssh';
  ssh?: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
  };
}

export interface Connection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(command: string, timeoutMs?: number): Promise<CommandResult>;
  isConnected(): boolean;
}
