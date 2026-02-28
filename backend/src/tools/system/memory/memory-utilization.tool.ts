import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

export class MemoryUtilizationTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'memory_utilization',
      description:
        'Collects memory utilization: total, used, free, buffers, page cache, slab usage, available memory from /proc/meminfo.',
      category: ToolCategory.MEMORY,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return 'cat /proc/meminfo';
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const values: Record<string, number> = {};
    for (const line of stdout.split('\n')) {
      const match = line.match(/^(\w+):\s+(\d+)/);
      if (match) values[match[1]] = parseInt(match[2], 10);
    }

    const totalKb = values['MemTotal'] ?? 0;
    const freeKb = values['MemFree'] ?? 0;
    const availableKb = values['MemAvailable'] ?? totalKb;
    const buffersKb = values['Buffers'] ?? 0;
    const cachedKb = values['Cached'] ?? 0;
    const slabKb = values['Slab'] ?? 0;
    const swapTotalKb = values['SwapTotal'] ?? 0;
    const swapFreeKb = values['SwapFree'] ?? 0;

    const usedKb = totalKb - freeKb - buffersKb - cachedKb;
    const pct = (v: number) => (totalKb > 0 ? Math.round((v / totalKb) * 10000) / 100 : 0);

    return {
      totalMb: Math.round(totalKb / 1024),
      usedMb: Math.round(usedKb / 1024),
      freeMb: Math.round(freeKb / 1024),
      availableMb: Math.round(availableKb / 1024),
      buffersMb: Math.round(buffersKb / 1024),
      cachedMb: Math.round(cachedKb / 1024),
      slabMb: Math.round(slabKb / 1024),
      swapTotalMb: Math.round(swapTotalKb / 1024),
      swapUsedMb: Math.round((swapTotalKb - swapFreeKb) / 1024),
      usedPercent: pct(usedKb),
      availablePercent: pct(availableKb),
      swapUsedPercent: swapTotalKb > 0
        ? Math.round(((swapTotalKb - swapFreeKb) / swapTotalKb) * 10000) / 100
        : 0,
    };
  }
}
