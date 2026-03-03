import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class CpuInterruptsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [
        {
          type: 'bar',
          title: 'Interrupts by CPU',
          unit: 'count',
          arrayField: 'perCpu',
          labelField: 'cpu',
          valueFields: [{ field: 'count', label: 'IRQs' }],
        },
        {
          type: 'bar',
          title: 'SoftIRQ by Type',
          unit: 'count',
          dynamicMapField: 'softirqByType',
        },
      ],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'cpu_interrupts',
      description:
        'Collects interrupts per CPU from /proc/interrupts and softirq breakdown (net_rx, net_tx, block, etc.) from /proc/softirqs. No mpstat required.',
      category: ToolCategory.CPU,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'cat /proc/interrupts',
      'echo "---SEP---"',
      'cat /proc/softirqs',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [interruptsRaw, softirqsRaw] = stdout.split('---SEP---').map((s) => s.trim());

    // Parse /proc/interrupts
    // First line: CPU0  CPU1  CPU2  ... (or CPU0   CPU1   CPU2)
    const intLines = (interruptsRaw ?? '').split('\n');
    const perCpu: Record<string, unknown>[] = [];
    let cpuCount = 0;

    if (intLines.length > 0) {
      const header = intLines[0];
      const cpuHeaders = header.split(/\s+/).filter((h) => h.startsWith('CPU'));
      cpuCount = cpuHeaders.length || 1;
      const cpuTotals: number[] = new Array(cpuCount).fill(0);

      for (let i = 1; i < intLines.length; i++) {
        const line = intLines[i];
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;
        // Column 0 is IRQ id (e.g. "0:", "NMI:"). Columns 1..N are CPU counts.
        for (let c = 0; c < cpuCount && c + 1 < parts.length; c++) {
          const raw = (parts[c + 1] ?? '').replace(/,/g, '');
          const val = parseInt(raw, 10);
          if (!Number.isNaN(val)) cpuTotals[c] += val;
        }
      }

      for (let c = 0; c < cpuCount; c++) {
        perCpu.push({ cpu: `CPU${c}`, count: cpuTotals[c] });
      }
    }

    // Parse /proc/softirqs
    const softirqByType: Record<string, number> = {};
    if (softirqsRaw) {
      const softLines = softirqsRaw.split('\n');
      for (const line of softLines) {
        const match = line.match(/^\s*(\w+):\s+(.+)$/);
        if (!match) continue;
        const type = match[1];
        const values = match[2].trim().split(/\s+/).map((v) => parseInt(v.replace(/,/g, ''), 10));
        const total = values.reduce((a, b) => (Number.isNaN(b) ? a : a + b), 0);
        softirqByType[type] = total;
      }
    }

    const totalInterrupts = perCpu.reduce((sum, p) => sum + ((p.count as number) ?? 0), 0);
    const totalSoftirqs = Object.values(softirqByType).reduce((a, b) => a + b, 0);

    return {
      perCpu,
      cpuCount,
      totalInterrupts,
      softirqByType,
      totalSoftirqs,
    };
  }
}
