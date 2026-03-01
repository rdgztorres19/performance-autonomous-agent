import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environments/environment';
import type { TimelineEntry, ProblemReport, FormInteraction } from '../models';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private currentSessionId: string | null = null;

  private readonly statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  private readonly timelineSubject = new Subject<TimelineEntry>();
  private readonly reportSubject = new Subject<ProblemReport>();
  private readonly formRequestSubject = new Subject<FormInteraction>();

  readonly status$ = this.statusSubject.asObservable();
  readonly timeline$ = this.timelineSubject.asObservable();
  readonly reports$ = this.reportSubject.asObservable();
  readonly formRequests$ = this.formRequestSubject.asObservable();

  connect(): void {
    if (this.socket?.connected) return;

    this.statusSubject.next('connecting');

    this.socket = io(environment.wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.statusSubject.next('connected');
      if (this.currentSessionId) {
        this.socket!.emit('session:join', { sessionId: this.currentSessionId });
      }
    });

    this.socket.on('disconnect', () => {
      this.statusSubject.next('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.statusSubject.next('disconnected');
    });

    this.socket.on('timeline:entry', (entry: TimelineEntry) => {
      this.timelineSubject.next(entry);
    });

    this.socket.on('report:new', (report: ProblemReport) => {
      this.reportSubject.next(report);
    });

    this.socket.on('form:request', (form: FormInteraction) => {
      this.formRequestSubject.next(form);
    });
  }

  joinSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    if (this.socket?.connected) {
      this.socket.emit('session:join', { sessionId });
    }
  }

  leaveSession(sessionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('session:leave', { sessionId });
    }
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  submitForm(formId: string, response: Record<string, unknown>): Observable<{ success: boolean }> {
    return new Observable((subscriber) => {
      if (!this.socket?.connected) {
        subscriber.error(new Error('WebSocket not connected'));
        return;
      }
      this.socket.emit('form:submit', { formId, response }, (ack: { success: boolean }) => {
        subscriber.next(ack);
        subscriber.complete();
      });
    });
  }

  disconnect(): void {
    if (this.currentSessionId) {
      this.leaveSession(this.currentSessionId);
    }
    this.socket?.disconnect();
    this.socket = null;
    this.statusSubject.next('disconnected');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
