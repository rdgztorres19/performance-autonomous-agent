import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class LoadAverageTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Load Average (per CPU)',
        unit: '',
        slices: [
          { label: '1 min', field: 'loadPerCpu1m' },
          { label: '5 min', field: 'loadPerCpu5m' },
          { label: '15 min', field: 'loadPerCpu15m' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'load_average',
      description:
        'Collects system load averages (1m, 5m, 15m) and number of running/total processes from /proc/loadavg. Also retrieves CPU count for context.',
      category: ToolCategory.CPU,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return 'cat /proc/loadavg && nproc';
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const lines = stdout.trim().split('\n');
    const loadParts = (lines[0] ?? '').split(/\s+/);
    const cpuCount = parseInt(lines[1] ?? '1', 10);

    const load1m = parseFloat(loadParts[0] ?? '0');
    const load5m = parseFloat(loadParts[1] ?? '0');
    const load15m = parseFloat(loadParts[2] ?? '0');

    const processParts = (loadParts[3] ?? '0/0').split('/');
    const runningProcesses = parseInt(processParts[0] ?? '0', 10);
    const totalProcesses = parseInt(processParts[1] ?? '0', 10);

    return {
      load1m,
      load5m,
      load15m,
      cpuCount,
      loadPerCpu1m: Math.round((load1m / cpuCount) * 100) / 100,
      loadPerCpu5m: Math.round((load5m / cpuCount) * 100) / 100,
      loadPerCpu15m: Math.round((load15m / cpuCount) * 100) / 100,
      runningProcesses,
      totalProcesses,
      isOverloaded: load1m > cpuCount,
    };
  }
}
