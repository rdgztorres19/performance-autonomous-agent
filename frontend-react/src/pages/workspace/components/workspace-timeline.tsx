import { useEffect, useRef, useState } from 'react';


import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MetricsDialog } from '@/components/metrics/metrics-dialog';
import { useSessionStore } from '@/hooks/use-session-store';
import {
  Info,
  AlertTriangle,
  AlertCircle,
  Brain,
  Wrench,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEntryType, VisualizationSpec } from '@/types';

const typeConfig: Record<
  TimelineEntryType,
  { label: string; icon: LucideIcon; color: string; dotColor: string }
> = {
  info:             { label: 'INFO',     icon: Info,           color: 'text-gray-500 dark:text-gray-400',    dotColor: 'bg-gray-400 dark:bg-gray-500' },
  error:            { label: 'ERROR',    icon: AlertCircle,    color: 'text-red-600 dark:text-red-400',      dotColor: 'bg-red-500' },
  problem_detected: { label: 'PROBLEM',  icon: AlertTriangle,  color: 'text-amber-600 dark:text-amber-400',  dotColor: 'bg-amber-500' },
  agent_decision:   { label: 'DECISION', icon: Brain,          color: 'text-blue-600 dark:text-blue-400',    dotColor: 'bg-blue-500' },
  tool_execution:   { label: 'TOOL',     icon: Wrench,         color: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500' },
  user_interaction: { label: 'USER',     icon: MessageSquare,  color: 'text-sky-600 dark:text-sky-400',      dotColor: 'bg-sky-500' },
};

export function WorkspaceTimeline() {
  const timeline = useSessionStore((s) => s.timeline);
  const activeSession = useSessionStore((s) => s.activeSession);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [metricsEntry, setMetricsEntry] = useState<{
    toolName: string;
    data: Record<string, unknown>;
    visualization: VisualizationSpec;
  } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline.length]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (timeline.length === 0) {
    const isWaitingForAgent =
      activeSession?.status === 'running';
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
        {isWaitingForAgent ? (
          <>
            <Loader2 className="h-8 w-8 mb-3 animate-spin opacity-60" />
            <p className="text-sm">Connecting and preparing agent...</p>
            <p className="text-xs mt-0.5 opacity-70">
              The agent is initializing. You will see activity here shortly.
            </p>
          </>
        ) : (
          <>
            <Info className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No activity yet</p>
            <p className="text-xs mt-0.5 opacity-70">Run a scan to see agent activity here.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="font-mono text-xs">
        {timeline.map((entry) => {
          const cfg = typeConfig[entry.type] ?? typeConfig.info;
          const isOpen = expanded.has(entry.id);
          const canExpand = entry.description.length > 60 || !!entry.reasoning;
          const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false });

          return (
            <div
              key={entry.id}
              className={cn(
                'flex items-start gap-0 border-b border-border/50 hover:bg-muted/30 transition-colors group',
                entry.type === 'error' && 'bg-red-500/5',
              )}
            >
              {/* Time column */}
              <div className="w-[72px] shrink-0 py-2 ps-3 text-muted-foreground select-none">
                {time}
              </div>

              {/* Dot + type */}
              <div className="w-[80px] shrink-0 py-2 flex items-center gap-1.5">
                <span className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0', cfg.dotColor)} />
                <span className={cn('font-semibold tracking-wide', cfg.color)}>
                  {cfg.label}
                </span>
              </div>

              {/* Content */}
              <div className="grow py-2 pe-3 min-w-0">
                {canExpand ? (
                  <Collapsible open={isOpen} onOpenChange={() => toggle(entry.id)}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-start gap-1 w-full text-left cursor-pointer group/trigger">
                        <ChevronRight
                          className={cn(
                            'h-3 w-3 mt-0.5 shrink-0 text-muted-foreground transition-transform',
                            isOpen && 'rotate-90',
                          )}
                        />
                        <span className="text-foreground leading-relaxed break-words">
                          {isOpen ? entry.description : (
                            entry.description.length > 90
                              ? entry.description.substring(0, 90) + '…'
                              : entry.description
                          )}
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {entry.reasoning && (
                        <div className="ms-4 mt-1.5 ps-2.5 border-s-2 border-blue-400/40 dark:border-blue-500/40">
                          <p className="text-muted-foreground italic leading-relaxed">
                            {entry.reasoning}
                          </p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <p className="text-foreground leading-relaxed break-words">
                    {entry.description}
                  </p>
                )}
              </div>

              {/* Chart button for tool executions with visualization data */}
              {entry.type === 'tool_execution' && entry.metadata?.visualization && entry.metadata?.output && (
                <div className="shrink-0 py-2 pe-3">
                  <button
                    onClick={() => setMetricsEntry({
                      toolName: String(entry.metadata?.toolName ?? ''),
                      data: entry.metadata!.output as Record<string, unknown>,
                      visualization: entry.metadata!.visualization as VisualizationSpec,
                    })}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    title="View metrics chart"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {metricsEntry && (
        <MetricsDialog
          open={!!metricsEntry}
          onOpenChange={(open) => { if (!open) setMetricsEntry(null); }}
          toolName={metricsEntry.toolName}
          data={metricsEntry.data}
          visualization={metricsEntry.visualization}
        />
      )}
    </ScrollArea>
  );
}
