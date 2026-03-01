import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class MemoryPressureTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Memory Pressure',
        unit: 'count',
        slices: [
          { label: 'Minor Faults', field: 'pageFaultsMinor' },
          { label: 'Major Faults', field: 'pageFaultsMajor' },
          { label: 'Swap In', field: 'swapIn' },
          { label: 'Swap Out', field: 'swapOut' },
          { label: 'OOM Kills', field: 'oomKills' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'memory_pressure',
      description:
        'Collects memory pressure metrics: swap in/out rates, page faults (minor/major), PSI memory pressure, and OOM kill count from /proc/vmstat and /proc/pressure/memory.',
      category: ToolCategory.MEMORY,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'grep -E "^(pgfault|pgmajfault|pswpin|pswpout|oom_kill)" /proc/vmstat',
      'echo "---SEP---"',
      'cat /proc/pressure/memory 2>/dev/null || echo "psi_unavailable"',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [vmstatRaw, psiRaw] = stdout.split('---SEP---').map((s) => s.trim());

    const vmstat: Record<string, number> = {};
    for (const line of (vmstatRaw ?? '').split('\n')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) vmstat[parts[0]] = parseInt(parts[1], 10);
    }

    const result: Record<string, unknown> = {
      pageFaultsMinor: vmstat['pgfault'] ?? 0,
      pageFaultsMajor: vmstat['pgmajfault'] ?? 0,
      swapIn: vmstat['pswpin'] ?? 0,
      swapOut: vmstat['pswpout'] ?? 0,
      oomKills: vmstat['oom_kill'] ?? 0,
    };

    if (psiRaw && !psiRaw.includes('psi_unavailable')) {
      const parsePsi = (line: string) => {
        const avg10Match = line.match(/avg10=(\d+\.\d+)/);
        const avg60Match = line.match(/avg60=(\d+\.\d+)/);
        const avg300Match = line.match(/avg300=(\d+\.\d+)/);
        const totalMatch = line.match(/total=(\d+)/);
        return {
          avg10: parseFloat(avg10Match?.[1] ?? '0'),
          avg60: parseFloat(avg60Match?.[1] ?? '0'),
          avg300: parseFloat(avg300Match?.[1] ?? '0'),
          totalUs: parseInt(totalMatch?.[1] ?? '0', 10),
        };
      };

      const psiLines = psiRaw.split('\n');
      const someLine = psiLines.find((l) => l.startsWith('some'));
      const fullLine = psiLines.find((l) => l.startsWith('full'));

      result['psiAvailable'] = true;
      if (someLine) result['psiSome'] = parsePsi(someLine);
      if (fullLine) result['psiFull'] = parsePsi(fullLine);
    } else {
      result['psiAvailable'] = false;
    }

    return result;
  }
}
