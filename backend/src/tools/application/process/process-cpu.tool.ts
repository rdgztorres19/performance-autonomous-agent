import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

export class ProcessCpuTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'process_cpu',
      description:
        'Collects per-process CPU usage: top CPU consuming processes, CPU% per process, user/system time breakdown using ps and /proc/<pid>/stat.',
      category: ToolCategory.APPLICATION_CPU,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Specific process ID to inspect. If empty, shows top 20 by CPU.',
          type: 'number',
          required: false,
        },
        {
          name: 'topN',
          description: 'Number of top CPU processes to show',
          type: 'number',
          required: false,
          defaultValue: 20,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = params['pid'] as number | undefined;
    const topN = Number(params['topN'] ?? 20);

    if (pid) {
      return `ps -p ${pid} -o pid,ppid,%cpu,%mem,vsz,rss,stat,time,comm --no-headers 2>/dev/null && echo "---SEP---" && cat /proc/${pid}/stat 2>/dev/null && echo "---SEP---" && cat /proc/${pid}/status 2>/dev/null`;
    }
    return `ps aux --sort=-%cpu | head -${topN + 1}`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    if (stdout.includes('---SEP---')) {
      const parts = stdout.split('---SEP---').map((s) => s.trim());
      const psLine = parts[0] ?? '';
      const cols = psLine.trim().split(/\s+/);

      return {
        pid: parseInt(cols[0] ?? '0', 10),
        ppid: parseInt(cols[1] ?? '0', 10),
        cpuPercent: parseFloat(cols[2] ?? '0'),
        memPercent: parseFloat(cols[3] ?? '0'),
        vszKb: parseInt(cols[4] ?? '0', 10),
        rssKb: parseInt(cols[5] ?? '0', 10),
        state: cols[6] ?? 'unknown',
        cpuTime: cols[7] ?? '0:00',
        command: cols.slice(8).join(' '),
      };
    }

    const lines = stdout.trim().split('\n');
    const processes: Record<string, unknown>[] = [];

    for (const line of lines.slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 11) continue;
      processes.push({
        user: cols[0],
        pid: parseInt(cols[1], 10),
        cpuPercent: parseFloat(cols[2]),
        memPercent: parseFloat(cols[3]),
        vszKb: parseInt(cols[4], 10),
        rssKb: parseInt(cols[5], 10),
        state: cols[7],
        command: cols.slice(10).join(' '),
      });
    }

    return { topProcesses: processes };
  }
}
