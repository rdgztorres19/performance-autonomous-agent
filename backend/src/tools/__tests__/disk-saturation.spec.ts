import { DiskSaturationTool } from '../system/disk/disk-saturation.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('DiskSaturationTool', () => {
  const makeTool = () => new DiskSaturationTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('disk_saturation');
      expect(meta.category).toBe(ToolCategory.DISK);
    });
  });

  describe('parseOutput', () => {
    it('should compute utilization from two samples', () => {
      const sample1 = '   8    0 sda 0 0 0 0 0 0 0 0 0 1000 2000';
      const sample2 = '   8    0 sda 0 0 0 0 0 0 0 0 2 1500 3000';
      const iowait = 'cpu  100 10 50 800 20 5 3 2';

      const stdout = `${sample1}\n---SEP---\n${sample2}\n---SEP---\n${iowait}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.devices).toHaveLength(1);
      const dev = result.devices[0];
      expect(dev.device).toBe('sda');
      expect(dev.utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(dev.queueDepth).toBe(2);
      expect(dev.weightedIoTimeDiffMs).toBe(1000);
    });

    it('should handle insufficient data', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('some data', '');
      expect(result.error).toBe('Insufficient data');
    });
  });
});
