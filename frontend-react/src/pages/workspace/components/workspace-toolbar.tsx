import { useState } from 'react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Square,
  Loader2,
  Wifi,
  WifiOff,
  Monitor,
  Clock,
  Zap,
} from 'lucide-react';
import { useConfigurations } from '@/api/configurations';
import { useStartSession, useStopSession } from '@/api/sessions';
import { useSessionStore } from '@/hooks/use-session-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/api/client';
import type { TimelineEntry, ProblemReport, FormInteraction } from '@/types';

const statusDot: Record<string, string> = {
  running: 'bg-emerald-500',
  completed: 'bg-blue-500',
  failed: 'bg-red-500',
};

export function WorkspaceToolbar() {
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
  const timeline = useSessionStore((s) => s.timeline);
  const reports = useSessionStore((s) => s.reports);

  const selectedConfig = configs?.find((c) =>
    activeSession ? c.id === activeSession.configurationId : c.id === configId,
  );

  const handleStart = async () => {
    if (!configId) return;
    const session = await startMutation.mutateAsync(configId);
    setActiveSession(session);
    ws.connect();
    setTimeout(() => ws.joinSession(session.id), 200);
    const [tl, rp, fm] = await Promise.all([
      api.get<TimelineEntry[]>(`/sessions/${session.id}/timeline`),
      api.get<ProblemReport[]>(`/sessions/${session.id}/reports`),
      api.get<FormInteraction[]>(`/sessions/${session.id}/forms`),
    ]);
    setTimeline(tl);
    setReports(rp);
    setForms(fm);
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

  const hostLabel = selectedConfig
    ? selectedConfig.connectionType === 'ssh'
      ? `${selectedConfig.sshUsername ?? 'user'}@${selectedConfig.sshHost}`
      : 'localhost'
    : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card">
        {/* Left: config selector or active session info */}
        <div className="flex items-center gap-2 grow min-w-0">
          <Zap className="h-4 w-4 text-blue-500 shrink-0" />

          {!activeSession ? (
            <>
              <Select value={configId} onValueChange={setConfigId}>
                <SelectTrigger className="h-8 w-[260px] text-xs font-mono">
                  <SelectValue placeholder="Select configuration..." />
                </SelectTrigger>
                <SelectContent>
                  {configs?.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-mono">
                      {c.name} — {c.connectionType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="h-8 px-4 text-xs font-medium"
                onClick={handleStart}
                disabled={!configId || startMutation.isPending}
              >
                {startMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 me-1.5" />
                )}
                Run Scan
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-foreground truncate">
                {selectedConfig?.name ?? 'Scan'}
              </span>

              <div className="flex items-center gap-1 ms-1">
                {activeSession.status === 'running' ? (
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusDot[activeSession.status]} opacity-75`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDot[activeSession.status]}`} />
                  </span>
                ) : (
                  <span className={`inline-flex rounded-full h-2 w-2 ${statusDot[activeSession.status] ?? statusDot.completed}`} />
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {activeSession.status}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-3 ms-3 text-xs text-muted-foreground border-s border-border ps-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      {selectedConfig?.connectionType === 'ssh' ? (
                        <Wifi className="h-3 w-3" />
                      ) : (
                        <Monitor className="h-3 w-3" />
                      )}
                      <span className="font-mono">{hostLabel}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Connection target</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(activeSession.startedAt).toLocaleTimeString()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Started at</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>

        {/* Right: stats + actions */}
        {activeSession && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 me-1">
              <Badge variant="secondary" className="text-2xs font-mono h-6">
                {timeline.length} events
              </Badge>
              <Badge
                variant={reports.length > 0 ? 'destructive' : 'secondary'}
                className="text-2xs font-mono h-6"
              >
                {reports.length} issues
              </Badge>
            </div>

            {activeSession.status === 'running' ? (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleStop}
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5 me-1" />
                )}
                Stop
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleClose}
              >
                Close
              </Button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
