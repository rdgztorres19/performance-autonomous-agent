import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Terminal as TerminalIcon, X, Maximize2 } from 'lucide-react';
import { TerminalView } from '@/components/terminal/terminal-view';
import type { Configuration } from '@/types';
import { cn } from '@/lib/utils';

interface TerminalModalProps {
  config: Configuration | null;
  open: boolean;
  onClose: () => void;
}

export function TerminalModal({ config, open, onClose }: TerminalModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) e.preventDefault();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg',
            'transition-[width,height,inset] duration-200',
            isMaximized
              ? 'fixed left-2 right-2 top-2 bottom-2 h-[calc(100vh-1rem)] w-[calc(100vw-1rem)]'
              : 'h-[80vh] min-h-[400px] w-[95vw] max-w-5xl',
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TerminalIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  Terminal — {config?.name ?? 'Unknown'}
                </h2>
                <p className="text-2sm text-muted-foreground mt-0.5">
                  {config?.connectionType === 'ssh'
                    ? `${config.sshUsername}@${config.sshHost}:${config.sshPort ?? 22}`
                    : 'Local shell'}
                  {' · '}
                  <span className="text-muted-foreground">🪄 for command bar</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded p-2 hover:bg-muted"
                onClick={() => setIsMaximized((v) => !v)}
                aria-label={isMaximized ? 'Restore' : 'Maximize'}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded p-2 hover:bg-muted"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 p-5">
            {config ? (
              <TerminalView
                configurationId={config.id}
                onClose={onClose}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
