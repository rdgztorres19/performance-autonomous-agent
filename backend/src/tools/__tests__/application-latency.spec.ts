import { ApplicationLatencyTool } from '../application/latency/application-latency.tool';
import { ToolCategory, MetricLevel } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ApplicationLatencyTool', () => {
  const makeTool = () => new ApplicationLatencyTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('application_latency');
      expect(meta.category).toBe(ToolCategory.APPLICATION_LATENCY);
      expect(meta.level).toBe(MetricLevel.APPLICATION);
    });
  });

  describe('buildCommand', () => {
    it('should include PID in all ss and proc commands', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 4567 });
      expect(cmd).toContain('pid=4567');
      expect(cmd).toContain('/proc/4567/status');
      expect(cmd).toContain('/proc/4567/schedstat');
    });
  });

  describe('parseOutput', () => {
    it('should parse RTT, socket queues, and context switches', () => {
      const tcpSection =
        'ESTAB 0 0 10.0.0.1:8080 10.0.0.2:45000 users:(("nginx",pid=4567,fd=5))\n' +
        '\t cubic wscale:7,7 rto:204 rtt:15.5/3.2 retrans:0/2 cwnd:10\n' +
        'ESTAB 0 0 10.0.0.1:8080 10.0.0.3:45001 users:(("nginx",pid=4567,fd=6))\n' +
        '\t cubic wscale:7,7 rto:204 rtt:120.0/10.0 retrans:0/5 cwnd:8';
      const socketQueues =
        'ESTAB 0      0      10.0.0.1:8080  10.0.0.2:45000\n' +
        'ESTAB 1024   512    10.0.0.1:8080  10.0.0.3:45001';
      const connStates = '      2 ESTAB';
      const ctxtSwitches =
        'voluntary_ctxt_switches:\t5000\nnonvoluntary_ctxt_switches:\t200';
      const schedstat = '10000000 2000000 500';

      const stdout = [
        tcpSection,
        '---SECTION---',
        socketQueues,
        '---SECTION---',
        connStates,
        '---SECTION---',
        ctxtSwitches,
        '---SECTION---',
        schedstat,
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.tcp.avgRttMs).toBeGreaterThan(0);
      expect(result.tcp.maxRttMs).toBe(120);
      expect(result.tcp.totalRetransmits).toBe(7);
      expect(result.tcp.highLatencyCount).toBe(1);
      expect(result.socketQueues.totalRecvQ).toBe(1024);
      expect(result.socketQueues.totalSendQ).toBe(512);
      expect(result.socketQueues.socketsWithBacklog).toBe(1);
      expect(result.contextSwitches.voluntary).toBe(5000);
      expect(result.contextSwitches.involuntary).toBe(200);
      expect(result.scheduling.cpuTimeNs).toBe(10000000);
      expect(result.summary.totalRetransmits).toBe(7);
      expect(result.summary.hasQueueBackpressure).toBe(true);
    });

    it('should handle no connections', () => {
      const stdout = [
        'no_connections',
        '---SECTION---',
        'no_sockets',
        '---SECTION---',
        'no_states',
        '---SECTION---',
        'status_unavailable',
        '---SECTION---',
        'schedstat_unavailable',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.tcp.avgRttMs).toBe(0);
      expect(result.tcp.connections).toEqual([]);
      expect(result.socketQueues.totalRecvQ).toBe(0);
      expect(result.connectionStates).toEqual({});
      expect(result.summary.hasQueueBackpressure).toBe(false);
    });
  });
});
