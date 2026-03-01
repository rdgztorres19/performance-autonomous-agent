import { Container } from '@/components/common/container';
import { SessionControl } from './components/session-control';
import { TimelinePanel } from './components/timeline-panel';
import { ReportsPanel } from './components/reports-panel';
import { MetricsOverview } from './components/metrics-overview';
import { FormDialog } from './components/form-display';
import { useSessionStore } from '@/hooks/use-session-store';

export function DashboardPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const pendingForms = useSessionStore((s) => s.pendingForms);
  const activePendingForm = pendingForms.find((f) => f.status === 'pending');

  return (
    <Container>
      <div className="grid gap-5 lg:gap-7.5">
        <SessionControl />

        {activeSession && (
          <div className="grid lg:grid-cols-12 gap-5 lg:gap-7.5 items-start">
            {/* Main content: metrics + timeline */}
            <div className="lg:col-span-8 grid gap-5 lg:gap-7.5">
              <MetricsOverview />
              <TimelinePanel />
            </div>

            {/* Sidebar: reports */}
            <div className="lg:col-span-4 lg:sticky lg:top-5">
              <ReportsPanel />
            </div>
          </div>
        )}
      </div>

      {activePendingForm && (
        <FormDialog formInteraction={activePendingForm} />
      )}
    </Container>
  );
}
