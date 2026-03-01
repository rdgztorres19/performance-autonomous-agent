import { Card, CardContent } from '@/components/ui/card';
import { Activity, AlertTriangle, Clock, Wrench } from 'lucide-react';
import { useSessionStore } from '@/hooks/use-session-store';

export function MetricsOverview() {
  const timeline = useSessionStore((s) => s.timeline);
  const reports = useSessionStore((s) => s.reports);
  const activeSession = useSessionStore((s) => s.activeSession);

  const toolExecutions = timeline.filter((e) => e.type === 'tool_execution').length;
  const criticalCount = reports.filter((r) => r.severity === 'critical').length;
  const warningCount = reports.filter((r) => r.severity === 'warning').length;

  const duration = activeSession?.startedAt
    ? Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000)
    : 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
      <Card>
        <CardContent className="flex items-center gap-3.5 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{timeline.length}</p>
            <p className="text-2sm text-muted-foreground">Timeline Events</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3.5 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
            <Wrench className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{toolExecutions}</p>
            <p className="text-2sm text-muted-foreground">Tools Executed</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3.5 p-5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
            criticalCount > 0
              ? 'bg-red-100 dark:bg-red-950'
              : warningCount > 0
                ? 'bg-amber-100 dark:bg-amber-950'
                : 'bg-muted'
          }`}>
            <AlertTriangle className={`h-6 w-6 ${
              criticalCount > 0
                ? 'text-red-600 dark:text-red-400'
                : warningCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
            }`} />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{reports.length}</p>
            <p className="text-2sm text-muted-foreground">Problems Found</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3.5 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
            <Clock className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{mins}m {secs}s</p>
            <p className="text-2sm text-muted-foreground">Duration</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
