import { useState, useEffect } from 'react';
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
  Play,
  Loader2,
  Cpu,
  Activity,
  Search,
  Brain,
  Terminal,
  Wrench,
  Clock,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useConfigurations } from '@/api/configurations';
import { useStartSession } from '@/api/sessions';
import { useSessionStore } from '@/hooks/use-session-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Session, TimelineEntry, ProblemReport, FormInteraction } from '@/types';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
};

const features = [
  {
    icon: Search,
    title: 'System Scan',
    desc: 'CPU, memory, disk I/O, and network analysis',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-950',
  },
  {
    icon: Brain,
    title: 'AI Analysis',
    desc: 'LLM-powered root cause identification',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    icon: Wrench,
    title: '25+ Tools',
    desc: 'Process, network, disk, and app-level diagnostics',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    icon: Terminal,
    title: 'SSH & Local',
    desc: 'Connect to remote servers or scan locally',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
];

export function WorkspaceEmpty() {
  const [configId, setConfigId] = useState('');
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const { data: configs } = useConfigurations();
  const startMutation = useStartSession();
  const ws = useWebSocket();
  const navigate = useNavigate();

  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const setTimeline = useSessionStore((s) => s.setTimeline);
  const setReports = useSessionStore((s) => s.setReports);
  const setForms = useSessionStore((s) => s.setForms);

  useEffect(() => {
    api.get<Session[]>('/sessions')
      .then((sessions) => setRecentSessions(sessions.slice(0, 5)))
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!configId) return;
    const session = await startMutation.mutateAsync(configId);
    setActiveSession(session);
    ws.connect();
    setTimeout(() => ws.joinSession(session.id), 500);
    const [tl, rp, fm] = await Promise.all([
      api.get<TimelineEntry[]>(`/sessions/${session.id}/timeline`),
      api.get<ProblemReport[]>(`/sessions/${session.id}/reports`),
      api.get<FormInteraction[]>(`/sessions/${session.id}/forms`),
    ]);
    setTimeline(tl);
    setReports(rp);
    setForms(fm);
  };

  const handleViewSession = async (session: Session) => {
    setActiveSession(session);
    const [tl, rp, fm] = await Promise.all([
      api.get<TimelineEntry[]>(`/sessions/${session.id}/timeline`),
      api.get<ProblemReport[]>(`/sessions/${session.id}/reports`),
      api.get<FormInteraction[]>(`/sessions/${session.id}/forms`),
    ]);
    setTimeline(tl);
    setReports(rp);
    setForms(fm);
    if (session.status === 'running') {
      ws.connect();
      setTimeout(() => ws.joinSession(session.id), 500);
    }
  };

  return (
    <div className="flex flex-col items-center h-full px-3 py-3 overflow-auto">
      <div className="w-full max-w-3xl mx-auto pt-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950 mx-auto mb-4">
            <Cpu className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-1.5">
            Performance Diagnostic Workspace
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Select a server configuration and run an AI-powered scan to identify performance bottlenecks.
          </p>
        </div>

        {/* Launch bar */}
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 shadow-sm mb-8">
          <div className="grow">
            <Select value={configId} onValueChange={setConfigId}>
              <SelectTrigger className="h-10 text-sm border-0 shadow-none bg-transparent">
                <SelectValue placeholder="Choose a server configuration..." />
              </SelectTrigger>
              <SelectContent>
                {configs?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="secondary" className="text-2xs">
                        {c.connectionType.toUpperCase()}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="lg"
            className="h-10 px-6 shrink-0"
            onClick={handleStart}
            disabled={!configId || startMutation.isPending}
          >
            {startMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 me-2" />
            )}
            Run Scan
          </Button>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center p-3.5 rounded-lg border border-border bg-card/50"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${f.bg} mb-2`}>
                <f.icon className={`h-4 w-4 ${f.color}`} />
              </div>
              <p className="text-xs font-semibold text-foreground mb-0.5">{f.title}</p>
              <p className="text-2xs text-muted-foreground leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Sessions
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-2xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/sessions')}
              >
                View all
                <ArrowRight className="h-3 w-3 ms-1" />
              </Button>
            </div>
            <div className="space-y-1.5">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleViewSession(session)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-colors cursor-pointer text-left group"
                >
                  <code className="text-xs text-muted-foreground font-mono shrink-0">
                    {session.id.substring(0, 8)}
                  </code>
                  <Badge
                    variant={statusVariant[session.status] ?? 'secondary'}
                    className="text-2xs shrink-0"
                  >
                    {session.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(session.startedAt).toLocaleString()}
                  </span>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ms-auto shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
