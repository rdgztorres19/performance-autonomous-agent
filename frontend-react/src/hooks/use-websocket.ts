import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { environment } from '../config/environment';
import { useSessionStore } from './use-session-store';
import type { TimelineEntry, ProblemReport, FormInteraction } from '../types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

let sharedSocket: Socket | null = null;
let sharedStatus: ConnectionStatus = 'disconnected';
const statusListeners = new Set<() => void>();

function getStatus() {
  return sharedStatus;
}

function setStatus(next: ConnectionStatus) {
  sharedStatus = next;
  statusListeners.forEach((l) => l());
}

function subscribeStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

export function useWebSocket() {
  const status = useSyncExternalStore(subscribeStatus, getStatus);
  const queryClient = useQueryClient();

  const appendTimeline = useSessionStore((s) => s.appendTimeline);
  const appendReport = useSessionStore((s) => s.appendReport);
  const appendForm = useSessionStore((s) => s.appendForm);

  const connect = useCallback(() => {
    if (sharedSocket?.connected) return;

    if (sharedSocket) {
      sharedSocket.removeAllListeners();
      sharedSocket.disconnect();
    }

    setStatus('connecting');

    const socket = io(environment.wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));

    socket.on('timeline:entry', (entry: TimelineEntry) => {
      useSessionStore.getState().appendTimeline(entry);
    });
    socket.on('report:new', (report: ProblemReport) => {
      useSessionStore.getState().appendReport(report);
    });
    socket.on('form:request', (form: FormInteraction) => {
      useSessionStore.getState().appendForm(form);
    });
    socket.on('config:status', () => {
      queryClient.invalidateQueries({ queryKey: ['configurations'] });
    });

    sharedSocket = socket;
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (sharedSocket) {
      sharedSocket.removeAllListeners();
      sharedSocket.disconnect();
      sharedSocket = null;
      setStatus('disconnected');
    }
  }, []);

  const joinSession = useCallback((sessionId: string) => {
    sharedSocket?.emit('session:join', { sessionId });
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    sharedSocket?.emit('session:leave', { sessionId });
  }, []);

  const submitForm = useCallback(
    (formId: string, response: Record<string, unknown>): Promise<{ success: boolean }> => {
      return new Promise((resolve, reject) => {
        if (!sharedSocket?.connected) {
          reject(new Error('WebSocket not connected'));
          return;
        }
        sharedSocket.emit('form:submit', { formId, response });
        resolve({ success: true });
      });
    },
    [],
  );

  return { status, connect, disconnect, joinSession, leaveSession, submitForm };
}
