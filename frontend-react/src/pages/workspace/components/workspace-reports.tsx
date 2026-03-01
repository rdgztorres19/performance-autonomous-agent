import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSessionStore } from '@/hooks/use-session-store';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Lightbulb,
  ShieldCheck,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProblemSeverity } from '@/types';

const severityStyle: Record<
  ProblemSeverity,
  { icon: LucideIcon; color: string; bg: string; border: string; label: string }
> = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-950',
    border: 'border-s-red-500',
    label: 'CRITICAL',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950',
    border: 'border-s-amber-500',
    label: 'WARNING',
  },
  info: {
    icon: Info,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-950',
    border: 'border-s-sky-500',
    label: 'INFO',
  },
};

export function WorkspaceReports() {
  const reports = useSessionStore((s) => s.reports);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
        <ShieldCheck className="h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm">No issues detected</p>
        <p className="text-xs mt-0.5 opacity-70">Problems will appear here as the agent finds them.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {reports.map((report) => {
          const cfg = severityStyle[report.severity] ?? severityStyle.info;
          const SevIcon = cfg.icon;
          const isOpen = expandedIds.has(report.id);
          const hasDetails =
            !!report.explanation ||
            (report.recommendations && report.recommendations.length > 0) ||
            !!report.metrics;

          return (
            <Collapsible
              key={report.id}
              open={isOpen}
              onOpenChange={() => toggle(report.id)}
            >
              <div className={cn('rounded-lg border border-border overflow-hidden border-s-3', cfg.border)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left px-3.5 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5', cfg.bg)}>
                        <SevIcon size={14} className={cfg.color} />
                      </div>
                      <div className="grow min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-2xs font-bold tracking-wider', cfg.color)}>
                              {cfg.label}
                            </span>
                            <Badge variant="secondary" className="text-2xs h-4 px-1.5">
                              {report.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-2xs text-muted-foreground font-mono">
                              {new Date(report.detectedAt).toLocaleTimeString('en-US', { hour12: false })}
                            </span>
                            {hasDetails && (
                              <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
                            )}
                          </div>
                        </div>
                        <h4 className="text-sm font-medium text-foreground mt-1 leading-snug">
                          {report.title}
                        </h4>
                        {!isOpen && (
                          <p className="text-2sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
                            {report.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3.5 pb-3.5 space-y-2.5 ms-9.5">
                    <p className="text-2sm text-foreground leading-relaxed">
                      {report.description}
                    </p>

                    {report.explanation && (
                      <div className="rounded-md px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                        <p className="text-2sm text-foreground leading-relaxed">
                          <span className="font-semibold text-amber-700 dark:text-amber-400">Root cause: </span>
                          {report.explanation}
                        </p>
                      </div>
                    )}

                    {report.recommendations && report.recommendations.length > 0 && (
                      <div className="rounded-md px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Lightbulb className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-2xs font-semibold text-foreground">Recommendations</span>
                        </div>
                        <ul className="space-y-1">
                          {report.recommendations.map((rec, i) => (
                            <li key={i} className="text-2sm text-foreground flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 text-xs">▸</span>
                              <span className="leading-relaxed">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.metrics && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-2xs text-muted-foreground hover:text-blue-500">
                            <Code className="h-3 w-3 me-1" />
                            Raw Metrics
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <pre className="text-xs bg-muted text-foreground p-2.5 rounded-md overflow-auto max-h-32 font-mono mt-1 border border-border">
                            {JSON.stringify(report.metrics, null, 2)}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );
}
