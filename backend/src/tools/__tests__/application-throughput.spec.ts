import { ApplicationThroughputTool } from '../application/throughput/application-throughput.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ApplicationThroughputTool', () => {
  const makeTool = () => new ApplicationThroughputTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('application_throughput');
      expect(meta.category).toBe(ToolCategory.APPLICATION_THROUGHPUT);
    });
  });

  describe('buildCommand', () => {
    it('should use two snapshots with 1s sleep', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 888 });
      expect(cmd).toContain('sleep 1');
      expect(cmd).toContain('/proc/888/net/dev');
      expect(cmd).toContain('/proc/888/io');
      expect(cmd).toContain('pid=888');
    });
  });

  describe('parseOutput', () => {
    it('should compute rates from two snapshots', () => {
      const net1 = '  eth0: 1000000 5000 0 0 0 0 0 0 500000 3000 0 0 0 0 0 0';
      const io1 =
        'rchar: 100\nwchar: 50\nsyscr: 100\nsyscw: 50\nread_bytes: 1048576\nwrite_bytes: 524288\ncancelled_write_bytes: 0';
      const conns1 = '10';
      const net2 = '  eth0: 2000000 6000 0 0 0 0 0 0 800000 4000 0 0 0 0 0 0';
      const io2 =
        'rchar: 200\nwchar: 100\nsyscr: 200\nsyscw: 100\nread_bytes: 2097152\nwrite_bytes: 1048576\ncancelled_write_bytes: 0';
      const conns2 = '12';
      const connStates = '     10 ESTAB\n      2 TIME-WAIT';

      const stdout = [
        net1, '---SNAP---', io1, '---SNAP---', conns1,
        '---SNAP---',
        net2, '---SNAP---', io2, '---SNAP---', conns2,
        '---SNAP---', connStates,
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.network.rxBytesPerSec).toBe(1000000);
      expect(result.network.txBytesPerSec).toBe(300000);
      expect(result.network.rxMbPerSec).toBeGreaterThan(0);
      expect(result.io.readBytesPerSec).toBe(1048576);
      expect(result.io.writeBytesPerSec).toBe(524288);
      expect(result.io.readOpsPerSec).toBe(100);
      expect(result.io.writeOpsPerSec).toBe(50);
      expect(result.connections.activeCount).toBe(12);
      expect(result.connections.connectionChurn).toBe(2);
      expect(result.connections.states['ESTAB']).toBe(10);
      expect(result.summary.totalNetworkMbPerSec).toBeGreaterThan(0);
      expect(result.summary.totalIoMbPerSec).toBeGreaterThan(0);
    });

    it('should handle insufficient data', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('only one snap', '');
      expect(result.error).toBe('Insufficient data collected');
    });
  });
});
