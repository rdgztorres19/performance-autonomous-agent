import { ReadonlyCommandTool } from '../system/shell/readonly-command.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ReadonlyCommandTool', () => {
  const makeTool = () => new ReadonlyCommandTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('readonly_command');
      expect(meta.category).toBe(ToolCategory.SHELL);
      expect(meta.parameters).toBeDefined();
      expect(meta.parameters!.some((p) => p.name === 'command' && p.required)).toBe(true);
    });
  });

  describe('buildCommand', () => {
    const tool = makeTool() as unknown as { buildCommand: (p: Record<string, unknown>) => string };

    it('should return command when valid read-only', () => {
      expect(tool.buildCommand({ command: 'df -h' })).toBe('df -h');
      expect(tool.buildCommand({ command: 'cat /proc/loadavg' })).toBe('cat /proc/loadavg');
      expect(tool.buildCommand({ command: 'ls -la /tmp' })).toBe('ls -la /tmp');
      expect(tool.buildCommand({ command: 'grep cpu /proc/stat 2>/dev/null' })).toBe(
        'grep cpu /proc/stat 2>/dev/null',
      );
    });

    it('should throw for dangerous commands', () => {
      expect(() => tool.buildCommand({ command: 'rm -rf /tmp/x' })).toThrow(/rm/);
      expect(() => tool.buildCommand({ command: 'mkdir /tmp/x' })).toThrow(/mkdir/);
      expect(() => tool.buildCommand({ command: 'sudo apt update' })).toThrow(/sudo/);
      expect(() => tool.buildCommand({ command: 'curl -o file.txt http://x' })).toThrow(/curl/);
    });

    it('should throw for redirects', () => {
      expect(() => tool.buildCommand({ command: 'echo hello > /tmp/out' })).toThrow(
        /redirection|>|write/,
      );
      expect(() => tool.buildCommand({ command: 'ls >> /tmp/log' })).toThrow(/>>|write/);
      expect(() => tool.buildCommand({ command: 'cat x | tee out' })).toThrow(/tee/);
    });

    it('should allow safe redirects', () => {
      expect(tool.buildCommand({ command: 'noisy-cmd 2>/dev/null' })).toContain('2>/dev/null');
      expect(tool.buildCommand({ command: 'cmd 2>&1' })).toContain('2>&1');
    });

    it('should throw when command is missing', () => {
      expect(() => tool.buildCommand({})).toThrow(/required/);
    });
  });

  describe('parseOutput', () => {
    const tool = makeTool() as unknown as {
      parseOutput: (stdout: string, stderr: string) => Record<string, unknown>;
    };

    it('should return stdout and stderr', () => {
      const result = tool.parseOutput('line1\nline2', 'err');
      expect(result.stdout).toBe('line1\nline2');
      expect(result.stderr).toBe('err');
      expect(result.stdoutLines).toEqual(['line1', 'line2']);
    });
  });

  describe('execute', () => {
    it('should execute valid read-only command', async () => {
      const tool = new ReadonlyCommandTool(createMockConnection('ok', '', 0));
      const result = await tool.execute({ command: 'echo ok' });
      expect(result.success).toBe(true);
      expect(result.data.stdout).toBe('ok');
    });

    it('should fail for invalid command', async () => {
      const tool = makeTool();
      const result = await tool.execute({ command: 'rm -rf /' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/rm/);
    });
  });
});
