import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class ProcessMemoryTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'horizontalBar',
        title: 'Top Processes by Memory',
        unit: '%',
        arrayField: 'topProcesses',
        labelField: 'command',
        valueField: 'memPercent',
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'process_memory',
      description:
        'Collects per-process memory usage: RSS, VSZ, shared memory, memory maps summary. Shows top memory consumers or details for a specific PID.',
      category: ToolCategory.APPLICATION_MEMORY,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Specific process ID to inspect',
          type: 'number',
          required: false,
        },
        {
          name: 'topN',
          description: 'Number of top memory processes to show',
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
      return [
        `cat /proc/${pid}/status 2>/dev/null | grep -E "^(VmSize|VmRSS|VmSwap|VmPeak|VmData|VmStk|Threads|Name)"`,
        'echo "---SEP---"',
        `cat /proc/${pid}/stat 2>/dev/null || echo "stat_unavailable"`,
        'echo "---SEP---"',
        `cat /proc/${pid}/smaps_rollup 2>/dev/null || echo "smaps_unavailable"`,
      ].join(' && ');
    }
    return `ps aux --sort=-%mem | head -${topN + 1}`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    if (stdout.includes('---SEP---')) {
      const parts = stdout.split('---SEP---').map((s) => s.trim());
      const statusValues: Record<string, string> = {};

      for (const line of (parts[0] ?? '').split('\n')) {
        const match = line.match(/^(\w+):\s+(.+)$/);
        if (match) statusValues[match[1]] = match[2].trim();
      }

      const parseKb = (val: string | undefined) => parseInt((val ?? '0').replace(/\s*kB/, ''), 10);

      const result: Record<string, unknown> = {
        name: statusValues['Name'] ?? 'unknown',
        vmSizeKb: parseKb(statusValues['VmSize']),
        vmRssKb: parseKb(statusValues['VmRSS']),
        vmSwapKb: parseKb(statusValues['VmSwap']),
        vmPeakKb: parseKb(statusValues['VmPeak']),
        vmDataKb: parseKb(statusValues['VmData']),
        vmStackKb: parseKb(statusValues['VmStk']),
        threads: parseInt(statusValues['Threads'] ?? '0', 10),
        vmSizeMb: Math.round(parseKb(statusValues['VmSize']) / 1024),
        vmRssMb: Math.round(parseKb(statusValues['VmRSS']) / 1024),
      };

      const stat = this.parseProcStat(parts[1] ?? '');
      if (stat) {
        result.minflt = stat.minflt;
        result.majflt = stat.majflt;
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
        memPercent: parseFloat(cols[3]),
        vszKb: parseInt(cols[4], 10),
        rssKb: parseInt(cols[5], 10),
        rssMb: Math.round(parseInt(cols[5], 10) / 1024),
        command: cols.slice(10).join(' '),
      });
    }

    return { topProcesses: processes };
  }

  private parseProcStat(statLine: string): { minflt: number; majflt: number } | null {
    if (!statLine || statLine.includes('stat_unavailable')) return null;
    const rparen = statLine.indexOf(')');
    if (rparen < 0) return null;
    const after = statLine.slice(rparen + 1).trim().split(/\s+/);
    if (after.length < 10) return null;
    return {
      minflt: parseInt(after[7] ?? '0', 10),
      majflt: parseInt(after[9] ?? '0', 10),
    };
  }
}
