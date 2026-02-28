import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimelineEntry, TimelineEntryType } from '../../database/entities/index.js';
import { Subject, Observable } from 'rxjs';

export interface TimelineEvent {
  sessionId: string;
  entry: TimelineEntry;
}

@Injectable()
export class TimelineService {
  private readonly timelineSubject = new Subject<TimelineEvent>();

  constructor(
    @InjectRepository(TimelineEntry)
    private readonly timelineRepo: Repository<TimelineEntry>,
  ) {}

  get events$(): Observable<TimelineEvent> {
    return this.timelineSubject.asObservable();
  }

  async addEntry(
    sessionId: string,
    type: TimelineEntryType,
    description: string,
    metadata?: Record<string, unknown>,
    reasoning?: string,
  ): Promise<TimelineEntry> {
    const entry = this.timelineRepo.create({
      sessionId,
      type,
      description,
      metadata,
      reasoning,
    });

    const saved = await this.timelineRepo.save(entry);

    this.timelineSubject.next({ sessionId, entry: saved });

    return saved;
  }

  async logToolExecution(
    sessionId: string,
    toolName: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<TimelineEntry> {
    return this.addEntry(
      sessionId,
      TimelineEntryType.TOOL_EXECUTION,
      `Executing tool: ${toolName} - ${description}`,
      { toolName, ...metadata },
    );
  }

  async logProblemDetected(
    sessionId: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<TimelineEntry> {
    return this.addEntry(sessionId, TimelineEntryType.PROBLEM_DETECTED, description, metadata);
  }

  async logAgentDecision(
    sessionId: string,
    description: string,
    reasoning?: string,
  ): Promise<TimelineEntry> {
    return this.addEntry(
      sessionId,
      TimelineEntryType.AGENT_DECISION,
      description,
      undefined,
      reasoning,
    );
  }

  async logUserInteraction(
    sessionId: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<TimelineEntry> {
    return this.addEntry(sessionId, TimelineEntryType.USER_INTERACTION, description, metadata);
  }

  async logInfo(
    sessionId: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<TimelineEntry> {
    return this.addEntry(sessionId, TimelineEntryType.INFO, description, metadata);
  }

  async logError(
    sessionId: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<TimelineEntry> {
    return this.addEntry(sessionId, TimelineEntryType.ERROR, description, metadata);
  }

  async getBySession(sessionId: string): Promise<TimelineEntry[]> {
    return this.timelineRepo.find({
      where: { sessionId },
      order: { timestamp: 'ASC' },
    });
  }
}
