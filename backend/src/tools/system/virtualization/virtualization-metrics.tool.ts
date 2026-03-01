import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class VirtualizationMetricsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Virtualization Metrics',
        unit: '',
        slices: [
          { label: 'Steal %', field: 'stealPercent' },
          { label: 'Throttled Count', field: 'throttledCount' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'virtualization_metrics',
      description:
        'Collects virtualization metrics: CPU steal time, cgroup limits, container detection, and resource throttling from /proc/stat and cgroup filesystem.',
      category: ToolCategory.VIRTUALIZATION,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'head -1 /proc/stat',
      'echo "---SEP---"',
      'cat /proc/1/cgroup 2>/dev/null || echo "cgroup_unavailable"',
      'echo "---SEP---"',
      'cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us 2>/dev/null || cat /sys/fs/cgroup/cpu.max 2>/dev/null || echo "quota_unavailable"',
      'echo "---SEP---"',
      'cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || cat /sys/fs/cgroup/memory.max 2>/dev/null || echo "memlimit_unavailable"',
      'echo "---SEP---"',
      'cat /sys/fs/cgroup/cpu/cpu.stat 2>/dev/null || cat /sys/fs/cgroup/cpu.stat 2>/dev/null || echo "cpustat_unavailable"',
      'echo "---SEP---"',
      'systemd-detect-virt 2>/dev/null || echo "detect_unavailable"',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());

    const cpuLine = parts[0] ?? '';
    const cpuValues = cpuLine.replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const stealTime = cpuValues[7] ?? 0;
    const totalTime = cpuValues.reduce((a, b) => a + b, 0);
    const stealPercent = totalTime > 0 ? Math.round((stealTime / totalTime) * 10000) / 100 : 0;

    const cgroupRaw = parts[1] ?? '';
    const isContainer = cgroupRaw.includes('docker') || cgroupRaw.includes('kubepods') || cgroupRaw.includes('containerd');

    const quotaRaw = parts[2] ?? '';
    let cpuQuota: string | number = 'unlimited';
    if (!quotaRaw.includes('unavailable')) {
      const quotaVal = parseInt(quotaRaw.split(/\s+/)[0], 10);
      if (quotaVal > 0) cpuQuota = quotaVal;
    }

    const memLimitRaw = parts[3] ?? '';
    let memoryLimitMb: string | number = 'unlimited';
    if (!memLimitRaw.includes('unavailable')) {
      const memVal = parseInt(memLimitRaw, 10);
      if (memVal > 0 && memVal < 9223372036854771712) {
        memoryLimitMb = Math.round(memVal / 1024 / 1024);
      }
    }

    const cpuStatRaw = parts[4] ?? '';
    let throttledCount = 0;
    let throttledTimeNs = 0;
    if (!cpuStatRaw.includes('unavailable')) {
      for (const line of cpuStatRaw.split('\n')) {
        if (line.includes('nr_throttled')) throttledCount = parseInt(line.split(/\s+/)[1] ?? '0', 10);
        if (line.includes('throttled_time') || line.includes('throttled_usec'))
          throttledTimeNs = parseInt(line.split(/\s+/)[1] ?? '0', 10);
      }
    }

    const virtType = parts[5] ?? 'detect_unavailable';

    return {
      stealPercent,
      isContainer,
      virtualizationType: virtType.includes('unavailable') ? 'unknown' : virtType,
      cpuQuota,
      memoryLimitMb,
      throttledCount,
      throttledTimeNs,
    };
  }
}
