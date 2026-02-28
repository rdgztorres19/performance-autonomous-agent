import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

export class CpuUtilizationTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'cpu_utilization',
      description:
        'Collects CPU utilization metrics including user, system, idle, iowait, steal, nice, irq, and softirq percentages. Reads from /proc/stat with two samples to calculate actual usage.',
      category: ToolCategory.CPU,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
      parameters: [
        {
          name: 'sampleIntervalMs',
          description: 'Interval between two samples in milliseconds',
          type: 'number',
          required: false,
          defaultValue: 1000,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const interval = Number(params['sampleIntervalMs'] ?? 1000) / 1000;
    return `cat /proc/stat | head -1 && sleep ${interval} && cat /proc/stat | head -1`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) {
      return { error: 'Insufficient samples from /proc/stat' };
    }

    const parse = (line: string) => {
      const parts = line.replace(/^cpu\s+/, '').trim().split(/\s+/).map(Number);
      return {
        user: parts[0] ?? 0,
        nice: parts[1] ?? 0,
        system: parts[2] ?? 0,
        idle: parts[3] ?? 0,
        iowait: parts[4] ?? 0,
        irq: parts[5] ?? 0,
        softirq: parts[6] ?? 0,
        steal: parts[7] ?? 0,
      };
    };

    const first = parse(lines[0]);
    const second = parse(lines[1]);

    const diff = {
      user: second.user - first.user,
      nice: second.nice - first.nice,
      system: second.system - first.system,
      idle: second.idle - first.idle,
      iowait: second.iowait - first.iowait,
      irq: second.irq - first.irq,
      softirq: second.softirq - first.softirq,
      steal: second.steal - first.steal,
    };

    const total = Object.values(diff).reduce((a, b) => a + b, 0);
    if (total === 0) return { error: 'No CPU time difference between samples' };

    const pct = (v: number) => Math.round((v / total) * 10000) / 100;

    return {
      userPercent: pct(diff.user),
      nicePercent: pct(diff.nice),
      systemPercent: pct(diff.system),
      idlePercent: pct(diff.idle),
      iowaitPercent: pct(diff.iowait),
      irqPercent: pct(diff.irq),
      softirqPercent: pct(diff.softirq),
      stealPercent: pct(diff.steal),
      totalUsedPercent: pct(total - diff.idle),
    };
  }
}
