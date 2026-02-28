export class ConnectionError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'ConnectionError';
    this.originalError = originalError;
  }
}

export class CommandExecutionError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly stderr: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

export class CommandTimeoutError extends Error {
  constructor(
    public readonly command: string,
    public readonly timeoutMs: number,
  ) {
    super(`Command timed out after ${timeoutMs}ms: ${command}`);
    this.name = 'CommandTimeoutError';
  }
}
