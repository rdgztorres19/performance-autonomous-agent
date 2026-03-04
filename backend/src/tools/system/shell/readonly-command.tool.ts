import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

/** Dangerous patterns for read-only validation. Rejects commands that could modify the system. */
const BLOCKED_COMMANDS = [
  'rm',
  'rmdir',
  'mkdir',
  'touch',
  'chmod',
  'chown',
  'chgrp',
  'cp',
  'mv',
  'dd',
  'mkfs',
  'sudo',
  'scp',
  'rsync',
  'wget',
  'curl',
  'eval',
  'ncat',
];

function isReadOnlyCommand(command: string): { valid: boolean; reason?: string } {
  const trimmed = command.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Empty command' };
  }

  // Block append redirect
  if (trimmed.includes('>>')) {
    return { valid: false, reason: 'Redirect >> is not allowed (write operation)' };
  }

  // Block tee (writes to file)
  if (/\|\s*tee\s/.test(trimmed)) {
    return { valid: false, reason: 'Pipe to tee is not allowed (write operation)' };
  }

  // Block dangerous commands (word boundaries)
  for (const cmd of BLOCKED_COMMANDS) {
    if (new RegExp(`\\b${cmd}\\b`, 'i').test(trimmed)) {
      return { valid: false, reason: `Command '${cmd}' is not allowed (write/modify operation)` };
    }
  }

  // Block redirect to file — allow only 2>&1 and >/dev/null (common for suppressing output)
  const withoutSafeRedirects = trimmed
    .replace(/2>&1/g, '')
    .replace(/>\s*\/dev\/null/g, '')
    .replace(/2>\s*\/dev\/null/g, '')
    .replace(/1>\s*\/dev\/null/g, '');

  if (withoutSafeRedirects.includes('>')) {
    return { valid: false, reason: 'Output redirection > is not allowed (write operation)' };
  }

  return { valid: true };
}

export class ReadonlyCommandTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'readonly_command',
      description:
        'Executes a read-only shell command on the target system. Use for diagnostics when no specific tool exists. Generates OS-appropriate commands: Linux (df, cat /proc/..., ls, grep), macOS (df, sysctl, ls, top). Only read operations allowed — no rm, mkdir, cp, redirects to files, etc.',
      category: ToolCategory.SHELL,
      level: MetricLevel.SYSTEM,
      platform: ['linux', 'darwin'],
      parameters: [
        {
          name: 'command',
          description:
            'Read-only command to execute. Use Linux syntax (cat /proc/..., df -h) for Linux, macOS syntax (sysctl, df) for darwin. Examples: "df -h", "cat /proc/loadavg", "sysctl -n vm.loadavg" (macOS), "ls -la /var/log"',
          type: 'string',
          required: true,
        },
        {
          name: 'os',
          description:
            'Target OS hint: "linux" or "darwin" (macOS). Use so the agent picks the right command variant.',
          type: 'string',
          required: false,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const command = params['command'];
    if (typeof command !== 'string') {
      throw new Error('Parameter "command" is required and must be a string');
    }

    const { valid, reason } = isReadOnlyCommand(command);
    if (!valid) {
      throw new Error(`Read-only validation failed: ${reason}`);
    }

    return command;
  }

  protected parseOutput(stdout: string, stderr: string): Record<string, unknown> {
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      stdoutLines: stdout.trim() ? stdout.trim().split('\n') : [],
    };
  }
}
