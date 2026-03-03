import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Server, Monitor, Key, Shield, Wifi, WifiOff, Loader2, Terminal } from 'lucide-react';
import { useConfigurations, useDeleteConfiguration } from '@/api/configurations';
import { useWebSocket } from '@/hooks/use-websocket';
import { ConfigForm } from './components/config-form';
import { TerminalModal } from './components/terminal-modal';
import { toast } from 'sonner';
import type { Configuration } from '@/types';

export function ConfigurationPage() {
  const { data: configs, isLoading } = useConfigurations();
  const deleteMutation = useDeleteConfiguration();
  const ws = useWebSocket();
  const [selected, setSelected] = useState<Configuration | null>(null);

  useEffect(() => {
    ws.connect();
  }, [ws.connect]);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Configuration | null>(null);
  const [terminalConfig, setTerminalConfig] = useState<Configuration | null>(null);

  const handleNew = () => {
    setSelected(null);
    setIsNew(true);
  };

  const handleEdit = (config: Configuration) => {
    setSelected(config);
    setIsNew(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      if (selected?.id === deleteTarget.id) {
        setSelected(null);
        setIsNew(false);
      }
    } catch {
      toast.error('Failed to delete configuration');
    }
    setDeleteTarget(null);
  };

  const handleSaved = () => {
    setSelected(null);
    setIsNew(false);
  };

  const showForm = isNew || selected;

  return (
    <Container>
        {showForm ? (
          <ConfigForm config={selected} isNew={isNew} onSaved={handleSaved} />
        ) : (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Server Configurations</CardTitle>
              <Button size="sm" onClick={handleNew}>
                <Plus className="h-4 w-4 me-1.5" />
                Add New
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-sm text-muted-foreground text-center">Loading configurations...</div>
              ) : !configs?.length ? (
                <div className="p-12 text-center">
                  <Server className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No configurations yet</p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Create your first configuration to start scanning systems.
                  </p>
                  <Button size="sm" onClick={handleNew}>
                    <Plus className="h-4 w-4 me-1.5" />
                    Create Configuration
                  </Button>
                </div>
              ) : (
                <ScrollArea>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[200px]">
                          Name
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[100px]">
                          Status
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[130px]">
                          Connection
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[200px]">
                          Host
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[130px]">
                          AI Model
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 min-w-[100px]">
                          API Key
                        </th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3.5 w-[100px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {configs.map((config) => (
                        <tr key={config.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                {config.connectionType === 'ssh' ? (
                                  <Server className="h-4 w-4 text-primary" />
                                ) : (
                                  <Monitor className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <span className="font-medium text-foreground">{config.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {config.connectionStatus === 'online' ? (
                              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <Wifi className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Online</span>
                              </div>
                            ) : config.connectionStatus === 'offline' ? (
                              <div className="flex items-center gap-1.5 text-destructive">
                                <WifiOff className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Offline</span>
                              </div>
                            ) : config.connectionStatus === 'checking' ? (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="text-xs font-medium">Checking</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant={config.connectionType === 'ssh' ? 'default' : 'secondary'}
                              className="text-[11px] font-medium"
                            >
                              {config.connectionType === 'ssh' ? 'SSH' : 'Local'}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {config.connectionType === 'ssh' ? (
                              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                {config.sshUsername ? `${config.sshUsername}@` : ''}
                                {config.sshHost}:{config.sshPort ?? 22}
                              </code>
                            ) : (
                              <span className="text-xs">localhost</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {config.openaiModel ?? 'gpt-4o'}
                          </td>
                          <td className="px-5 py-3.5">
                            {config.openaiApiKey === '***configured***' ? (
                              <div className="flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Configured</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Key className="h-3.5 w-3.5 text-yellow-500" />
                                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Not set</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setTerminalConfig(config)}
                                title="Open Terminal"
                              >
                                <Terminal className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(config)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(config)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
        )}
      <TerminalModal
        config={terminalConfig}
        open={!!terminalConfig}
        onClose={() => setTerminalConfig(null)}
      />
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
