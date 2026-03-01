import { NetworkConnectionsTool } from '../system/network/network-connections.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('NetworkConnectionsTool', () => {
  const makeTool = () => new NetworkConnectionsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('network_connections');
      expect(meta.category).toBe(ToolCategory.NETWORK);
    });
  });

  describe('getVisualization', () => {
    it('should return donut chart with dynamicMapField', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts[0].type).toBe('donut');
      expect(viz!.charts[0].dynamicMapField).toBe('states');
    });
  });

  describe('parseOutput', () => {
    it('should parse connection state summary', () => {
      const stdout = [
        '     50 ESTAB',
        '     10 TIME-WAIT',
        '      5 CLOSE-WAIT',
        '      3 LISTEN',
        '      1 SYN-SENT',
        '      2 SYN-RECV',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.totalConnections).toBe(71);
      expect(result.established).toBe(50);
      expect(result.timeWait).toBe(10);
      expect(result.closeWait).toBe(5);
      expect(result.listen).toBe(3);
      expect(result.synSent).toBe(1);
      expect(result.synRecv).toBe(2);
      expect(result.states['ESTAB']).toBe(50);
    });

    it('should handle empty output', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('', '');
      expect(result.totalConnections).toBe(0);
    });
  });
});
