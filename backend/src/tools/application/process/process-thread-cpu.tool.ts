import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

/**
 * Collects per-thread CPU metrics using only /proc and ps:
 * - CPU % per thread (from /proc/pid/task/tid/stat, two samples)
 * - CPU (PSR) where each thread is running
 * - User vs system time per thread
 */
export class ProcessThreadCpuTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'horizontalBar',
        title: 'CPU % by Thread',
        unit: '%',
        arrayField: 'threads',
        labelField: 'tid',
        valueField: 'cpuPercent',
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'process_thread_cpu',
      description:
        'Collects per-thread CPU usage: CPU% per thread, CPU core (PSR) where each thread runs, user/system time. Uses /proc/<pid>/task and ps -eLo. Two samples for rate calculation.',
      category: ToolCategory.APPLICATION_THREADING,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Process ID to inspect',
          type: 'number',
          required: true,
        },
        {
          name: 'sampleIntervalMs',
          description: 'Interval between two samples in milliseconds',
          type: 'number',
          required: false,
          defaultValue: 500,
        },
      ],
    };
  }

  private sampleIntervalSec = 0.5;

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = Number(params['pid']);
    this.sampleIntervalSec = Math.max(0.1, Number(params['sampleIntervalMs'] ?? 500) / 1000);
    return [
      `ps -eLo pid,tid,psr,comm -p ${pid} 2>/dev/null || echo "ps_unavailable"`,
      'echo "---SEP---"',
      `for tid in $(ls /proc/${pid}/task 2>/dev/null); do echo -n "$tid "; cat /proc/${pid}/task/$tid/stat 2>/dev/null | awk '{print $14, $15}'; done`,
      `sleep ${this.sampleIntervalSec}`,
      'echo "---SEP---"',
      `for tid in $(ls /proc/${pid}/task 2>/dev/null); do echo -n "$tid "; cat /proc/${pid}/task/$tid/stat 2>/dev/null | awk '{print $14, $15}'; done`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());
    if (parts.length < 3) return { error: 'Insufficient data' };

    const psRaw = parts[0] ?? '';
    const sample1 = this.parseThreadStats(parts[1] ?? '');
    const sample2 = this.parseThreadStats(parts[2] ?? '');

    if (psRaw.includes('ps_unavailable')) {
      return { error: 'ps -eLo not available' };
    }

    const psrMap = this.parsePs(psRaw);
    const threads: Record<string, unknown>[] = [];
    const tickToSec = 1 / 100; // CLK_TCK usually 100

    for (const tid of Object.keys(sample2)) {
      const s1 = sample1[tid];
      const s2 = sample2[tid];
      if (!s1 || !s2) continue;

      const utimeDelta = s2.utime - s1.utime;
      const stimeDelta = s2.stime - s1.stime;
      const totalDelta = utimeDelta + stimeDelta;

      const cpuPercent = totalDelta > 0 && this.sampleIntervalSec > 0
        ? Math.round((totalDelta * tickToSec) / this.sampleIntervalSec * 10000) / 100
        : 0;

      const totalTicks = s2.utime + s2.stime;
      const userPercent = totalTicks > 0
        ? Math.round((s2.utime / totalTicks) * 10000) / 100
        : 0;
      const systemPercent = totalTicks > 0
        ? Math.round((s2.stime / totalTicks) * 10000) / 100
        : 0;

      threads.push({
        tid: parseInt(tid, 10),
        cpuPercent,
        psr: psrMap[tid] ?? -1,
        utimeTicks: s2.utime,
        stimeTicks: s2.stime,
        userPercent,
        systemPercent,
      });
    }

    threads.sort((a, b) => (b.cpuPercent as number) - (a.cpuPercent as number));

    return {
      threads,
      totalThreads: threads.length,
      highestCpuThread: threads[0] ? (threads[0] as Record<string, unknown>).tid : null,
    };
  }

  private parseThreadStats(raw: string): Record<string, { utime: number; stime: number }> {
    const result: Record<string, { utime: number; stime: number }> = {};
    for (const line of raw.split('\n').filter(Boolean)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length >= 3) {
        const tid = cols[0];
        const utime = parseInt(cols[1] ?? '0', 10);
        const stime = parseInt(cols[2] ?? '0', 10);
        result[tid] = { utime, stime };
      }
    }
    return result;
  }

  private parsePs(raw: string): Record<string, number> {
    const result: Record<string, number> = {};
    const lines = raw.split('\n').filter(Boolean);
    for (const line of lines.slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length >= 3) {
        const tid = cols[1];
        const psr = parseInt(cols[2] ?? '-1', 10);
        result[tid] = psr;
      }
    }
    return result;
  }
}
