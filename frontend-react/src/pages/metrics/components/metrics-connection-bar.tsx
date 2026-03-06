import { memo, useCallback, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Link2, Server, Clock } from 'lucide-react';
import { useConfigurations } from '@/api/configurations';
import { useSessions } from '@/api/sessions';
import { api } from '@/api/client';
import type { TimelineEntry } from '@/types';
import { cn } from '@/lib/utils';

export interface MetricsConnectionBarProps {
  configId: string;
  onConfigChange: (id: string) => void;
  sessionId: string | null;
  onSessionChange: (id: string | null) => void;
  onTimelineLoaded: (entries: TimelineEntry[]) => void;
  className?: string;
}

function MetricsConnectionBarInner({
  configId,
  onConfigChange,
  sessionId,
  onSessionChange,
  onTimelineLoaded,
  className,
}: MetricsConnectionBarProps) {
  const { data: configs } = useConfigurations();
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useSessions();

  const sessionsForConfig =
    configId && configId !== '_'
      ? (sessions?.filter((s) => s.configurationId === configId) ?? [])
      : (sessions ?? []);

  const loadTimeline = useCallback(
    async (sid: string) => {
      try {
        const entries = await api.get<TimelineEntry[]>(`/sessions/${sid}/timeline`);
        onTimelineLoaded(entries);
      } catch {
        onTimelineLoaded([]);
      }
    },
    [onTimelineLoaded],
  );

  useEffect(() => {
    if (sessionId) {
      loadTimeline(sessionId);
    } else {
      onTimelineLoaded([]);
    }
  }, [sessionId, loadTimeline, onTimelineLoaded]);

  const handleConfigChange = (id: string) => {
    onConfigChange(id);
    onSessionChange(null);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-muted/30',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Link2 className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide">
          Connection
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={configId || '_'}
          onValueChange={(v) => v !== '_' && handleConfigChange(v)}
        >
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Select configuration..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_" disabled>
              Select configuration...
            </SelectItem>
            {configs?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{c.name}</span>
                  <Badge variant="secondary" className="text-2xs">
                    {c.connectionType}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <span className="text-muted-foreground/60 text-sm">→</span>

      <div className="flex items-center gap-2">
        <Select
          value={sessionId || '_'}
          onValueChange={(v) => onSessionChange(v === '_' ? null : v)}
          disabled={sessionsForConfig.length === 0}
        >
          <SelectTrigger className="w-[240px] h-9">
            <SelectValue placeholder="Load from session..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">
              Load from session...
            </SelectItem>
            {sessionsForConfig.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{s.id.substring(0, 8)}</span>
                  <Badge
                    variant={s.status === 'running' ? 'default' : 'secondary'}
                    className="text-2xs"
                  >
                    {s.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(s.startedAt).toLocaleDateString()}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => refetchSessions()}
          disabled={sessionsLoading}
          title="Refresh sessions"
        >
          <RefreshCw className={cn('h-4 w-4', sessionsLoading && 'animate-spin')} />
        </Button>
      </div>

      {configId && configId !== '_' && sessionsForConfig.length === 0 && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          No sessions for this config. Run a scan in Workspace first.
        </span>
      )}
    </div>
  );
}

export const MetricsConnectionBar = memo(MetricsConnectionBarInner);
