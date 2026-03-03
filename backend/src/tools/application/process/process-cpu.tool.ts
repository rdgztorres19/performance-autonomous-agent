import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class ProcessCpuTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'horizontalBar',
        title: 'Top Processes by CPU',
        unit: '%',
        arrayField: 'topProcesses',
        labelField: 'command',
        valueField: 'cpuPercent',
      }],
    };
  }

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
      const statLine = parts[1] ?? '';
      const cols = psLine.trim().split(/\s+/);

      const result: Record<string, unknown> = {
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

      const stat = this.parseProcStat(statLine);
      if (stat) {
        result.utimeTicks = stat.utime;
        result.stimeTicks = stat.stime;
        result.minflt = stat.minflt;
        result.majflt = stat.majflt;
        const total = stat.utime + stat.stime;
        if (total > 0) {
          result.userPercent = Math.round((stat.utime / total) * 10000) / 100;
          result.systemPercent = Math.round((stat.stime / total) * 10000) / 100;
        }
      }
      return result;
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

  private parseProcStat(statLine: string): { utime: number; stime: number; minflt: number; majflt: number } | null {
    if (!statLine || statLine.length < 10) return null;
    const rparen = statLine.indexOf(')');
    if (rparen < 0) return null;
    const after = statLine.slice(rparen + 1).trim().split(/\s+/);
    if (after.length < 13) return null;
    return {
      minflt: parseInt(after[7] ?? '0', 10),
      majflt: parseInt(after[9] ?? '0', 10),
      utime: parseInt(after[11] ?? '0', 10),
      stime: parseInt(after[12] ?? '0', 10),
    };
  }
}
