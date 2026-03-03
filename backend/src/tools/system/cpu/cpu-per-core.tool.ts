import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class CpuPerCoreTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'CPU % per Core',
        unit: '%',
        arrayField: 'cores',
        labelField: 'core',
        valueFields: [
          { field: 'userPercent', label: 'User' },
          { field: 'systemPercent', label: 'System' },
          { field: 'idlePercent', label: 'Idle' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'cpu_per_core',
      description:
        'Collects CPU utilization per core (user, system, idle, iowait) from /proc/stat with two samples. Equivalent to mpstat -P ALL but using only /proc.',
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
    return `grep '^cpu[0-9]' /proc/stat && sleep ${interval} && echo '---SEP---' && grep '^cpu[0-9]' /proc/stat`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [first, second] = stdout.split('---SEP---').map((s) => s.trim());
    if (!first || !second) return { error: 'Insufficient samples from /proc/stat' };

    const parseCores = (text: string) => {
      const cores: Record<string, number[]> = {};
      for (const line of text.split('\n')) {
        const match = line.match(/^cpu(\d+)\s+(.+)$/);
        if (!match) continue;
        const coreId = match[1];
        const values = match[2].trim().split(/\s+/).map(Number);
        cores[`cpu${coreId}`] = [
          values[0] ?? 0, // user
          values[1] ?? 0, // nice
          values[2] ?? 0, // system
          values[3] ?? 0, // idle
          values[4] ?? 0, // iowait
          values[5] ?? 0, // irq
          values[6] ?? 0, // softirq
          values[7] ?? 0, // steal
        ];
      }
      return cores;
    };

    const c1 = parseCores(first);
    const c2 = parseCores(second);
    const cores: Record<string, unknown>[] = [];

    for (const coreId of Object.keys(c2).sort()) {
      const v1 = c1[coreId];
      const v2 = c2[coreId];
      if (!v1 || !v2) continue;

      const user = v2[0] - v1[0];
      const nice = v2[1] - v1[1];
      const system = v2[2] - v1[2];
      const idle = v2[3] - v1[3];
      const iowait = v2[4] - v1[4];
      const irq = v2[5] - v1[5];
      const softirq = v2[6] - v1[6];
      const steal = v2[7] - v1[7];

      const total = user + nice + system + idle + iowait + irq + softirq + steal;
      if (total === 0) continue;

      const pct = (v: number) => Math.round((v / total) * 10000) / 100;

      cores.push({
        core: coreId,
        userPercent: pct(user),
        nicePercent: pct(nice),
        systemPercent: pct(system),
        idlePercent: pct(idle),
        iowaitPercent: pct(iowait),
        irqPercent: pct(irq),
        softirqPercent: pct(softirq),
        stealPercent: pct(steal),
        usedPercent: pct(user + nice + system + irq + softirq + steal),
      });
    }

    return { cores, coreCount: cores.length };
  }
}
