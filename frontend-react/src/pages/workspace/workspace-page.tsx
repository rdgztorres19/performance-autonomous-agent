import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { Activity, AlertTriangle } from 'lucide-react';
import { useSessionStore } from '@/hooks/use-session-store';
import { WorkspaceToolbar } from './components/workspace-toolbar';
import { WorkspaceTimeline } from './components/workspace-timeline';
import { WorkspaceReports } from './components/workspace-reports';
import { WorkspaceSidebar } from './components/workspace-sidebar';
import { WorkspaceEmpty } from './components/workspace-empty';
import { FormDialog } from '../dashboard/components/form-display';

export function WorkspacePage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const timeline = useSessionStore((s) => s.timeline);
  const reports = useSessionStore((s) => s.reports);
  const pendingForms = useSessionStore((s) => s.pendingForms);
  const activePendingForm = pendingForms.find((f) => f.status === 'pending');

  if (!activeSession) {
    return (
      <Container width="fluid">
        <div className="border border-border bg-card rounded-lg overflow-hidden min-h-[600px] flex flex-col">
          <WorkspaceEmpty />
        </div>
      </Container>
    );
  }

  return (
    <Container width="fluid">
      <div className="flex flex-col">
        <WorkspaceToolbar />

        <div className="border border-t-0 border-border bg-card rounded-b-lg overflow-hidden h-[calc(100vh-230px)] min-h-[500px]">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={70} minSize={40}>
              <Tabs defaultValue="timeline" className="flex flex-col h-full">
                <TabsList variant="line" size="sm" className="px-3 shrink-0">
                  <TabsTrigger value="timeline" className="gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Timeline
                    <Badge variant="secondary" className="text-2xs h-4 px-1.5 ms-1">
                      {timeline.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Reports
                    <Badge
                      variant={reports.length > 0 ? 'destructive' : 'secondary'}
                      className="text-2xs h-4 px-1.5 ms-1"
                    >
                      {reports.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="grow mt-0 overflow-hidden">
                  <WorkspaceTimeline />
                </TabsContent>

                <TabsContent value="reports" className="grow mt-0 overflow-hidden">
                  <WorkspaceReports />
                </TabsContent>
              </Tabs>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
              <ScrollArea className="h-full">
                <WorkspaceSidebar />
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {activePendingForm && (
        <FormDialog formInteraction={activePendingForm} />
      )}
    </Container>
  );
}
