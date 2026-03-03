import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class SystemLimitsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'radialBar',
        title: 'FD Limit Usage (Current Process)',
        unit: '%',
        gaugeField: 'fdLimitUsagePercent',
        gaugeMax: 100,
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'system_limits',
      description:
        'Collects key kernel limits from /proc/sys and process limits (ulimit) for the current shell. Does not use sysctl command.',
      category: ToolCategory.KERNEL,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'cat /proc/sys/fs/file-nr',
      'echo "---SEP---"',
      'cat /proc/sys/fs/file-max 2>/dev/null || echo "0"',
      'echo "---SEP---"',
      'cat /proc/sys/kernel/pid_max 2>/dev/null || echo "0"',
      'echo "---SEP---"',
      'cat /proc/sys/kernel/threads-max 2>/dev/null || echo "0"',
      'echo "---SEP---"',
      'cat /proc/sys/net/core/somaxconn 2>/dev/null || echo "128"',
      'echo "---SEP---"',
      'cat /proc/sys/net/ipv4/tcp_max_syn_backlog 2>/dev/null || echo "0"',
      'echo "---SEP---"',
      'cat /proc/sys/vm/overcommit_memory 2>/dev/null || echo "0"',
      'echo "---SEP---"',
      'bash -c "ulimit -a 2>/dev/null" || sh -c "ulimit -a 2>/dev/null" || echo "ulimit_unavailable"',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());

    const fileNr = (parts[0] ?? '').split(/\s+/);
    const openFds = parseInt(fileNr[0] ?? '0', 10);
    const freeFds = parseInt(fileNr[1] ?? '0', 10);
    const maxFds = parseInt(fileNr[2] ?? '0', 10);

    const fileMax = parseInt(parts[1] ?? '0', 10);
    const pidMax = parseInt(parts[2] ?? '0', 10);
    const threadsMax = parseInt(parts[3] ?? '0', 10);
    const somaxconn = parseInt(parts[4] ?? '128', 10);
    const tcpMaxSynBacklog = parseInt(parts[5] ?? '0', 10);
    const overcommitMemory = parseInt(parts[6] ?? '0', 10);

    const ulimitRaw = parts[7] ?? '';
    const ulimitAvailable = !ulimitRaw.includes('ulimit_unavailable') && ulimitRaw.trim().length > 0;

    const ulimitParsed: Record<string, string | number> = {};
    if (ulimitAvailable) {
      for (const line of ulimitRaw.split('\n')) {
        const match = line.match(/^([^(]+)\([^)]+\)\s+(.+)$/);
        if (match) {
          const key = match[1].trim().replace(/\s+/g, '_');
          const value = match[2].trim();
          ulimitParsed[key] = value === 'unlimited' ? -1 : parseInt(value, 10) || value;
        }
      }
    }

    const maxOpenFiles = ulimitAvailable && ulimitParsed['open_files'] !== undefined
      ? (ulimitParsed['open_files'] as number)
      : 0;
    const fdLimitUsagePercent = maxOpenFiles > 0 && openFds > 0
      ? Math.round((openFds / maxOpenFiles) * 10000) / 100
      : 0;

    return {
      kernel: {
        fileMax: fileMax || undefined,
        pidMax: pidMax || undefined,
        threadsMax: threadsMax || undefined,
        somaxconn,
        tcpMaxSynBacklog: tcpMaxSynBacklog || undefined,
        overcommitMemory: overcommitMemory === 0 ? 'heuristic' : overcommitMemory === 1 ? 'always' : 'never',
      },
      systemFds: {
        open: openFds,
        free: freeFds,
        max: maxFds,
      },
      ulimitAvailable,
      ulimit: ulimitParsed,
      fdLimitUsagePercent: maxOpenFiles > 0 ? fdLimitUsagePercent : undefined,
    };
  }
}
