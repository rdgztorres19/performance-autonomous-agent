import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

interface PendingInteraction {
  formId: string;
  sessionId: string;
  resolve: (response: Record<string, unknown>) => void;
  reject: (reason: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

export interface UserResponseEvent {
  sessionId: string;
  formId: string;
  response: Record<string, unknown>;
}

@Injectable()
export class UserInteractionService {
  private readonly logger = new Logger(UserInteractionService.name);
  private readonly pending = new Map<string, PendingInteraction>();
  private readonly responseSubject = new Subject<UserResponseEvent>();

  private static readonly DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  get responses$(): Observable<UserResponseEvent> {
    return this.responseSubject.asObservable();
  }

  /**
   * Called by the agent tool. Returns a promise that resolves when the
   * user submits the form, or rejects on timeout.
   */
  waitForResponse(
    sessionId: string,
    formId: string,
    timeoutMs = UserInteractionService.DEFAULT_TIMEOUT_MS,
  ): Promise<Record<string, unknown>> {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pending.delete(formId);
        reject(new Error(`User interaction timed out after ${timeoutMs / 1000}s for form ${formId}`));
      }, timeoutMs);

      this.pending.set(formId, {
        formId,
        sessionId,
        resolve,
        reject,
        timeoutHandle,
      });

      this.logger.log(`Waiting for user response on form ${formId} (session ${sessionId})`);
    });
  }

  /**
   * Called when the user submits a form response (via WebSocket).
   * Resolves the pending promise so the agent tool can continue.
   */
  submitResponse(formId: string, response: Record<string, unknown>): boolean {
    const pending = this.pending.get(formId);
    if (!pending) {
      this.logger.warn(`No pending interaction found for form ${formId}`);
      return false;
    }

    clearTimeout(pending.timeoutHandle);
    this.pending.delete(formId);

    this.responseSubject.next({
      sessionId: pending.sessionId,
      formId,
      response,
    });

    pending.resolve(response);
    this.logger.log(`User response received for form ${formId}`);
    return true;
  }

  /**
   * Cancel all pending interactions for a session (e.g. on session stop).
   */
  cancelSession(sessionId: string): void {
    for (const [formId, pending] of this.pending) {
      if (pending.sessionId === sessionId) {
        clearTimeout(pending.timeoutHandle);
        pending.reject(new Error('Session cancelled'));
        this.pending.delete(formId);
      }
    }
  }

  hasPending(sessionId: string): boolean {
    for (const pending of this.pending.values()) {
      if (pending.sessionId === sessionId) return true;
    }
    return false;
  }

  getPendingCount(sessionId: string): number {
    let count = 0;
    for (const pending of this.pending.values()) {
      if (pending.sessionId === sessionId) count++;
    }
    return count;
  }
}
