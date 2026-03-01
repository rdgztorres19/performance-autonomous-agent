import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSessionStore } from '@/hooks/use-session-store';
import { useConfigurations } from '@/api/configurations';
import {
  Server,
  Clock,
  Hash,
  Wifi,
  Monitor,
  Cpu,
  Activity,
  Wrench,
  AlertTriangle,
  Brain,
} from 'lucide-react';

export function WorkspaceSidebar() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const timeline = useSessionStore((s) => s.timeline);
  const reports = useSessionStore((s) => s.reports);
  const { data: configs } = useConfigurations();

  const selectedConfig = activeSession
    ? configs?.find((c) => c.id === activeSession.configurationId)
    : null;

  const toolExecutions = timeline.filter((e) => e.type === 'tool_execution').length;
  const decisions = timeline.filter((e) => e.type === 'agent_decision').length;

  const duration = activeSession?.startedAt
    ? Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000)
    : 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 px-4">
        <Server className="h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm text-center">No active session</p>
        <p className="text-xs mt-0.5 opacity-70 text-center">Select a config and run a scan.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 text-sm">
      {/* Session Info */}
      <section>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Session
        </h4>
        <div className="space-y-2.5">
          <InfoRow icon={Hash} label="ID" value={activeSession.id.substring(0, 12)} mono />
          <InfoRow
            icon={Server}
            label="Config"
            value={selectedConfig?.name ?? '—'}
          />
          <InfoRow
            icon={selectedConfig?.connectionType === 'ssh' ? Wifi : Monitor}
            label="Connection"
            value={
              selectedConfig?.connectionType === 'ssh'
                ? `SSH → ${selectedConfig.sshHost}`
                : 'Local'
            }
          />
          <InfoRow
            icon={Cpu}
            label="Model"
            value={selectedConfig?.openaiModel ?? 'gpt-4o'}
            mono
          />
          <InfoRow
            icon={Clock}
            label="Started"
            value={new Date(activeSession.startedAt).toLocaleTimeString()}
          />
          <InfoRow
            icon={Clock}
            label="Duration"
            value={`${mins}m ${secs}s`}
          />
        </div>
      </section>

      <Separator />

      {/* Counters */}
      <section>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Metrics
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard icon={Activity} label="Events" value={timeline.length} color="text-blue-500" />
          <MetricCard icon={Wrench} label="Tools" value={toolExecutions} color="text-emerald-500" />
          <MetricCard icon={AlertTriangle} label="Issues" value={reports.length} color="text-amber-500" />
          <MetricCard icon={Brain} label="Decisions" value={decisions} color="text-violet-500" />
        </div>
      </section>

      <Separator />

      {/* Recent tools */}
      <section>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recent Tools
        </h4>
        <div className="space-y-1">
          {timeline
            .filter((e) => e.type === 'tool_execution')
            .slice(-5)
            .reverse()
            .map((e) => {
              const toolName = e.description.match(/tool:\s*(\S+)/i)?.[1] ?? 'unknown';
              return (
                <div key={e.id} className="flex items-center gap-2 py-1">
                  <Wrench className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="text-xs text-foreground font-mono truncate">{toolName}</span>
                  <span className="text-2xs text-muted-foreground ms-auto shrink-0">
                    {new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              );
            })}
          {toolExecutions === 0 && (
            <p className="text-xs text-muted-foreground italic">No tools executed yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-xs text-foreground truncate text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-2xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
