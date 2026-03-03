import { NetworkInterfaceErrorsTool } from '../system/network/network-interface-errors.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('NetworkInterfaceErrorsTool', () => {
  const makeTool = () => new NetworkInterfaceErrorsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('network_interface_errors');
      expect(meta.category).toBe(ToolCategory.NETWORK);
    });
  });

  describe('parseOutput', () => {
    it('should parse /proc/net/dev', () => {
      const stdout = `Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 1000    10      0    0    0    0          0         0   1000    10      0    0    0    0       0          0
  eth0: 5000    50      2    1    0    0          0         0   3000    30      1    0    0    0       0          0`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.interfaces).toBeDefined();
      expect(result.interfaces.length).toBe(1); // lo is skipped
      const eth0 = result.interfaces[0];
      expect(eth0.interface).toBe('eth0');
      expect(eth0.rxErrs).toBe(2);
      expect(eth0.rxDrop).toBe(1);
      expect(eth0.txErrs).toBe(1);
      expect(eth0.txDrop).toBe(0);
      expect(result.totals.rxErrs).toBe(2);
      expect(result.totals.txErrs).toBe(1);
    });
  });
});
