import { NetworkErrorsTool } from '../system/network/network-errors.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('NetworkErrorsTool', () => {
  const makeTool = () => new NetworkErrorsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('network_errors');
      expect(meta.category).toBe(ToolCategory.NETWORK);
    });
  });

  describe('parseOutput', () => {
    it('should parse TCP SNMP and TcpExt stats', () => {
      const tcp = [
        'Tcp: RtoAlgorithm RtoMin RtoMax MaxConn ActiveOpens PassiveOpens AttemptFails EstabResets CurrEstab InSegs OutSegs RetransSegs InErrs OutRsts',
        'Tcp: 1 200 120000 -1 5000 3000 100 50 200 900000 800000 1500 10 100',
      ].join('\n');
      const tcpExt = [
        'TcpExt: SyncookiesSent SyncookiesRecv SyncookiesFailed EmbryonicRsts PruneCalled RcvPruned OfoPruned OutOfWindowIcmps LockDroppedIcmps ArpFilter TW TWRecycled TWKilled PAWSPassive PAWSActive PAWSEstab DelayedACKs DelayedACKLocked DelayedACKLost ListenOverflows ListenDrops',
        'TcpExt: 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 25 30',
      ].join('\n');
      const ss = 'some ss output';

      const stdout = `${tcp}\n---SEP---\n${tcpExt}\n---SEP---\n${ss}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.retransmits).toBe(1500);
      expect(result.activeOpens).toBe(5000);
      expect(result.passiveOpens).toBe(3000);
      expect(result.attemptFails).toBe(100);
      expect(result.estabResets).toBe(50);
      expect(result.inSegments).toBe(900000);
      expect(result.outSegments).toBe(800000);
      expect(result.listenDrops).toBe(30);
      expect(result.listenOverflows).toBe(25);
      expect(result.retransmitRate).toBeGreaterThan(0);
    });

    it('should handle missing TcpExt', () => {
      const tcp = [
        'Tcp: ActiveOpens PassiveOpens AttemptFails EstabResets InSegs OutSegs RetransSegs',
        'Tcp: 100 50 10 5 10000 9000 200',
      ].join('\n');

      const stdout = `${tcp}\n---SEP---\n\n---SEP---\nss output`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.listenDrops).toBe(0);
      expect(result.listenOverflows).toBe(0);
    });
  });
});
