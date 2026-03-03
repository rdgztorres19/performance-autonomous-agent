import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TerminalSessionService } from './terminal-session.service.js';
import { TerminalAutocompleteService } from './terminal-autocomplete.service.js';
import { TerminalAskService } from './terminal-ask.service.js';

@WebSocketGateway({ namespace: 'terminal', cors: { origin: '*' } })
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TerminalGateway.name);

  constructor(
    private readonly sessionService: TerminalSessionService,
    private readonly autocompleteService: TerminalAutocompleteService,
    private readonly askService: TerminalAskService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Terminal client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.sessionService.destroySession(client.id);
    this.logger.log(`Terminal client disconnected: ${client.id}`);
  }

  @SubscribeMessage('terminal:connect')
  async handleConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { configurationId: string; rows?: number; cols?: number },
  ): Promise<void> {
    const { configurationId } = data;
    const rows = data.rows ?? 24;
    const cols = data.cols ?? 80;

    try {
      await this.sessionService.createSession(client.id, configurationId, { rows, cols });
      const session = this.sessionService.getSession(client.id);
      if (!session) throw new Error('Session not created');

      // Pipe stream output to client
      const stream = session.stream;
      const emitOutput = (chunk: Buffer | string) => {
        client.emit('terminal:output', { data: typeof chunk === 'string' ? chunk : chunk.toString() });
      };

      if ('onData' in stream && typeof stream.onData === 'function') {
        // node-pty IPty
        (stream as import('node-pty').IPty).onData(emitOutput);
        (stream as import('node-pty').IPty).onExit(() => {
          this.sessionService.destroySession(client.id);
          client.emit('terminal:output', { data: '\r\n\nSession closed.\r\n' });
        });
      } else {
        // ssh2 ClientChannel
        const ch = stream as import('ssh2').ClientChannel;
        ch.on('data', emitOutput);
        if (ch.stderr) ch.stderr.on('data', emitOutput);
        ch.on('close', () => {
          this.sessionService.destroySession(client.id);
          client.emit('terminal:output', { data: '\r\n\nSession closed.\r\n' });
        });
      }

      client.emit('terminal:ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Terminal connect failed: ${msg}`);
      client.emit('terminal:error', { message: msg });
    }
  }

  @SubscribeMessage('terminal:data')
  handleData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { data: string },
  ): void {
    this.sessionService.write(client.id, data.data ?? '');
  }

  @SubscribeMessage('terminal:resize')
  handleResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rows: number; cols: number },
  ): void {
    this.sessionService.resize(client.id, data.rows ?? 24, data.cols ?? 80);
  }

  @SubscribeMessage('terminal:autocomplete')
  async handleAutocomplete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { configurationId: string; line: string; cursorIndex?: number; context?: string },
  ): Promise<void> {
    const { configurationId, line, cursorIndex, context } = data ?? {};
    if (!configurationId || line == null) {
      client.emit('terminal:suggestions', { items: [] });
      return;
    }
    try {
      const items = await this.autocompleteService.suggest(configurationId, line, cursorIndex, context);
      client.emit('terminal:suggestions', { items });
    } catch {
      client.emit('terminal:suggestions', { items: [] });
    }
  }

  @SubscribeMessage('terminal:ask')
  async handleAsk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { configurationId: string; selectedText: string; question: string },
  ): Promise<void> {
    const { configurationId, selectedText, question } = data ?? {};
    if (!configurationId || selectedText == null || question == null) {
      client.emit('terminal:askResponse', { error: 'Missing configurationId, selectedText, or question' });
      return;
    }
    try {
      const result = await this.askService.ask(configurationId, selectedText, question);
      client.emit('terminal:askResponse', result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      client.emit('terminal:askResponse', { error: msg });
    }
  }
}
