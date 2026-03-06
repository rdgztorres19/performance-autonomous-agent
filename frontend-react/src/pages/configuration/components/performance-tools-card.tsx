import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Download, Cpu, Activity, FileCode, HardDrive, Network } from 'lucide-react';
import { usePerformanceTools, useInstallPerformanceTool } from '@/api/configurations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PerformanceToolsCardProps {
  configId: string | null;
}

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  CPU: Cpu,
  'Context switches': Activity,
  Syscalls: FileCode,
  Memory: HardDrive,
  'I/O': HardDrive,
  Network: Network,
};

export function PerformanceToolsCard({ configId }: PerformanceToolsCardProps) {
  const { data: tools, isLoading, refetch } = usePerformanceTools(configId);
  const installMutation = useInstallPerformanceTool();

  const handleInstall = async (toolId: string) => {
    if (!configId) return;
    try {
      const res = await installMutation.mutateAsync({ configId, toolId });
      if (res.success) {
        toast.success(res.message);
        refetch();
      } else {
        toast.error(res.message || 'Installation failed');
      }
    } catch {
      toast.error('Failed to install tool');
    }
  };

  if (!configId) return null;

  return (
    <Card>
      <CardHeader className="py-5">
        <CardTitle className="text-base font-semibold">
          Performance Tools
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Tools used by the performance scanner. Install missing ones to enable full diagnostics.
        </p>
      </CardHeader>
      <CardContent className="border-t border-border pt-5">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking installed tools…</span>
          </div>
        ) : !tools?.length ? (
          <p className="text-sm text-muted-foreground py-4">Could not check tools. Verify the connection.</p>
        ) : (
          <div className="space-y-4">
            {tools.map((tool) => {
              const Icon = CATEGORY_ICONS[tool.category] ?? Cpu;
              const isInstalling = installMutation.isPending && installMutation.variables?.toolId === tool.id;

              return (
                <div
                  key={tool.id}
                  className={cn(
                    'flex items-start gap-4 rounded-lg border p-4 transition-colors',
                    tool.installed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card',
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{tool.name}</span>
                      <Badge variant="secondary" className="text-2xs">
                        {tool.category}
                      </Badge>
                      {tool.installed ? (
                        <Badge variant="outline" className="text-2xs text-emerald-600 border-emerald-500/50 bg-emerald-500/10">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Installed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-2xs text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not installed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                    <p className="text-2xs text-muted-foreground/80 mt-0.5 font-mono">
                      apt: {tool.package}
                    </p>
                  </div>
                  {!tool.installed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleInstall(tool.id)}
                      disabled={isInstalling}
                    >
                      {isInstalling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 me-1.5" />
                      )}
                      {isInstalling ? 'Installing…' : 'Install'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
