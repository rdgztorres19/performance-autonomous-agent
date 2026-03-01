import { RuntimeSpecificTool } from '../application/runtime/runtime-specific.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('RuntimeSpecificTool', () => {
  const makeTool = () => new RuntimeSpecificTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('runtime_specific');
      expect(meta.category).toBe(ToolCategory.RUNTIME_SPECIFIC);
    });
  });

  describe('buildCommand', () => {
    it('should probe cmdline, exe, status, jstat, jcmd, threads, schedstat', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 1111 });
      expect(cmd).toContain('/proc/1111/cmdline');
      expect(cmd).toContain('/proc/1111/exe');
      expect(cmd).toContain('/proc/1111/status');
      expect(cmd).toContain('jstat');
      expect(cmd).toContain('jcmd');
      expect(cmd).toContain('/proc/1111/schedstat');
    });
  });

  describe('parseOutput', () => {
    const makeStdout = (
      cmdline: string,
      exe: string,
      status: string,
      jstat = 'jstat_unavailable',
      jcmd = 'jcmd_unavailable',
      jstatGcutil = 'jstat_gcutil_unavailable',
      threads = 'threads_unavailable',
      schedstat = 'schedstat_unavailable',
      ctxt = 'ctxt_unavailable',
    ) =>
      [cmdline, exe, status, jstat, jcmd, jstatGcutil, threads, schedstat, ctxt]
        .join('\n---DETECT---\n');

    it('should detect JVM runtime', () => {
      const status = 'Name:\tjava\nVmSize:\t4000000 kB\nVmRSS:\t2000000 kB\nVmSwap:\t0 kB\nVmPeak:\t4100000 kB\nThreads:\t100';
      const jstatGc = [
        'S0C    S1C    S0U    S1U      EC       EU        OC         OU       MC     MU',
        '1024   1024   0      512    8192     4096     32768      16384    10240   8192',
      ].join('\n');

      const stdout = makeStdout(
        'java -Xmx4g -Xms2g -jar app.jar',
        '/usr/bin/java',
        status,
        jstatGc,
      );

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.runtime).toBe('jvm');
      expect(result.jvm).toBeDefined();
      expect(result.jvm.configuredHeap.maxHeap).toBe('4g');
      expect(result.jvm.configuredHeap.initialHeap).toBe('2g');
    });

    it('should detect Node.js runtime', () => {
      const status = 'Name:\tnode\nVmSize:\t1000000 kB\nVmRSS:\t500000 kB\nVmSwap:\t0 kB\nVmPeak:\t1100000 kB\nThreads:\t10';
      const ctxt = 'voluntary_ctxt_switches:\t10000\nnonvoluntary_ctxt_switches:\t500';

      const stdout = makeStdout(
        'node --max-old-space-size=4096 --inspect server.js',
        '/usr/bin/node',
        status,
        'jstat_unavailable',
        'jcmd_unavailable',
        'jstat_gcutil_unavailable',
        'threads_unavailable',
        'schedstat_unavailable',
        ctxt,
      );

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.runtime).toBe('nodejs');
      expect(result.nodejs).toBeDefined();
      expect(result.nodejs.heapProxy.configuredMaxHeapMb).toBe(4096);
      expect(result.nodejs.isInspectEnabled).toBe(true);
      expect(result.nodejs.v8Flags).toContain('--max-old-space-size');
      expect(result.nodejs.v8Flags).toContain('--inspect');
    });

    it('should detect Python runtime', () => {
      const status = 'Name:\tpython3\nVmSize:\t800000 kB\nVmRSS:\t200000 kB\nVmSwap:\t0 kB\nVmPeak:\t900000 kB\nThreads:\t8';
      const threads = '      3 R\n      5 S';

      const stdout = makeStdout(
        'python3 -m gunicorn --workers 4 app:main',
        '/usr/bin/python3.11',
        status,
        'jstat_unavailable',
        'jcmd_unavailable',
        'jstat_gcutil_unavailable',
        threads,
      );

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.runtime).toBe('python');
      expect(result.python).toBeDefined();
      expect(result.python.isGunicorn).toBe(true);
      expect(result.python.gilContentionProxy.potentialGilContention).toBe(true);
      expect(result.python.gilContentionProxy.runningThreads).toBe(3);
    });

    it('should fall back to unknown runtime', () => {
      const status = 'Name:\tmyapp\nVmSize:\t100000 kB\nVmRSS:\t50000 kB\nVmSwap:\t0 kB\nVmPeak:\t110000 kB\nThreads:\t2';

      const stdout = makeStdout(
        '/usr/local/bin/myapp --config /etc/myapp.conf',
        '/usr/local/bin/myapp',
        status,
      );

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.runtime).toBe('unknown');
      expect(result.generic).toBeDefined();
      expect(result.generic.cmdline).toContain('myapp');
    });
  });
});
