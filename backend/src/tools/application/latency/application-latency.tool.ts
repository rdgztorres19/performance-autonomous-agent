import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

/**
 * Gathers per-process latency indicators using OS-level commands only:
 *   - TCP RTT and retransmission data via `ss -tip`
 *   - Socket receive/send queue depths (proxy for queue wait time)
 *   - Connection establishment latency via SYN-SENT count
 *
 * These are the best latency proxies available without
 * application-level instrumentation.
 */
export class ApplicationLatencyTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'TCP Latency Summary',
        unit: 'ms',
        slices: [
          { label: 'Avg RTT', field: 'summary.avgRttMs' },
          { label: 'Max RTT', field: 'summary.maxRttMs' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'application_latency',
      description:
        'Collects per-process latency indicators: TCP round-trip time (RTT), retransmissions, socket queue depths (recv-Q/send-Q), and connection states. Provides proxy metrics for response time, queue wait time, and service time without requiring application instrumentation.',
      category: ToolCategory.APPLICATION_LATENCY,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Process ID to inspect latency for',
          type: 'number',
          required: true,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = Number(params['pid']);
    return [
      // TCP connections with extended info (RTT, retransmits, cwnd)
      `ss -tip state established '( sport != :22 and dport != :22 )' 2>/dev/null | grep -A1 "pid=${pid}," || echo "no_connections"`,
      'echo "---SECTION---"',
      // All socket states for this process (queue depths)
      `ss -tnp 2>/dev/null | grep "pid=${pid}," || echo "no_sockets"`,
      'echo "---SECTION---"',
      // Connection states summary
      `ss -tnp 2>/dev/null | grep "pid=${pid}," | awk '{print $1}' | sort | uniq -c | sort -rn || echo "no_states"`,
      'echo "---SECTION---"',
      // Syscall latency snapshot via /proc (voluntary/involuntary context switches)
      `cat /proc/${pid}/status 2>/dev/null | grep -E "^(voluntary_ctxt_switches|nonvoluntary_ctxt_switches)" || echo "status_unavailable"`,
      'echo "---SECTION---"',
      // Schedule latency from /proc/schedstat
      `cat /proc/${pid}/schedstat 2>/dev/null || echo "schedstat_unavailable"`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const sections = stdout.split('---SECTION---').map((s) => s.trim());

    const tcpInfo = this.parseTcpInfo(sections[0] ?? '');
    const socketQueues = this.parseSocketQueues(sections[1] ?? '');
    const connectionStates = this.parseConnectionStates(sections[2] ?? '');
    const contextSwitches = this.parseContextSwitches(sections[3] ?? '');
    const schedLatency = this.parseSchedstat(sections[4] ?? '');

    return {
      tcp: tcpInfo,
      socketQueues,
      connectionStates,
      contextSwitches,
      scheduling: schedLatency,
      summary: {
        avgRttMs: tcpInfo.avgRttMs,
        maxRttMs: tcpInfo.maxRttMs,
        totalRetransmits: tcpInfo.totalRetransmits,
        connectionsWithHighLatency: tcpInfo.highLatencyCount,
        totalQueuedBytes: socketQueues.totalRecvQ + socketQueues.totalSendQ,
        hasQueueBackpressure: socketQueues.totalSendQ > 0,
      },
    };
  }

  private parseTcpInfo(raw: string): {
    avgRttMs: number;
    maxRttMs: number;
    totalRetransmits: number;
    highLatencyCount: number;
    connections: Record<string, unknown>[];
  } {
    if (raw.includes('no_connections')) {
      return { avgRttMs: 0, maxRttMs: 0, totalRetransmits: 0, highLatencyCount: 0, connections: [] };
    }

    const connections: Record<string, unknown>[] = [];
    let totalRtt = 0;
    let maxRtt = 0;
    let totalRetransmits = 0;
    let highLatencyCount = 0;
    let rttCount = 0;

    const rttRegex = /rtt:([\d.]+)\/([\d.]+)/g;
    const retransRegex = /retrans:\d+\/(\d+)/g;
    const cwndRegex = /cwnd:(\d+)/g;

    let match: RegExpExecArray | null;

    while ((match = rttRegex.exec(raw)) !== null) {
      const rtt = parseFloat(match[1]);
      const rttVar = parseFloat(match[2]);
      totalRtt += rtt;
      if (rtt > maxRtt) maxRtt = rtt;
      if (rtt > 100) highLatencyCount++;
      rttCount++;
      connections.push({ rttMs: rtt, rttVarMs: rttVar });
    }

    while ((match = retransRegex.exec(raw)) !== null) {
      totalRetransmits += parseInt(match[1], 10);
    }

    while ((match = cwndRegex.exec(raw)) !== null) {
      const idx = connections.length - 1;
      if (idx >= 0) {
        connections[idx]['cwnd'] = parseInt(match[1], 10);
      }
    }

    return {
      avgRttMs: rttCount > 0 ? Math.round((totalRtt / rttCount) * 100) / 100 : 0,
      maxRttMs: Math.round(maxRtt * 100) / 100,
      totalRetransmits,
      highLatencyCount,
      connections,
    };
  }

  private parseSocketQueues(raw: string): {
    totalRecvQ: number;
    totalSendQ: number;
    maxRecvQ: number;
    maxSendQ: number;
    socketsWithBacklog: number;
  } {
    if (raw.includes('no_sockets')) {
      return { totalRecvQ: 0, totalSendQ: 0, maxRecvQ: 0, maxSendQ: 0, socketsWithBacklog: 0 };
    }

    let totalRecvQ = 0;
    let totalSendQ = 0;
    let maxRecvQ = 0;
    let maxSendQ = 0;
    let socketsWithBacklog = 0;

    for (const line of raw.split('\n')) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 5) continue;
      const recvQ = parseInt(cols[1], 10);
      const sendQ = parseInt(cols[2], 10);
      if (isNaN(recvQ) || isNaN(sendQ)) continue;

      totalRecvQ += recvQ;
      totalSendQ += sendQ;
      if (recvQ > maxRecvQ) maxRecvQ = recvQ;
      if (sendQ > maxSendQ) maxSendQ = sendQ;
      if (recvQ > 0 || sendQ > 0) socketsWithBacklog++;
    }

    return { totalRecvQ, totalSendQ, maxRecvQ, maxSendQ, socketsWithBacklog };
  }

  private parseConnectionStates(raw: string): Record<string, number> {
    const states: Record<string, number> = {};
    if (raw.includes('no_states')) return states;

    for (const line of raw.split('\n').filter(Boolean)) {
      const match = line.trim().match(/^\s*(\d+)\s+(.+)/);
      if (match) {
        states[match[2].trim()] = parseInt(match[1], 10);
      }
    }
    return states;
  }

  private parseContextSwitches(raw: string): {
    voluntary: number;
    involuntary: number;
  } {
    if (raw.includes('status_unavailable')) {
      return { voluntary: 0, involuntary: 0 };
    }

    let voluntary = 0;
    let involuntary = 0;
    for (const line of raw.split('\n')) {
      const match = line.match(/^(\w+):\s+(\d+)/);
      if (!match) continue;
      if (match[1] === 'voluntary_ctxt_switches') voluntary = parseInt(match[2], 10);
      if (match[1] === 'nonvoluntary_ctxt_switches') involuntary = parseInt(match[2], 10);
    }
    return { voluntary, involuntary };
  }

  private parseSchedstat(raw: string): {
    cpuTimeNs: number;
    waitTimeNs: number;
    timeslices: number;
  } {
    if (raw.includes('schedstat_unavailable')) {
      return { cpuTimeNs: 0, waitTimeNs: 0, timeslices: 0 };
    }
    const parts = raw.trim().split(/\s+/);
    return {
      cpuTimeNs: parseInt(parts[0] ?? '0', 10),
      waitTimeNs: parseInt(parts[1] ?? '0', 10),
      timeslices: parseInt(parts[2] ?? '0', 10),
    };
  }
}
