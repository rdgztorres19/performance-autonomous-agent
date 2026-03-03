import { CpuInterruptsTool } from '../system/cpu/cpu-interrupts.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('CpuInterruptsTool', () => {
  const makeTool = () => new CpuInterruptsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('cpu_interrupts');
      expect(meta.category).toBe(ToolCategory.CPU);
    });
  });

  describe('parseOutput', () => {
    it('should parse interrupts and softirqs', () => {
      const interrupts = `           CPU0       CPU1
  0:         45         30   IO-APIC  2-edge      timer
  1:          3          2   IO-APIC  1-edge      i8042`;
      const softirqs = `                CPU0       CPU1
      HI:          1          0
   TIMER:        100        80
   NET_TX:         5          3
   NET_RX:        10          8
   BLOCK:          2          1`;
      const stdout = `${interrupts}\n---SEP---\n${softirqs}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.perCpu).toBeDefined();
      expect(result.perCpu.length).toBe(2);
      expect(result.softirqByType).toBeDefined();
      expect(result.softirqByType.HI).toBe(1);
      expect(result.softirqByType.TIMER).toBe(180);
      expect(result.softirqByType.NET_TX).toBe(8);
      expect(result.softirqByType.NET_RX).toBe(18);
      expect(result.softirqByType.BLOCK).toBe(3);
    });
  });
});
