import { useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Play,
  Square,
  X,
  Server,
  Clock,
  Terminal,
  Wifi,
  Monitor,
  Hash,
} from 'lucide-react';
import { useConfigurations } from '@/api/configurations';
import { useStartSession, useStopSession } from '@/api/sessions';
import { useSessionStore } from '@/hooks/use-session-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/api/client';
import type { TimelineEntry, ProblemReport, FormInteraction } from '@/types';

const statusStyles: Record<string, { dotColor: string; label: string; badgeCls: string }> = {
  running: {
    dotColor: 'bg-emerald-500',
    label: 'Running',
    badgeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  completed: {
    dotColor: 'bg-blue-500',
    label: 'Completed',
    badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  failed: {
    dotColor: 'bg-red-500',
    label: 'Failed',
    badgeCls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800',
  },
};

export function SessionControl() {
  const [configId, setConfigId] = useState('');
  const { data: configs } = useConfigurations();
  const startMutation = useStartSession();
  const stopMutation = useStopSession();
  const ws = useWebSocket();

  const activeSession = useSessionStore((s) => s.activeSession);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const updateSessionStatus = useSessionStore((s) => s.updateSessionStatus);
  const setTimeline = useSessionStore((s) => s.setTimeline);
  const setReports = useSessionStore((s) => s.setReports);
  const setForms = useSessionStore((s) => s.setForms);
  const clearSession = useSessionStore((s) => s.clearSession);

  const handleStart = async () => {
    if (!configId) return;
    const session = await startMutation.mutateAsync(configId);
    setActiveSession(session);

    ws.connect();
    setTimeout(() => ws.joinSession(session.id), 500);

    const [timeline, reports, forms] = await Promise.all([
      api.get<TimelineEntry[]>(`/sessions/${session.id}/timeline`),
      api.get<ProblemReport[]>(`/sessions/${session.id}/reports`),
      api.get<FormInteraction[]>(`/sessions/${session.id}/forms`),
    ]);
    setTimeline(timeline);
    setReports(reports);
    setForms(forms);
  };

  const handleStop = async () => {
    if (!activeSession) return;
    await stopMutation.mutateAsync(activeSession.id);
    updateSessionStatus('completed');
    ws.leaveSession(activeSession.id);
  };

  const handleClose = () => {
    if (activeSession) ws.leaveSession(activeSession.id);
    clearSession();
    ws.disconnect();
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center py-6 max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 mb-4">
              <Server className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Start a Diagnostic Scan
            </h3>
            <p className="text-2sm text-muted-foreground mb-6">
              Select a server configuration and start an AI-powered performance analysis.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full max-w-sm">
              <div className="grow">
                <Select value={configId} onValueChange={setConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select configuration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {configs?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.connectionType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStart}
                disabled={!configId || startMutation.isPending}
                className="shrink-0"
              >
                {startMutation.isPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="me-2 h-4 w-4" />
                )}
                Start Scan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusCfg = statusStyles[activeSession.status] ?? statusStyles.completed;
  const selectedConfig = configs?.find((c) => c.id === activeSession.configurationId);
  const hostLabel =
    selectedConfig?.connectionType === 'ssh'
      ? `${selectedConfig.sshUsername ?? 'user'}@${selectedConfig.sshHost}`
      : 'localhost';

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: session info */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950">
              <Terminal className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {selectedConfig?.name ?? 'Diagnostic Scan'}
                </h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusCfg.badgeCls}`}>
                  {activeSession.status === 'running' ? (
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusCfg.dotColor} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${statusCfg.dotColor}`} />
                    </span>
                  ) : (
                    <span className={`inline-flex rounded-full h-2 w-2 ${statusCfg.dotColor}`} />
                  )}
                  {statusCfg.label}
                </span>
              </div>

              {/* Metadata grid */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="text-2sm">
                    {selectedConfig?.connectionType === 'ssh' ? 'SSH' : 'Local'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="text-2sm font-mono">{hostLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-2sm">
                    {new Date(activeSession.startedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span className="text-2sm font-mono">
                    {activeSession.id.substring(0, 8)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0 sm:pt-1">
            {activeSession.status === 'running' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStop}
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? (
                  <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="me-1.5 h-3.5 w-3.5" />
                )}
                Stop Scan
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X className="me-1.5 h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
