import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

/**
 * Detects the runtime type of a process and collects runtime-specific metrics:
 *
 * JVM (Java/Kotlin/Scala):
 *   - GC pauses and frequency via jstat (if available)
 *   - Heap/metaspace usage via jcmd or /proc
 *   - Thread dump summary via jstack
 *   - JVM flags
 *
 * Node.js:
 *   - Heap size and RSS from /proc/<pid>/status
 *   - Event loop proxy via voluntary context switches rate
 *   - Open handles (file descriptors)
 *   - V8 flags from /proc/<pid>/cmdline
 *
 * Python:
 *   - Memory allocation from /proc/<pid>/status
 *   - Thread count (GIL contention proxy)
 *   - Blocking I/O proxy via D-state threads
 *   - Python version and flags from /proc/<pid>/cmdline
 *
 * Falls back to generic metrics if runtime cannot be determined.
 */
export class RuntimeSpecificTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'runtime_specific',
      description:
        'Detects the runtime type of a process (JVM, Node.js, Python, or generic) and collects runtime-specific metrics. For JVM: GC stats, heap/metaspace, safepoints, thread dump. For Node.js: heap size, event loop lag proxy, V8 flags. For Python: GIL contention proxy, memory allocation, blocking I/O. Uses jstat/jcmd/jstack when available, falls back to /proc filesystem.',
      category: ToolCategory.RUNTIME_SPECIFIC,
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
    return [
      // Detect runtime via /proc/pid/cmdline and /proc/pid/exe
      `cat /proc/${pid}/cmdline 2>/dev/null | tr '\\0' ' ' || echo "cmdline_unavailable"`,
      'echo "---DETECT---"',
      `readlink /proc/${pid}/exe 2>/dev/null || echo "exe_unavailable"`,
      'echo "---DETECT---"',
      // Common metrics regardless of runtime
      `cat /proc/${pid}/status 2>/dev/null | grep -E "^(Name|VmSize|VmRSS|VmSwap|VmPeak|VmData|Threads)" || echo "status_unavailable"`,
      'echo "---DETECT---"',
      // JVM: try jstat
      `jstat -gc ${pid} 2>/dev/null || echo "jstat_unavailable"`,
      'echo "---DETECT---"',
      // JVM: try jcmd for heap info
      `jcmd ${pid} VM.flags 2>/dev/null | head -5 || echo "jcmd_unavailable"`,
      'echo "---DETECT---"',
      // JVM: GC log summary or jstat -gcutil
      `jstat -gcutil ${pid} 2>/dev/null || echo "jstat_gcutil_unavailable"`,
      'echo "---DETECT---"',
      // Thread states for all runtimes
      `for tid in $(ls /proc/${pid}/task 2>/dev/null | head -200); do cat /proc/${pid}/task/$tid/stat 2>/dev/null | awk '{print $3}'; done 2>/dev/null | sort | uniq -c | sort -rn || echo "threads_unavailable"`,
      'echo "---DETECT---"',
      // Schedstat for context switch rate (event loop lag proxy)
      `cat /proc/${pid}/schedstat 2>/dev/null || echo "schedstat_unavailable"`,
      'echo "---DETECT---"',
      // Context switches
      `cat /proc/${pid}/status 2>/dev/null | grep -E "^(voluntary_ctxt_switches|nonvoluntary_ctxt_switches)" || echo "ctxt_unavailable"`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const sections = stdout.split('---DETECT---').map((s) => s.trim());

    const cmdline = sections[0] ?? '';
    const exePath = sections[1] ?? '';
    const procStatus = this.parseProcStatus(sections[2] ?? '');
    const jstatGc = sections[3] ?? '';
    const jcmdFlags = sections[4] ?? '';
    const jstatGcutil = sections[5] ?? '';
    const threadStates = this.parseThreadStates(sections[6] ?? '');
    const schedstat = this.parseSchedstat(sections[7] ?? '');
    const ctxSwitches = this.parseCtxSwitches(sections[8] ?? '');

    const runtime = this.detectRuntime(cmdline, exePath);

    const base: Record<string, unknown> = {
      runtime,
      process: procStatus,
      threads: threadStates,
      scheduling: schedstat,
      contextSwitches: ctxSwitches,
    };

    switch (runtime) {
      case 'jvm':
        return { ...base, jvm: this.parseJvmMetrics(jstatGc, jcmdFlags, jstatGcutil, cmdline) };
      case 'nodejs':
        return { ...base, nodejs: this.parseNodeMetrics(cmdline, procStatus, ctxSwitches) };
      case 'python':
        return { ...base, python: this.parsePythonMetrics(cmdline, procStatus, threadStates) };
      default:
        return { ...base, generic: { cmdline: cmdline.substring(0, 200) } };
    }
  }

  private detectRuntime(cmdline: string, exePath: string): string {
    const combined = `${cmdline} ${exePath}`.toLowerCase();
    if (combined.includes('java') || combined.includes('jvm') || combined.includes('/jre/')) {
      return 'jvm';
    }
    if (combined.includes('node') || combined.includes('deno') || combined.includes('bun')) {
      return 'nodejs';
    }
    if (combined.includes('python') || combined.includes('python3') || combined.includes('gunicorn') || combined.includes('uvicorn')) {
      return 'python';
    }
    return 'unknown';
  }

  private parseProcStatus(raw: string): Record<string, unknown> {
    if (raw.includes('status_unavailable')) return {};
    const result: Record<string, unknown> = {};
    for (const line of raw.split('\n')) {
      const match = line.match(/^(\w+):\s+(.+)$/);
      if (!match) continue;
      const key = match[1];
      const val = match[2].trim();
      if (key === 'Threads') {
        result[key] = parseInt(val, 10);
      } else if (val.endsWith('kB')) {
        result[key] = parseInt(val, 10);
        result[`${key}Mb`] = Math.round(parseInt(val, 10) / 1024);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  private parseThreadStates(raw: string): Record<string, unknown> {
    if (raw.includes('threads_unavailable')) return { totalThreads: 0, states: {} };
    const states: Record<string, number> = {};
    let total = 0;
    for (const line of raw.split('\n').filter(Boolean)) {
      const match = line.trim().match(/^\s*(\d+)\s+(\S)/);
      if (!match) continue;
      const count = parseInt(match[1], 10);
      const stateCode = match[2];
      const stateName =
        stateCode === 'R' ? 'running' :
        stateCode === 'S' ? 'sleeping' :
        stateCode === 'D' ? 'diskSleep' :
        stateCode === 'Z' ? 'zombie' :
        stateCode === 'T' ? 'stopped' : 'other';
      states[stateName] = (states[stateName] ?? 0) + count;
      total += count;
    }
    return {
      totalThreads: total,
      states,
      hasDiskSleepThreads: (states['diskSleep'] ?? 0) > 0,
      hasZombieThreads: (states['zombie'] ?? 0) > 0,
    };
  }

  private parseSchedstat(raw: string): Record<string, unknown> {
    if (raw.includes('schedstat_unavailable')) return {};
    const parts = raw.trim().split(/\s+/);
    return {
      cpuTimeNs: parseInt(parts[0] ?? '0', 10),
      waitTimeNs: parseInt(parts[1] ?? '0', 10),
      timeslices: parseInt(parts[2] ?? '0', 10),
    };
  }

  private parseCtxSwitches(raw: string): Record<string, number> {
    if (raw.includes('ctxt_unavailable')) return { voluntary: 0, involuntary: 0 };
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

  private parseJvmMetrics(
    jstatGc: string,
    jcmdFlags: string,
    jstatGcutil: string,
    cmdline: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Parse jstat -gc output (two lines: header + values)
    if (!jstatGc.includes('jstat_unavailable')) {
      const lines = jstatGc.trim().split('\n');
      if (lines.length >= 2) {
        const keys = lines[0].trim().split(/\s+/);
        const vals = lines[1].trim().split(/\s+/);
        const gcData: Record<string, number> = {};
        for (let i = 0; i < keys.length; i++) {
          gcData[keys[i]] = parseFloat(vals[i] ?? '0');
        }
        result['gc'] = gcData;
        // Compute heap used/total from jstat columns
        const edenUsed = gcData['EU'] ?? 0;
        const edenCapacity = gcData['EC'] ?? 0;
        const s0Used = gcData['S0U'] ?? 0;
        const s1Used = gcData['S1U'] ?? 0;
        const oldUsed = gcData['OU'] ?? 0;
        const oldCapacity = gcData['OC'] ?? 0;
        const metaspaceUsed = gcData['MU'] ?? 0;
        const metaspaceCapacity = gcData['MC'] ?? 0;

        result['heap'] = {
          edenUsedKb: edenUsed,
          edenCapacityKb: edenCapacity,
          survivorUsedKb: s0Used + s1Used,
          oldGenUsedKb: oldUsed,
          oldGenCapacityKb: oldCapacity,
          totalUsedMb: Math.round((edenUsed + s0Used + s1Used + oldUsed) / 1024),
          totalCapacityMb: Math.round((edenCapacity + oldCapacity) / 1024),
        };
        result['metaspace'] = {
          usedKb: metaspaceUsed,
          capacityKb: metaspaceCapacity,
          usedMb: Math.round(metaspaceUsed / 1024),
        };

        const ygc = gcData['YGC'] ?? 0;
        const ygct = gcData['YGCT'] ?? 0;
        const fgc = gcData['FGC'] ?? 0;
        const fgct = gcData['FGCT'] ?? 0;
        result['gcSummary'] = {
          youngGcCount: ygc,
          youngGcTimeSec: ygct,
          fullGcCount: fgc,
          fullGcTimeSec: fgct,
          avgYoungGcMs: ygc > 0 ? Math.round((ygct / ygc) * 1000 * 100) / 100 : 0,
          avgFullGcMs: fgc > 0 ? Math.round((fgct / fgc) * 1000 * 100) / 100 : 0,
          totalGcTimeSec: ygct + fgct,
        };
      }
    } else {
      result['gc'] = 'jstat not available (JDK tools not installed or not same user)';
    }

    // Parse jstat -gcutil for utilization percentages
    if (!jstatGcutil.includes('jstat_gcutil_unavailable')) {
      const lines = jstatGcutil.trim().split('\n');
      if (lines.length >= 2) {
        const keys = lines[0].trim().split(/\s+/);
        const vals = lines[1].trim().split(/\s+/);
        const utilData: Record<string, number> = {};
        for (let i = 0; i < keys.length; i++) {
          utilData[keys[i]] = parseFloat(vals[i] ?? '0');
        }
        result['gcUtilization'] = utilData;
      }
    }

    // Parse JVM flags
    if (!jcmdFlags.includes('jcmd_unavailable')) {
      result['vmFlags'] = jcmdFlags.substring(0, 500);
    }

    // Extract heap size from cmdline (-Xmx, -Xms)
    const xmxMatch = cmdline.match(/-Xmx(\S+)/i);
    const xmsMatch = cmdline.match(/-Xms(\S+)/i);
    result['configuredHeap'] = {
      maxHeap: xmxMatch ? xmxMatch[1] : 'not specified',
      initialHeap: xmsMatch ? xmsMatch[1] : 'not specified',
    };

    return result;
  }

  private parseNodeMetrics(
    cmdline: string,
    procStatus: Record<string, unknown>,
    ctxSwitches: Record<string, number>,
  ): Record<string, unknown> {
    // Extract V8/Node flags from cmdline
    const flags: string[] = [];
    const flagRegex = /--([\w-]+)/g;
    let match: RegExpExecArray | null;
    while ((match = flagRegex.exec(cmdline)) !== null) {
      flags.push(`--${match[1]}`);
    }

    // Extract max-old-space-size if set
    const heapLimitMatch = cmdline.match(/--max-old-space-size=(\d+)/);
    const heapLimitMb = heapLimitMatch ? parseInt(heapLimitMatch[1], 10) : null;

    const rssKb = (procStatus['VmRSS'] as number) ?? 0;
    const vmSizeKb = (procStatus['VmSize'] as number) ?? 0;
    const threads = (procStatus['Threads'] as number) ?? 0;

    return {
      heapProxy: {
        rssMb: Math.round(rssKb / 1024),
        vmSizeMb: Math.round(vmSizeKb / 1024),
        configuredMaxHeapMb: heapLimitMb,
      },
      eventLoopProxy: {
        // High voluntary context switches suggest event loop is actively yielding (healthy)
        // High involuntary context switches suggest CPU contention (unhealthy)
        voluntaryCtxSwitches: ctxSwitches.voluntary,
        involuntaryCtxSwitches: ctxSwitches.involuntary,
        potentialCpuContention: ctxSwitches.involuntary > ctxSwitches.voluntary * 0.1,
      },
      threads,
      v8Flags: flags,
      isInspectEnabled: cmdline.includes('--inspect') || cmdline.includes('--debug'),
      isClusterMode: threads > 2,
    };
  }

  private parsePythonMetrics(
    cmdline: string,
    procStatus: Record<string, unknown>,
    threadStates: Record<string, unknown>,
  ): Record<string, unknown> {
    const rssKb = (procStatus['VmRSS'] as number) ?? 0;
    const vmSizeKb = (procStatus['VmSize'] as number) ?? 0;
    const threadCount = (threadStates['totalThreads'] as number) ?? 0;
    const states = (threadStates['states'] as Record<string, number>) ?? {};

    // Detect Python version from cmdline
    const versionMatch = cmdline.match(/python([\d.]*)/i);
    const pythonVersion = versionMatch ? versionMatch[1] || 'unknown' : 'unknown';

    // GIL contention proxy: multiple threads in running state = potential GIL contention
    const runningThreads = states['running'] ?? 0;
    const diskSleepThreads = states['diskSleep'] ?? 0;

    return {
      pythonVersion,
      memory: {
        rssMb: Math.round(rssKb / 1024),
        vmSizeMb: Math.round(vmSizeKb / 1024),
      },
      gilContentionProxy: {
        threadCount,
        runningThreads,
        // Multiple running threads in CPython suggest GIL contention
        potentialGilContention: runningThreads > 1 && threadCount > 2,
        explanation:
          runningThreads > 1
            ? 'Multiple threads in RUNNING state - potential GIL contention in CPython'
            : 'Low GIL contention risk',
      },
      blockingIoProxy: {
        diskSleepThreads,
        hasBlockingIo: diskSleepThreads > 0,
        explanation:
          diskSleepThreads > 0
            ? `${diskSleepThreads} thread(s) in uninterruptible sleep - likely blocking I/O`
            : 'No blocking I/O detected',
      },
      isGunicorn: cmdline.includes('gunicorn'),
      isUvicorn: cmdline.includes('uvicorn'),
      isMultiprocess: cmdline.includes('--workers') || cmdline.includes('-w '),
    };
  }
}
