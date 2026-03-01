import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { WebSocketService } from './websocket.service';
import type { Session, TimelineEntry, ProblemReport, FormInteraction } from '../models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly activeSession = signal<Session | null>(null);
  readonly timeline = signal<TimelineEntry[]>([]);
  readonly reports = signal<ProblemReport[]>([]);
  readonly pendingForms = signal<FormInteraction[]>([]);
  readonly isRunning = computed(() => this.activeSession()?.status === 'running');

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(
    private readonly api: ApiService,
    private readonly ws: WebSocketService,
  ) {
    this.ws.timeline$.subscribe((entry) => {
      this.timeline.update((t) => [...t, entry]);
    });

    this.ws.reports$.subscribe((report) => {
      this.reports.update((r) => [...r, report]);
    });

    this.ws.formRequests$.subscribe((form) => {
      this.pendingForms.update((f) => [...f, form]);
    });
  }

  async startSession(configurationId: string): Promise<void> {
    this.loadingSubject.next(true);
    this.timeline.set([]);
    this.reports.set([]);
    this.pendingForms.set([]);

    try {
      const session = await this.api.startSession(configurationId).toPromise();
      if (!session) throw new Error('Failed to start session');

      this.activeSession.set(session);
      this.ws.connect();
      this.ws.joinSession(session.id);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async stopSession(): Promise<void> {
    const session = this.activeSession();
    if (!session) return;

    await this.api.stopSession(session.id).toPromise();
    this.ws.leaveSession(session.id);
    this.activeSession.update((s) => (s ? { ...s, status: 'completed' as const } : null));
  }

  async submitForm(formId: string, response: Record<string, unknown>): Promise<void> {
    await this.ws.submitForm(formId, response).toPromise();
    this.pendingForms.update((forms) =>
      forms.map((f) =>
        f.id === formId ? { ...f, status: 'submitted' as const, response } : f,
      ),
    );
  }

  async loadSession(sessionId: string): Promise<void> {
    this.loadingSubject.next(true);
    try {
      const [session, timeline, reports, forms] = await Promise.all([
        this.api.getSession(sessionId).toPromise(),
        this.api.getTimeline(sessionId).toPromise(),
        this.api.getReports(sessionId).toPromise(),
        this.api.getForms(sessionId).toPromise(),
      ]);

      this.activeSession.set(session ?? null);
      this.timeline.set(timeline ?? []);
      this.reports.set(reports ?? []);
      this.pendingForms.set((forms ?? []).filter((f) => f.status === 'pending'));

      if (session?.status === 'running') {
        this.ws.connect();
        this.ws.joinSession(session.id);
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  clearSession(): void {
    const session = this.activeSession();
    if (session) {
      this.ws.leaveSession(session.id);
    }
    this.activeSession.set(null);
    this.timeline.set([]);
    this.reports.set([]);
    this.pendingForms.set([]);
  }
}
