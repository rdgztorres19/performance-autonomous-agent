import { ProcessCpuTool } from '../application/process/process-cpu.tool';
import { ToolCategory, MetricLevel } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ProcessCpuTool', () => {
  const makeTool = () => new ProcessCpuTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('process_cpu');
      expect(meta.category).toBe(ToolCategory.APPLICATION_CPU);
      expect(meta.level).toBe(MetricLevel.APPLICATION);
    });
  });

  describe('getVisualization', () => {
    it('should return horizontalBar chart', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts[0].type).toBe('horizontalBar');
      expect(viz!.charts[0].arrayField).toBe('topProcesses');
    });
  });

  describe('buildCommand', () => {
    it('should list top N processes by default', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('ps aux --sort=-%cpu');
      expect(cmd).toContain('head -21');
    });

    it('should query specific PID when provided', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 1234 });
      expect(cmd).toContain('ps -p 1234');
      expect(cmd).toContain('/proc/1234/stat');
    });

    it('should respect custom topN', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ topN: 10 });
      expect(cmd).toContain('head -11');
    });
  });

  describe('parseOutput', () => {
    it('should parse top processes list (ps aux)', () => {
      const stdout = [
        'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
        'root         1  5.2  0.5 168000 12000 ?        Ss   Jan01  10:00 /sbin/init',
        'www-data  1234 25.0  3.0 500000 60000 ?        Sl   Jan01 100:00 nginx: worker process',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.topProcesses).toHaveLength(2);
      expect(result.topProcesses[0].user).toBe('root');
      expect(result.topProcesses[0].pid).toBe(1);
      expect(result.topProcesses[0].cpuPercent).toBe(5.2);
      expect(result.topProcesses[0].command).toBe('/sbin/init');
      expect(result.topProcesses[1].cpuPercent).toBe(25.0);
      expect(result.topProcesses[1].command).toContain('nginx');
    });

    it('should parse single PID output (with ---SEP---)', () => {
      const stdout = [
        ' 1234  1000  15.5   3.0 500000 60000 Sl   100:00 nginx',
        '---SEP---',
        '1234 (nginx) S 1000 ...',
        '---SEP---',
        'Name: nginx\nThreads: 4',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.pid).toBe(1234);
      expect(result.ppid).toBe(1000);
      expect(result.cpuPercent).toBe(15.5);
      expect(result.command).toBe('nginx');
    });
  });
});
