import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class CpuSaturationTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'CPU Saturation Metrics',
        unit: '/sec',
        slices: [
          { label: 'Context Switches', field: 'contextSwitchesPerSec' },
          { label: 'Interrupts', field: 'interruptsPerSec' },
          { label: 'Soft IRQs', field: 'softirqsPerSec' },
          { label: 'Run Queue', field: 'runQueueLength' },
          { label: 'Blocked', field: 'blockedProcesses' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'cpu_saturation',
      description:
        'Collects CPU saturation metrics: context switches/sec, interrupts/sec, softirqs/sec, and run queue length. Uses /proc/stat with two samples.',
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
    return [
      `grep -E '^(ctxt|intr|softirq|procs_running|procs_blocked)' /proc/stat`,
      `sleep ${interval}`,
      `echo '---SEPARATOR---'`,
      `grep -E '^(ctxt|intr|softirq|procs_running|procs_blocked)' /proc/stat`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [first, second] = stdout.split('---SEPARATOR---').map((s) => s.trim());
    if (!first || !second) return { error: 'Insufficient samples' };

    const parseSection = (text: string) => {
      const lines = text.split('\n');
      const result: Record<string, number> = {};
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const key = parts[0];
        if (key === 'ctxt') result['contextSwitches'] = parseInt(parts[1] ?? '0', 10);
        else if (key === 'intr') result['interrupts'] = parseInt(parts[1] ?? '0', 10);
        else if (key === 'softirq') result['softirqs'] = parseInt(parts[1] ?? '0', 10);
        else if (key === 'procs_running') result['procsRunning'] = parseInt(parts[1] ?? '0', 10);
        else if (key === 'procs_blocked') result['procsBlocked'] = parseInt(parts[1] ?? '0', 10);
      }
      return result;
    };

    const s1 = parseSection(first);
    const s2 = parseSection(second);

    return {
      contextSwitchesPerSec: (s2['contextSwitches'] ?? 0) - (s1['contextSwitches'] ?? 0),
      interruptsPerSec: (s2['interrupts'] ?? 0) - (s1['interrupts'] ?? 0),
      softirqsPerSec: (s2['softirqs'] ?? 0) - (s1['softirqs'] ?? 0),
      runQueueLength: s2['procsRunning'] ?? 0,
      blockedProcesses: s2['procsBlocked'] ?? 0,
    };
  }
}
