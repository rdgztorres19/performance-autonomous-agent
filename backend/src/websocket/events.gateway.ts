import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { ConfigStatusPayload } from '../config/config-status.types.js';
import { TimelineService } from '../agent/services/timeline.service.js';
import { ReportService } from '../agent/services/report.service.js';
import { FormGenerationService } from '../agent/services/form-generation.service.js';
import { UserInteractionService } from '../agent/services/user-interaction.service.js';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly timelineService: TimelineService,
    private readonly reportService: ReportService,
    private readonly formGenerationService: FormGenerationService,
    private readonly userInteractionService: UserInteractionService,
  ) {}

  onModuleInit(): void {
    this.timelineService.events$.subscribe(({ sessionId, entry }) => {
      this.server.to(sessionId).emit('timeline:entry', entry);
    });

    this.reportService.events$.subscribe(({ sessionId, report }) => {
      this.server.to(sessionId).emit('report:new', report);
    });

    this.formGenerationService.formRequests$.subscribe(({ sessionId, formInteraction }) => {
      this.server.to(sessionId).emit('form:request', formInteraction);
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:join')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    client.join(data.sessionId);
    this.logger.log(`Client ${client.id} joined session ${data.sessionId}`);
  }

  @SubscribeMessage('session:leave')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    client.leave(data.sessionId);
    this.logger.log(`Client ${client.id} left session ${data.sessionId}`);
  }

  broadcastConfigStatus(payload: ConfigStatusPayload[]): void {
    this.server.emit('config:status', { configs: payload });
  }

  @SubscribeMessage('form:submit')
  async handleFormSubmit(
    @MessageBody() data: { formId: string; response: Record<string, unknown> },
  ): Promise<{ success: boolean }> {
    await this.formGenerationService.submitResponse(data.formId, data.response);
    this.userInteractionService.submitResponse(data.formId, data.response);
    return { success: true };
  }
}
