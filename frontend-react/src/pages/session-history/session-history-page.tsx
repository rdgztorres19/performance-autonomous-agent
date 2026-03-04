import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Eye, RefreshCw, History } from 'lucide-react';
import { api } from '@/api/client';
import { useSessionStore } from '@/hooks/use-session-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { useNavigate } from 'react-router-dom';
import type { Session, TimelineEntry, ProblemReport, FormInteraction } from '@/types';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
};

export function SessionHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const setTimeline = useSessionStore((s) => s.setTimeline);
  const setReports = useSessionStore((s) => s.setReports);
  const setForms = useSessionStore((s) => s.setForms);
  const ws = useWebSocket();
  const navigate = useNavigate();

  const fetchSessions = () => {
    setLoading(true);
    api.get<Session[]>('/sessions')
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleView = async (session: Session) => {
    setActiveSession(session);
    const [timeline, reports, forms] = await Promise.all([
      api.get<TimelineEntry[]>(`/sessions/${session.id}/timeline`),
      api.get<ProblemReport[]>(`/sessions/${session.id}/reports`),
      api.get<FormInteraction[]>(`/sessions/${session.id}/forms`),
    ]);
    setTimeline(timeline);
    setReports(reports);
    setForms(forms);

    if (session.status === 'running') {
      ws.connect();
      setTimeout(() => ws.joinSession(session.id), 200);
    }

    navigate('/');
  };

  return (
    <Container>
      <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Sessions</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchSessions}>
              <RefreshCw className="h-4 w-4 me-1.5" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-sm text-muted-foreground text-center">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground mb-1">No sessions yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Start a scan from the Dashboard to create your first session.
                </p>
              </div>
            ) : (
              <ScrollArea>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[180px]">
                        Session ID
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[100px]">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[200px]">
                        Started
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[200px]">
                        Completed
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 w-[100px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {session.id.substring(0, 12)}...
                          </code>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusVariant[session.status] ?? 'outline'} className="text-[11px]">
                            {session.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-foreground">
                          {new Date(session.startedAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {session.completedAt ? new Date(session.completedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleView(session)}>
                            <Eye className="h-4 w-4 me-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
    </Container>
  );
}
