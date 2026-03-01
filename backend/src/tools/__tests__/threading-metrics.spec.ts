import { ThreadingMetricsTool } from '../application/threading/threading-metrics.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ThreadingMetricsTool', () => {
  const makeTool = () => new ThreadingMetricsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('threading_metrics');
      expect(meta.category).toBe(ToolCategory.APPLICATION_THREADING);
    });
  });

  describe('getVisualization', () => {
    it('should return donut chart with dynamicMapField', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts[0].type).toBe('donut');
      expect(viz!.charts[0].dynamicMapField).toBe('states');
    });
  });

  describe('buildCommand', () => {
    it('should target specific PID', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 777 });
      expect(cmd).toContain('/proc/777/task');
    });
  });

  describe('parseOutput', () => {
    it('should count threads by state', () => {
      const stdout = [
        '10',
        '---SEP---',
        '100 S',
        '101 S',
        '102 R',
        '103 D',
        '104 S',
        '105 S',
        '106 S',
        '107 Z',
        '108 S',
        '109 T',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.threadCount).toBe(10);
      expect(result.states.running).toBe(1);
      expect(result.states.sleeping).toBe(6);
      expect(result.states.diskSleep).toBe(1);
      expect(result.states.zombie).toBe(1);
      expect(result.states.stopped).toBe(1);
      expect(result.hasDiskSleepThreads).toBe(true);
      expect(result.hasZombieThreads).toBe(true);
    });

    it('should handle healthy state (no D or Z threads)', () => {
      const stdout = '4\n---SEP---\n1 S\n2 S\n3 S\n4 R';
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.hasDiskSleepThreads).toBe(false);
      expect(result.hasZombieThreads).toBe(false);
    });
  });
});
