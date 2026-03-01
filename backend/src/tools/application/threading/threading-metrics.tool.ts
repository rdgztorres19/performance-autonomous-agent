import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class ThreadingMetricsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'donut',
        title: 'Thread States',
        unit: 'count',
        dynamicMapField: 'states',
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'threading_metrics',
      description:
        'Collects per-process threading metrics: thread count, thread states (R/S/D/Z), thread IDs from /proc/<pid>/task.',
      category: ToolCategory.APPLICATION_THREADING,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Process ID to inspect threads for',
          type: 'number',
          required: true,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = Number(params['pid']);
    return [
      `ls /proc/${pid}/task 2>/dev/null | wc -l`,
      'echo "---SEP---"',
      `for tid in $(ls /proc/${pid}/task 2>/dev/null | head -100); do cat /proc/${pid}/task/$tid/stat 2>/dev/null | awk '{print $1, $3}'; done`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());

    const threadCount = parseInt(parts[0] ?? '0', 10);
    const stateCounts: Record<string, number> = {
      running: 0,
      sleeping: 0,
      diskSleep: 0,
      zombie: 0,
      stopped: 0,
      other: 0,
    };

    const threadLines = (parts[1] ?? '').split('\n').filter(Boolean);
    for (const line of threadLines) {
      const [, state] = line.split(/\s+/);
      switch (state) {
        case 'R':
          stateCounts['running']++;
          break;
        case 'S':
          stateCounts['sleeping']++;
          break;
        case 'D':
          stateCounts['diskSleep']++;
          break;
        case 'Z':
          stateCounts['zombie']++;
          break;
        case 'T':
          stateCounts['stopped']++;
          break;
        default:
          stateCounts['other']++;
          break;
      }
    }

    return {
      threadCount,
      states: stateCounts,
      hasDiskSleepThreads: stateCounts['diskSleep'] > 0,
      hasZombieThreads: stateCounts['zombie'] > 0,
    };
  }
}
