import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

/**
 * Gathers per-process error indicators using OS-level commands:
 *   - Process signal history (segfaults, kills, OOM)
 *   - TCP error counters (retransmissions, resets, timeouts)
 *   - Socket errors per process
 *   - Core dump presence
 *   - Resource limit exhaustion (fd limits, memory limits)
 *   - Recent kernel messages related to process crashes
 */
export class ApplicationErrorsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Error Indicators',
        unit: 'count',
        slices: [
          { label: 'TCP Retransmits', field: 'summary.totalTcpRetransmits' },
          { label: 'Error Indicators', field: 'summary.errorIndicators' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'application_errors',
      description:
        'Collects per-process error indicators: TCP retransmissions and resets, socket errors, resource limit exhaustion (file descriptors, memory), recent OOM kills and segfaults from kernel log, core dumps. Covers error rate proxy, timeout indicators, and failed request signals.',
      category: ToolCategory.APPLICATION_ERRORS,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Process ID to check for errors. If omitted, shows system-wide application errors.',
          type: 'number',
          required: false,
        },
        {
          name: 'processName',
          description: 'Process name to search for in kernel logs (e.g. "nginx", "java")',
          type: 'string',
          required: false,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = params['pid'] as number | undefined;
    const processName = params['processName'] as string | undefined;

    if (pid) {
      return this.buildPerProcessCommand(pid);
    }
    return this.buildSystemWideCommand(processName);
  }

  private buildPerProcessCommand(pid: number): string {
    return [
      // TCP errors for this process's connections
      `ss -tip 2>/dev/null | grep -A1 "pid=${pid}," | grep -oP "(retrans:\\d+/\\d+|reordering:\\d+)" || echo "no_tcp_errors"`,
      'echo "---SECTION---"',
      // Socket error states (CLOSE-WAIT, TIME-WAIT excess, etc.)
      `ss -tnp 2>/dev/null | grep "pid=${pid}," | awk '{print $1}' | sort | uniq -c | sort -rn || echo "no_socket_states"`,
      'echo "---SECTION---"',
      // File descriptor usage vs limits
      `ls /proc/${pid}/fd 2>/dev/null | wc -l`,
      'echo "---SECTION---"',
      `cat /proc/${pid}/limits 2>/dev/null | grep "Max open files" || echo "limits_unavailable"`,
      'echo "---SECTION---"',
      // Memory limits (cgroup v2)
      `cat /proc/${pid}/cgroup 2>/dev/null | head -1`,
      'echo "---SECTION---"',
      // Check if process has received signals (from /proc/pid/status)
      `cat /proc/${pid}/status 2>/dev/null | grep -E "^(SigCgt|SigPnd|SigIgn|Name|State)" || echo "status_unavailable"`,
      'echo "---SECTION---"',
      // Recent kernel messages about this PID
      `dmesg 2>/dev/null | tail -500 | grep -i "\\[${pid}\\]\\|pid ${pid}" | tail -10 || echo "no_dmesg"`,
    ].join(' && ');
  }

  private buildSystemWideCommand(processName?: string): string {
    const nameFilter = processName ? `grep -i "${processName}"` : 'cat';
    return [
      // System-wide TCP error stats
      `cat /proc/net/snmp 2>/dev/null | grep -A1 "^Tcp:" || echo "snmp_unavailable"`,
      'echo "---SECTION---"',
      // Recent OOM kills
      `dmesg 2>/dev/null | tail -2000 | grep -i "oom\\|killed process\\|out of memory" | ${nameFilter} | tail -10 || echo "no_oom"`,
      'echo "---SECTION---"',
      // Recent segfaults
      `dmesg 2>/dev/null | tail -2000 | grep -i "segfault\\|general protection\\|traps:" | ${nameFilter} | tail -10 || echo "no_segfaults"`,
      'echo "---SECTION---"',
      // Core dumps
      `ls -lt /var/lib/systemd/coredump/ 2>/dev/null | head -5 || ls -lt /tmp/core* 2>/dev/null | head -5 || echo "no_coredumps"`,
      'echo "---SECTION---"',
      // Processes in D (uninterruptible sleep) state - often indicates I/O errors
      `ps aux 2>/dev/null | awk '$8 ~ /D/ {print}' | ${nameFilter} | head -10 || echo "no_d_state"`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const sections = stdout.split('---SECTION---').map((s) => s.trim());

    if (sections.length >= 7) {
      return this.parsePerProcessOutput(sections);
    }
    return this.parseSystemWideOutput(sections);
  }

  private parsePerProcessOutput(sections: string[]): Record<string, unknown> {
    const tcpErrors = this.parseTcpErrors(sections[0] ?? '');
    const socketStates = this.parseSocketStates(sections[1] ?? '');
    const fdCount = parseInt(sections[2] ?? '0', 10);
    const fdLimits = this.parseFdLimits(sections[3] ?? '');
    const cgroupInfo = sections[4] ?? '';
    const processStatus = this.parseProcessStatus(sections[5] ?? '');
    const kernelMessages = this.parseKernelMessages(sections[6] ?? '');

    const fdUsagePercent =
      fdLimits.softLimit > 0 ? Math.round((fdCount / fdLimits.softLimit) * 10000) / 100 : 0;

    return {
      tcpErrors,
      socketStates,
      fileDescriptors: {
        open: fdCount,
        softLimit: fdLimits.softLimit,
        hardLimit: fdLimits.hardLimit,
        usagePercent: fdUsagePercent,
        isNearLimit: fdUsagePercent > 80,
      },
      cgroup: cgroupInfo.includes('no_cgroup') ? null : cgroupInfo,
      process: processStatus,
      kernelMessages,
      summary: {
        totalTcpRetransmits: tcpErrors.totalRetransmits,
        hasCloseWaitLeaks: (socketStates['CLOSE-WAIT'] ?? 0) > 10,
        hasTimeWaitExcess: (socketStates['TIME-WAIT'] ?? 0) > 100,
        fdNearExhaustion: fdUsagePercent > 80,
        hasKernelErrors: kernelMessages.length > 0,
        errorIndicators: this.countErrorIndicators(
          tcpErrors.totalRetransmits,
          socketStates,
          fdUsagePercent,
          kernelMessages,
        ),
      },
    };
  }

  private parseSystemWideOutput(sections: string[]): Record<string, unknown> {
    const tcpStats = this.parseSnmpTcpStats(sections[0] ?? '');
    const oomEvents = this.parseLogLines(sections[1] ?? '', 'no_oom');
    const segfaults = this.parseLogLines(sections[2] ?? '', 'no_segfaults');
    const coredumps = this.parseLogLines(sections[3] ?? '', 'no_coredumps');
    const dStateProcesses = this.parseLogLines(sections[4] ?? '', 'no_d_state');

    return {
      tcpStats,
      oomEvents: { count: oomEvents.length, recent: oomEvents },
      segfaults: { count: segfaults.length, recent: segfaults },
      coredumps: { count: coredumps.length, recent: coredumps },
      dStateProcesses: { count: dStateProcesses.length, processes: dStateProcesses },
      summary: {
        hasOomKills: oomEvents.length > 0,
        hasSegfaults: segfaults.length > 0,
        hasCoredumps: coredumps.length > 0,
        hasDStateProcesses: dStateProcesses.length > 0,
        tcpRetransmitRate:
          tcpStats.outSegs > 0
            ? Math.round((tcpStats.retransSegs / tcpStats.outSegs) * 10000) / 100
            : 0,
      },
    };
  }

  private parseTcpErrors(raw: string): { totalRetransmits: number; details: string[] } {
    if (raw.includes('no_tcp_errors')) {
      return { totalRetransmits: 0, details: [] };
    }
    let totalRetransmits = 0;
    const details: string[] = [];
    const retransRegex = /retrans:\d+\/(\d+)/g;
    let match: RegExpExecArray | null;
    while ((match = retransRegex.exec(raw)) !== null) {
      totalRetransmits += parseInt(match[1], 10);
      details.push(match[0]);
    }
    return { totalRetransmits, details };
  }

  private parseSocketStates(raw: string): Record<string, number> {
    const states: Record<string, number> = {};
    if (raw.includes('no_socket_states')) return states;
    for (const line of raw.split('\n').filter(Boolean)) {
      const match = line.trim().match(/^\s*(\d+)\s+(.+)/);
      if (match) states[match[2].trim()] = parseInt(match[1], 10);
    }
    return states;
  }

  private parseFdLimits(raw: string): { softLimit: number; hardLimit: number } {
    if (raw.includes('limits_unavailable')) return { softLimit: 0, hardLimit: 0 };
    const match = raw.match(/(\d+)\s+(\d+)/);
    return {
      softLimit: match ? parseInt(match[1], 10) : 0,
      hardLimit: match ? parseInt(match[2], 10) : 0,
    };
  }

  private parseProcessStatus(raw: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (raw.includes('status_unavailable')) return result;
    for (const line of raw.split('\n')) {
      const match = line.match(/^(\w+):\s+(.+)$/);
      if (match) result[match[1]] = match[2].trim();
    }
    return result;
  }

  private parseKernelMessages(raw: string): string[] {
    if (raw.includes('no_dmesg')) return [];
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  private parseSnmpTcpStats(raw: string): {
    outSegs: number;
    retransSegs: number;
    inErrs: number;
    activeOpens: number;
    passiveOpens: number;
    attemptFails: number;
    estabResets: number;
  } {
    if (raw.includes('snmp_unavailable')) {
      return {
        outSegs: 0,
        retransSegs: 0,
        inErrs: 0,
        activeOpens: 0,
        passiveOpens: 0,
        attemptFails: 0,
        estabResets: 0,
      };
    }
    const lines = raw.split('\n').filter((l) => l.startsWith('Tcp:'));
    if (lines.length < 2) {
      return {
        outSegs: 0,
        retransSegs: 0,
        inErrs: 0,
        activeOpens: 0,
        passiveOpens: 0,
        attemptFails: 0,
        estabResets: 0,
      };
    }
    const keys = lines[0].split(/\s+/);
    const values = lines[1].split(/\s+/);
    const idx = (name: string) => {
      const i = keys.indexOf(name);
      return i >= 0 ? parseInt(values[i] ?? '0', 10) : 0;
    };
    return {
      outSegs: idx('OutSegs'),
      retransSegs: idx('RetransSegs'),
      inErrs: idx('InErrs'),
      activeOpens: idx('ActiveOpens'),
      passiveOpens: idx('PassiveOpens'),
      attemptFails: idx('AttemptFails'),
      estabResets: idx('EstabResets'),
    };
  }

  private parseLogLines(raw: string, emptyMarker: string): string[] {
    if (raw.includes(emptyMarker)) return [];
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  private countErrorIndicators(
    retransmits: number,
    socketStates: Record<string, number>,
    fdUsagePercent: number,
    kernelMessages: string[],
  ): number {
    let count = 0;
    if (retransmits > 0) count++;
    if ((socketStates['CLOSE-WAIT'] ?? 0) > 10) count++;
    if ((socketStates['TIME-WAIT'] ?? 0) > 100) count++;
    if (fdUsagePercent > 80) count++;
    if (kernelMessages.length > 0) count++;
    return count;
  }
}
