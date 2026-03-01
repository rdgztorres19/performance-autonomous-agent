import { ApplicationErrorsTool } from '../application/errors/application-errors.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ApplicationErrorsTool', () => {
  const makeTool = () => new ApplicationErrorsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('application_errors');
      expect(meta.category).toBe(ToolCategory.APPLICATION_ERRORS);
    });
  });

  describe('buildCommand', () => {
    it('should build per-process command when PID given', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 1234 });
      expect(cmd).toContain('pid=1234');
      expect(cmd).toContain('/proc/1234/fd');
      expect(cmd).toContain('/proc/1234/limits');
      expect(cmd).toContain('/proc/1234/status');
    });

    it('should build system-wide command when no PID', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('/proc/net/snmp');
      expect(cmd).toContain('oom');
      expect(cmd).toContain('segfault');
    });

    it('should filter by processName in system-wide mode', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ processName: 'nginx' });
      expect(cmd).toContain('grep -i "nginx"');
    });
  });

  describe('parseOutput (per-process)', () => {
    it('should parse all 7 sections for per-process mode', () => {
      const stdout = [
        'retrans:0/3 retrans:1/5',
        '---SECTION---',
        '      5 ESTAB\n      2 CLOSE-WAIT',
        '---SECTION---',
        '100',
        '---SECTION---',
        'Max open files            1024                 65536                files',
        '---SECTION---',
        '0::/user.slice',
        '---SECTION---',
        'Name:\tnginx\nState:\tS (sleeping)\nSigCgt:\t0000000000010000',
        '---SECTION---',
        'no_dmesg',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.tcpErrors.totalRetransmits).toBe(8);
      expect(result.socketStates['ESTAB']).toBe(5);
      expect(result.socketStates['CLOSE-WAIT']).toBe(2);
      expect(result.fileDescriptors.open).toBe(100);
      expect(result.fileDescriptors.softLimit).toBe(1024);
      expect(result.fileDescriptors.usagePercent).toBeCloseTo(9.77, 1);
      expect(result.fileDescriptors.isNearLimit).toBe(false);
      expect(result.process['Name']).toBe('nginx');
      expect(result.kernelMessages).toEqual([]);
      expect(result.summary.totalTcpRetransmits).toBe(8);
      expect(result.summary.hasCloseWaitLeaks).toBe(false);
      expect(result.summary.errorIndicators).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parseOutput (system-wide)', () => {
    it('should parse 5 sections for system-wide mode', () => {
      const tcp = [
        'Tcp: ActiveOpens PassiveOpens AttemptFails EstabResets InSegs OutSegs RetransSegs InErrs',
        'Tcp: 5000 3000 100 50 900000 800000 1500 10',
      ].join('\n');
      const stdout = [
        tcp,
        '---SECTION---',
        'killed process 1234 (oom_reaper)',
        '---SECTION---',
        'no_segfaults',
        '---SECTION---',
        'no_coredumps',
        '---SECTION---',
        'no_d_state',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.tcpStats.retransSegs).toBe(1500);
      expect(result.tcpStats.outSegs).toBe(800000);
      expect(result.oomEvents.count).toBe(1);
      expect(result.segfaults.count).toBe(0);
      expect(result.coredumps.count).toBe(0);
      expect(result.summary.hasOomKills).toBe(true);
      expect(result.summary.hasSegfaults).toBe(false);
      expect(result.summary.tcpRetransmitRate).toBeGreaterThan(0);
    });
  });
});
