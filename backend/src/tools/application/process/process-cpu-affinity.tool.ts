import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

/**
 * Collects CPU affinity for a process using taskset (util-linux).
 * taskset -p returns the current affinity mask (hex or list of CPUs).
 */
export class ProcessCpuAffinityTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'process_cpu_affinity',
      description:
        'Collects CPU affinity mask for a process. Shows which CPUs the process is allowed to run on. Uses taskset (util-linux).',
      category: ToolCategory.APPLICATION_CPU,
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
    return `taskset -p ${pid} 2>/dev/null || echo "taskset_unavailable"`;
  }

  protected parseOutput(stdout: string, stderr: string): Record<string, unknown> {
    const combined = `${stdout} ${stderr}`;
    if (combined.includes('taskset_unavailable')) {
      return { error: 'taskset not available (util-linux)' };
    }

    const match = combined.match(/current affinity mask:\s*([\da-fA-Fx,-\s]+)/);
    if (!match) {
      return { error: 'Could not parse taskset output' };
    }

    const mask = match[1].trim();
    const cpuList = this.parseMask(mask);

    return {
      affinityMask: mask,
      cpus: cpuList,
      cpuCount: cpuList.length,
    };
  }

  private parseMask(mask: string): number[] {
    const m = mask.trim().toLowerCase();
    if (m.includes(',') || m.includes('-')) {
      const cpus: number[] = [];
      for (const part of m.split(',')) {
        const range = part.trim().split('-');
        if (range.length === 2) {
          const lo = parseInt(range[0], 10);
          const hi = parseInt(range[1], 10);
          for (let i = lo; i <= hi; i++) cpus.push(i);
        } else {
          const n = parseInt(part, 10);
          if (!isNaN(n)) cpus.push(n);
        }
      }
      return cpus;
    }
    const hex = m.startsWith('0x') ? m : `0x${m}`;
    const val = parseInt(hex, 16);
    if (isNaN(val)) return [];
    const cpus: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (val & (1 << i)) cpus.push(i);
    }
    return cpus;
  }
}
