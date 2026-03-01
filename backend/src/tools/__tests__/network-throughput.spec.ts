import { NetworkThroughputTool } from '../system/network/network-throughput.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('NetworkThroughputTool', () => {
  const makeTool = () => new NetworkThroughputTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('network_throughput');
      expect(meta.category).toBe(ToolCategory.NETWORK);
    });
  });

  describe('getVisualization', () => {
    it('should return bar chart with valueFields', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts[0].type).toBe('bar');
      expect(viz!.charts[0].arrayField).toBe('interfaces');
      expect(viz!.charts[0].valueFields).toHaveLength(2);
    });
  });

  describe('parseOutput', () => {
    it('should compute throughput from two /proc/net/dev samples', () => {
      const header = 'Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed';
      const dev1 = '  eth0: 1000000 5000 0 0 0 0 0 0 500000 3000 0 0 0 0 0 0';
      const dev2 = '  eth0: 2000000 6000 0 0 0 0 0 0 800000 4000 0 0 0 0 0 0';

      const stdout = `${header}\n${dev1}\n---SEP---\n${header}\n${dev2}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.interfaces).toHaveLength(1);
      const iface = result.interfaces[0];
      expect(iface.interface).toBe('eth0');
      expect(iface.rxBytesPerSec).toBe(1000000);
      expect(iface.txBytesPerSec).toBe(300000);
      expect(iface.rxPacketsPerSec).toBe(1000);
      expect(iface.txPacketsPerSec).toBe(1000);
      expect(iface.rxMbps).toBeGreaterThan(0);
    });

    it('should skip loopback interface', () => {
      const dev1 = '    lo: 1000 10 0 0 0 0 0 0 1000 10 0 0 0 0 0 0\n  eth0: 1000 5 0 0 0 0 0 0 500 3 0 0 0 0 0 0';
      const dev2 = '    lo: 2000 20 0 0 0 0 0 0 2000 20 0 0 0 0 0 0\n  eth0: 2000 10 0 0 0 0 0 0 800 6 0 0 0 0 0 0';

      const stdout = `${dev1}\n---SEP---\n${dev2}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      const ifaceNames = result.interfaces.map((i: any) => i.interface);
      expect(ifaceNames).not.toContain('lo');
      expect(ifaceNames).toContain('eth0');
    });

    it('should handle insufficient samples', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('  eth0: 1000 5 0 0 0 0 0 0 500 3 0 0 0 0 0 0', '');
      expect(result.error).toBe('Insufficient samples');
    });
  });
});
