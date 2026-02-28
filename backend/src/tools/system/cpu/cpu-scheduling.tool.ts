import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

export class CpuSchedulingTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'cpu_scheduling',
      description:
        'Collects CPU scheduling metrics: scheduler latency, CPU migrations, and scheduling statistics from /proc/schedstat and /proc/stat.',
      category: ToolCategory.CPU,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'cat /proc/schedstat 2>/dev/null || echo "schedstat_unavailable"',
      'echo "---SEP---"',
      'grep -c processor /proc/cpuinfo',
      'echo "---SEP---"',
      'cat /proc/stat | grep -E "^cpu[0-9]" | wc -l',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());
    const schedstatRaw = parts[0] ?? '';
    const cpuCount = parseInt(parts[1] ?? '1', 10);

    if (schedstatRaw.includes('schedstat_unavailable')) {
      return {
        cpuCount,
        schedstatAvailable: false,
        note: '/proc/schedstat not available. May require CONFIG_SCHEDSTATS=y in kernel.',
      };
    }

    const lines = schedstatRaw.split('\n').filter((l) => l.startsWith('cpu'));
    let totalYieldCount = 0;
    let totalScheduleCount = 0;
    let totalRunTime = 0;
    let totalWaitTime = 0;

    for (const line of lines) {
      const values = line.replace(/^cpu\d+\s+/, '').split(/\s+/).map(Number);
      totalYieldCount += values[0] ?? 0;
      totalScheduleCount += values[1] ?? 0;
      totalRunTime += values[2] ?? 0;
      totalWaitTime += values[3] ?? 0;
    }

    return {
      cpuCount,
      schedstatAvailable: true,
      totalYieldCount,
      totalScheduleCount,
      totalRunTimeNs: totalRunTime,
      totalWaitTimeNs: totalWaitTime,
      avgScheduleLatencyNs:
        totalScheduleCount > 0 ? Math.round(totalWaitTime / totalScheduleCount) : 0,
    };
  }
}
