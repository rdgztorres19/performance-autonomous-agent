import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ClientChannel } from 'ssh2';
import * as pty from 'node-pty';
import { Configuration } from '../database/entities/index.js';
import { SshConnection } from '../connections/impl/ssh.connection.js';

function getLocalShell(): string {
  if (process.platform === 'win32') return 'powershell.exe';
  const shell = process.env.SHELL?.trim();
  if (shell && path.isAbsolute(shell) && fs.existsSync(shell)) return shell;
  const candidates = ['/bin/zsh', '/bin/bash', '/bin/sh'];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'sh';
}

export interface TerminalSession {
  stream: ClientChannel | pty.IPty;
  conn?: SshConnection;
  config: Configuration;
}

@Injectable()
export class TerminalSessionService {
  private readonly sessions = new Map<string, TerminalSession>();

  constructor(
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
  ) {}

  async createSession(
    socketId: string,
    configurationId: string,
    ptyOpts: { rows: number; cols: number },
  ): Promise<TerminalSession> {
    const config = await this.configRepo.findOneByOrFail({ id: configurationId });
    const type = String(config.connectionType).toLowerCase();

    if (type === 'ssh') {
      if (!config.sshHost || !config.sshUsername) {
        throw new Error('SSH host and username are required');
      }
      const sshConn = new SshConnection({
        host: config.sshHost,
        port: config.sshPort ?? 22,
        username: config.sshUsername,
        password: config.sshPassword || undefined,
        privateKey: config.sshPrivateKey || undefined,
      });
      await sshConn.connect();
      const stream = await sshConn.openShell(ptyOpts);
      const session: TerminalSession = { stream, conn: sshConn, config };
      this.sessions.set(socketId, session);
      return session;
    }

    // local
    const shell = getLocalShell();
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm',
      cols: ptyOpts.cols,
      rows: ptyOpts.rows,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
    });
    const session: TerminalSession = { stream: ptyProcess, config };
    this.sessions.set(socketId, session);
    return session;
  }

  getSession(socketId: string): TerminalSession | undefined {
    return this.sessions.get(socketId);
  }

  destroySession(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;

    if (session.conn) {
      session.conn.disconnect().catch(() => {});
    } else if (session.stream && 'kill' in session.stream) {
      (session.stream as pty.IPty).kill();
    }
    this.sessions.delete(socketId);
  }

  resize(socketId: string, rows: number, cols: number): void {
    const session = this.sessions.get(socketId);
    if (!session) return;

    const s = session.stream;
    if ('setWindow' in s && typeof (s as ClientChannel).setWindow === 'function') {
      (s as ClientChannel).setWindow(rows, cols, 0, 0);
    } else if ('resize' in s && typeof (s as pty.IPty).resize === 'function') {
      (s as pty.IPty).resize(cols, rows);
    }
  }

  write(socketId: string, data: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    session.stream.write(data);
  }
}
