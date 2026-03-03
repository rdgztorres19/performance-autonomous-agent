import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

/**
 * Collects per-thread memory (VmRSS, VmSize) from /proc/pid/task/tid/status.
 * Uses only /proc filesystem.
 */
export class ProcessThreadMemoryTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'horizontalBar',
        title: 'RSS by Thread',
        unit: 'kB',
        arrayField: 'threads',
        labelField: 'tid',
        valueField: 'vmRssKb',
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'process_thread_memory',
      description:
        'Collects per-thread memory usage: VmRSS, VmSize per thread from /proc/<pid>/task/<tid>/status.',
      category: ToolCategory.APPLICATION_MEMORY,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Process ID to inspect',
          type: 'number',
          required: true,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = Number(params['pid']);
    return `for tid in $(ls /proc/${pid}/task 2>/dev/null); do echo -n "TID=$tid "; cat /proc/${pid}/task/$tid/status 2>/dev/null | grep -E "^(VmRSS|VmSize|Name)" | tr '\\n' ' '; echo; done`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const threads: Record<string, unknown>[] = [];

    for (const line of stdout.split('\n').filter(Boolean)) {
      const tidMatch = line.match(/TID=(\d+)\s/);
      if (!tidMatch) continue;

      const tid = parseInt(tidMatch[1], 10);
      const vmRss = this.extractKb(line, 'VmRSS');
      const vmSize = this.extractKb(line, 'VmSize');
      const name = line.match(/Name:\s*(\S+)/)?.[1] ?? '';

      threads.push({
        tid,
        name,
        vmRssKb: vmRss,
        vmSizeKb: vmSize,
        vmRssMb: Math.round(vmRss / 1024),
        vmSizeMb: Math.round(vmSize / 1024),
      });
    }

    threads.sort((a, b) => (b.vmRssKb as number) - (a.vmRssKb as number));

    const totalRss = threads.reduce((s, t) => s + ((t.vmRssKb as number) ?? 0), 0);
    const totalSize = threads.reduce((s, t) => s + ((t.vmSizeKb as number) ?? 0), 0);

    return {
      threads,
      totalThreads: threads.length,
      totalVmRssKb: totalRss,
      totalVmSizeKb: totalSize,
      totalVmRssMb: Math.round(totalRss / 1024),
      totalVmSizeMb: Math.round(totalSize / 1024),
    };
  }

  private extractKb(line: string, key: string): number {
    const match = line.match(new RegExp(`${key}:\\s*(\\d+)\\s*kB`));
    return match ? parseInt(match[1], 10) : 0;
  }
}
