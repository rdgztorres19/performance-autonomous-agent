import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

export class NetworkConnectionsTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'network_connections',
      description:
        'Collects TCP/UDP connection state summary: counts by state (ESTABLISHED, TIME_WAIT, CLOSE_WAIT, etc.), socket queue depth using ss command.',
      category: ToolCategory.NETWORK,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return 'ss -tan state all | tail -n +2 | awk \'{print $1}\' | sort | uniq -c | sort -rn';
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const states: Record<string, number> = {};
    let totalConnections = 0;

    for (const line of stdout.trim().split('\n')) {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (match) {
        const count = parseInt(match[1], 10);
        const state = match[2].trim();
        states[state] = count;
        totalConnections += count;
      }
    }

    return {
      totalConnections,
      states,
      established: states['ESTAB'] ?? 0,
      timeWait: states['TIME-WAIT'] ?? 0,
      closeWait: states['CLOSE-WAIT'] ?? 0,
      listen: states['LISTEN'] ?? 0,
      synSent: states['SYN-SENT'] ?? 0,
      synRecv: states['SYN-RECV'] ?? 0,
    };
  }
}
