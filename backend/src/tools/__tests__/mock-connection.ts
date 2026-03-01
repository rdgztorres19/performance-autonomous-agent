import type { Connection, CommandResult } from '../../common/interfaces/connection.interface';

export function createMockConnection(stdout = '', stderr = '', exitCode = 0): Connection {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue({
      stdout,
      stderr,
      exitCode,
      executionTimeMs: 42,
    } satisfies CommandResult),
    isConnected: jest.fn().mockReturnValue(true),
  };
}
