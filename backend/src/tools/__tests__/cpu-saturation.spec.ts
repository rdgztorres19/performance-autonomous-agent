import { CpuSaturationTool } from '../system/cpu/cpu-saturation.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('CpuSaturationTool', () => {
  const makeTool = () => new CpuSaturationTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('cpu_saturation');
      expect(meta.category).toBe(ToolCategory.CPU);
    });
  });

  describe('buildCommand', () => {
    it('should use SEPARATOR pattern', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('---SEPARATOR---');
      expect(cmd).toContain('/proc/stat');
    });

    it('should respect custom interval', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ sampleIntervalMs: 3000 });
      expect(cmd).toContain('sleep 3');
    });
  });

  describe('parseOutput', () => {
    it('should parse two-sample output', () => {
      const sample1 = [
        'ctxt 1000',
        'intr 500',
        'softirq 200',
        'procs_running 3',
        'procs_blocked 1',
      ].join('\n');
      const sample2 = [
        'ctxt 1500',
        'intr 700',
        'softirq 350',
        'procs_running 5',
        'procs_blocked 2',
      ].join('\n');

      const stdout = `${sample1}\n---SEPARATOR---\n${sample2}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.contextSwitchesPerSec).toBe(500);
      expect(result.interruptsPerSec).toBe(200);
      expect(result.softirqsPerSec).toBe(150);
      expect(result.runQueueLength).toBe(5);
      expect(result.blockedProcesses).toBe(2);
    });

    it('should handle missing separator', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('ctxt 1000\n', '');
      expect(result.error).toBe('Insufficient samples');
    });
  });
});
