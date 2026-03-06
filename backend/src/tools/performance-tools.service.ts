import { Injectable } from '@nestjs/common';
import { ConnectionFactory } from '../connections/connection.factory.js';
import { ConfigurationService } from '../config/configuration.service.js';

export interface PerformanceToolStatus {
  id: string;
  name: string;
  category: string;
  package: string;
  checkCommand: string;
  installed: boolean;
  description: string;
}

const TOOL_DEFINITIONS: Omit<PerformanceToolStatus, 'installed'>[] = [
  {
    id: 'perf',
    name: 'perf',
    category: 'CPU',
    package: 'linux-tools-generic',
    // Ubuntu wrapper checks kernel version and fails in Docker; use real binary in /usr/lib/linux-tools
    checkCommand: 'P=$(find /usr/lib/linux-tools -name perf -type f 2>/dev/null | head -1); test -n "$P" && $P --version >/dev/null 2>&1 && echo ok',
    description: 'Branch mispredictions, cache L1/L2/L3, IPC, stalled cycles, core migrations',
  },
  {
    id: 'pidstat',
    name: 'pidstat',
    category: 'Context switches',
    package: 'sysstat',
    checkCommand: 'which pidstat && pidstat -V >/dev/null 2>&1',
    description: 'Context switches per thread in real time (pidstat -wt)',
  },
  {
    id: 'strace',
    name: 'strace',
    category: 'Syscalls',
    package: 'strace',
    checkCommand: 'which strace && strace -V >/dev/null 2>&1',
    description: 'Syscalls by type, real time, by file, fsync',
  },
  {
    id: 'pmap',
    name: 'pmap',
    category: 'Memory',
    package: 'procps',
    checkCommand: 'which pmap',
    description: 'Detailed memory map (RSS, shared/private)',
  },
  {
    id: 'smem',
    name: 'smem',
    category: 'Memory',
    package: 'smem',
    checkCommand: 'which smem',
    description: 'Memory usage PSS/USS (shared/private)',
  },
  {
    id: 'iotop',
    name: 'iotop',
    category: 'I/O',
    package: 'iotop',
    checkCommand: 'which iotop',
    description: 'I/O KB/s in real time per process',
  },
  {
    id: 'nethogs',
    name: 'nethogs',
    category: 'Network',
    package: 'nethogs',
    checkCommand: 'which nethogs',
    description: 'Traffic per process (requires root)',
  },
];

@Injectable()
export class PerformanceToolsService {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly connectionFactory: ConnectionFactory,
  ) {}

  async getToolsStatus(configurationId: string): Promise<PerformanceToolStatus[]> {
    const config = await this.configService.findById(configurationId);
    const connection = this.connectionFactory.create({
      type: config.connectionType as 'local' | 'ssh',
      ssh: config.sshHost
        ? {
            host: config.sshHost,
            port: config.sshPort ?? 22,
            username: config.sshUsername ?? '',
            password: config.sshPassword,
            privateKey: config.sshPrivateKey,
          }
        : undefined,
    });

    try {
      await connection.connect();

      const results: PerformanceToolStatus[] = [];

      for (const def of TOOL_DEFINITIONS) {
        let installed = false;
        try {
          const result = await connection.execute(def.checkCommand, 5000);
          installed = result.exitCode === 0 && result.stdout.trim().length > 0;
        } catch {
          installed = false;
        }

        results.push({
          ...def,
          installed,
        });
      }

      return results;
    } finally {
      await connection.disconnect();
    }
  }

  async installTool(configurationId: string, toolId: string): Promise<{ success: boolean; message: string }> {
    const def = TOOL_DEFINITIONS.find((d) => d.id === toolId);
    if (!def) {
      return { success: false, message: `Unknown tool: ${toolId}` };
    }

    const config = await this.configService.findById(configurationId);
    const connection = this.connectionFactory.create({
      type: config.connectionType as 'local' | 'ssh',
      ssh: config.sshHost
        ? {
            host: config.sshHost,
            port: config.sshPort ?? 22,
            username: config.sshUsername ?? '',
            password: config.sshPassword,
            privateKey: config.sshPrivateKey,
          }
        : undefined,
    });

    try {
      await connection.connect();

      // Debian/Ubuntu: use apt-get directly when sudo is not available (e.g. Docker as root)
      const installCmd = `sh -c 'if command -v sudo >/dev/null 2>&1; then sudo -n apt-get update -qq && sudo -n apt-get install -y ${def.package}; else apt-get update -qq && apt-get install -y ${def.package}; fi'`;
      const result = await connection.execute(installCmd, 120_000);

      if (result.exitCode === 0) {
        // perf: Ubuntu wrapper fails in Docker (kernel mismatch); replace with real binary
        if (toolId === 'perf') {
          const workaround =
            "sh -c 'P=$(find /usr/lib/linux-tools -name perf -type f 2>/dev/null | head -1); test -n \"$P\" && cp \"$P\" /usr/bin/perf 2>/dev/null || true'";
          await connection.execute(workaround, 5000);
        }
        return { success: true, message: `${def.name} installed successfully` };
      }

      const err = result.stderr || result.stdout || 'Unknown error';
      return { success: false, message: err.trim().slice(0, 500) };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, message: msg.slice(0, 500) };
    } finally {
      await connection.disconnect();
    }
  }
}
