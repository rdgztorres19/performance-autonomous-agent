import { MemoryPressureTool } from '../system/memory/memory-pressure.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('MemoryPressureTool', () => {
  const makeTool = () => new MemoryPressureTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('memory_pressure');
      expect(meta.category).toBe(ToolCategory.MEMORY);
    });
  });

  describe('parseOutput', () => {
    it('should parse vmstat + PSI output', () => {
      const vmstat = [
        'pgfault 123456',
        'pgmajfault 50',
        'pswpin 100',
        'pswpout 200',
        'oom_kill 1',
      ].join('\n');
      const psi = [
        'some avg10=5.00 avg60=3.00 avg300=1.00 total=500000',
        'full avg10=2.00 avg60=1.00 avg300=0.50 total=200000',
      ].join('\n');

      const stdout = `${vmstat}\n---SEP---\n${psi}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.pageFaultsMinor).toBe(123456);
      expect(result.pageFaultsMajor).toBe(50);
      expect(result.swapIn).toBe(100);
      expect(result.swapOut).toBe(200);
      expect(result.oomKills).toBe(1);
      expect(result.psiAvailable).toBe(true);
      expect(result.psiSome.avg10).toBe(5.0);
      expect(result.psiFull.avg10).toBe(2.0);
    });

    it('should handle unavailable PSI', () => {
      const vmstat = 'pgfault 1000\npgmajfault 0\npswpin 0\npswpout 0\noom_kill 0';
      const stdout = `${vmstat}\n---SEP---\npsi_unavailable`;

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.psiAvailable).toBe(false);
      expect(result.pageFaultsMinor).toBe(1000);
    });
  });
});
