import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import { WandSparkles, Send, X, MessageCirclePlus, ChevronDown, ChevronRight, Copy, Terminal as TerminalIcon, FilePlus } from 'lucide-react';
import { environment } from '@/config/environment';
import { cn } from '@/lib/utils';
import { AutocompleteOverlay } from './autocomplete-overlay';

function renderAskResponse(
  text: string,
  opts?: { onCopy?: (cmd: string) => void; onExecute?: (cmd: string) => void },
) {
  const parts: { type: 'text' | 'code'; content: string; lang?: string }[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, m.index) });
    }
    parts.push({ type: 'code', content: m[2].trim(), lang: m[1] || undefined });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }
  return parts.map((p, i) =>
    p.type === 'code' ? (
      <div key={i} className="group/code my-3">
        <div className="flex items-center justify-between gap-2 rounded-t-lg border-x border-t border-zinc-600/60 bg-zinc-700/40 px-2.5 py-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {p.lang || 'shell'}
          </span>
          {opts?.onCopy != null && opts?.onExecute != null && (
            <div className="flex gap-0.5 opacity-70 group-hover/code:opacity-100">
              <button
                type="button"
                onClick={() => opts.onCopy?.(p.content)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-600/60 hover:text-zinc-200"
                title="Copy to clipboard"
                aria-label="Copy"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => opts.onExecute?.(p.content)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-600/60 hover:text-zinc-200"
                title="Send to terminal"
                aria-label="Execute"
              >
                <TerminalIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <pre className="overflow-x-auto rounded-b-lg border border-t-0 border-zinc-600/60 bg-zinc-800/80 px-3 py-2.5 font-mono text-xs leading-relaxed text-zinc-200">
          <code>{p.content}</code>
        </pre>
      </div>
    ) : (
      <span key={i} className="whitespace-pre-wrap">
        {p.content}
      </span>
    ),
  );
}

interface TerminalViewProps {
  configurationId: string;
  onClose?: () => void;
}

export function TerminalView({ configurationId, onClose }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsIndex, setSuggestionsIndex] = useState(0);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [showAskPanel, setShowAskPanel] = useState(false);
  const [askContext, setAskContext] = useState('');
  const [askQuestion, setAskQuestion] = useState('');
  const [askMessages, setAskMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [askError, setAskError] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askContextCollapsed, setAskContextCollapsed] = useState(false);
  const [requestingSuggestions, setRequestingSuggestions] = useState(false);
  const [suggestionsFromCommandBar, setSuggestionsFromCommandBar] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const askInputRef = useRef<HTMLInputElement>(null);
  const lastLineRef = useRef('');
  const lastUserInputRef = useRef('');

  function getUserInputFromLine(line: string): string {
    const match = line.match(/(?:#|\$|>|%)\s*(.*)$/);
    return match ? match[1].trimEnd() : line.trimEnd();
  }
  const pendingCommandRef = useRef<string | null>(null);
  const suggestionsFromCommandBarRef = useRef(false);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsLengthRef = useRef(0);
  suggestionsLengthRef.current = suggestions.length;

  const connect = useCallback(() => {
    const baseUrl = environment.wsUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/terminal` : '/terminal';
    const socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connecting');
      socket.emit('terminal:connect', {
        configurationId,
        rows: 24,
        cols: 80,
      });
    });

    socket.on('terminal:ready', () => {
      setStatus('ready');
      const dims = fitAddonRef.current?.proposeDimensions();
      if (dims) socket.emit('terminal:resize', { rows: dims.rows, cols: dims.cols });
    });
    socket.on('terminal:error', (data: { message?: string }) => {
      setStatus('error');
      setErrorMessage(data?.message ?? 'Connection failed');
    });
    socket.on('terminal:output', (data: { data?: string }) => {
      const term = terminalRef.current;
      if (term && data.data) term.write(data.data);
    });
    socket.on('terminal:suggestions', (data: { items?: string[] }) => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = null;
      }
      const items = data?.items ?? [];
      const pending = pendingCommandRef.current;
      setRequestingSuggestions(false);
      if (suggestionsFromCommandBarRef.current && pending != null) {
        pendingCommandRef.current = null;
        setSuggestionsFromCommandBar(true);
        setSuggestions([pending, ...items]);
        setSuggestionsIndex(0);
      } else {
        setSuggestions(items);
        setSuggestionsIndex(0);
      }
    });

    socket.on('terminal:askResponse', (data: { answer?: string; error?: string }) => {
      setAskLoading(false);
      if (data.error) {
        setAskError(data.error);
      } else {
        setAskError(null);
        setAskMessages((prev) => [
          ...prev,
          { role: 'assistant' as const, content: data.answer ?? '' },
        ]);
        setAskContextCollapsed(true);
      }
    });

    socket.on('disconnect', () => setStatus('error'));
    socket.on('connect_error', () => {
      setStatus('error');
      setErrorMessage('Could not connect to terminal server');
    });
  }, [configurationId]);

  const sendData = useCallback(
    (data: string) => {
      socketRef.current?.emit('terminal:data', { data });
    },
    [],
  );

  const requestAutocomplete = useCallback(() => {
    const term = terminalRef.current;
    if (!term || suggestionsLengthRef.current > 0) return;

    const line = term.buffer.active.getLine(term.buffer.active.cursorY);
    const text = line?.translateToString(true).trimEnd() ?? '';
    lastLineRef.current = text;
    lastUserInputRef.current = getUserInputFromLine(text);

    const context = Array.from({ length: Math.max(0, term.buffer.active.cursorY) }, (_, i) => {
      const line = term.buffer.active.getLine(i);
      return line?.translateToString(true) ?? '';
    })
      .join('\n')
      .slice(-500);

    socketRef.current?.emit('terminal:autocomplete', {
      configurationId,
      line: text,
      context: context || undefined,
    });
  }, [configurationId]);

  const applySuggestion = useCallback(
    (item: string) => {
      if (suggestionsFromCommandBarRef.current) {
        suggestionsFromCommandBarRef.current = false;
        setSuggestionsFromCommandBar(false);
        setCommandInput('');
        setSuggestions([]);
        const term = terminalRef.current;
        if (term && item) {
          sendData(item);
          term.write(item);
          term.focus();
        }
        return;
      }
      const term = terminalRef.current;
      if (!term) return;
      const userInput = lastUserInputRef.current;
      const toInsert = item.startsWith(userInput) ? item.slice(userInput.length) : item;
      if (toInsert) {
        sendData(toInsert);
        term.write(toInsert);
      }
      setSuggestions([]);
    },
    [sendData],
  );

  const executeCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = null;
      }
      const term = terminalRef.current;
      const text = trimmed + '\r';
      sendData(text);
      if (term) {
        term.write(text);
        term.focus();
      }
      setCommandInput('');
      pendingCommandRef.current = null;
      setShowCommandBar(false);
      setSuggestions([]);
      setSuggestionsFromCommandBar(false);
    },
    [sendData],
  );

  const executeCommandRef = useRef(executeCommand);
  executeCommandRef.current = executeCommand;

  const openAskPanel = useCallback(() => {
    const term = terminalRef.current;
    const text = term?.getSelection()?.trim() ?? '';
    if (text) {
      setAskContext(text);
      setAskQuestion('');
      setAskMessages([]);
      setAskError(null);
      setAskContextCollapsed(false);
      setShowAskPanel(true);
      setShowCommandBar(false);
    }
  }, []);

  const closeAskPanel = useCallback(() => {
    setShowAskPanel(false);
    setAskContext('');
    setAskQuestion('');
    setAskMessages([]);
    setAskError(null);
    setAskContextCollapsed(false);
    terminalRef.current?.clearSelection();
  }, []);

  const addSelectionToContext = useCallback(() => {
    const term = terminalRef.current;
    const text = term?.getSelection()?.trim() ?? '';
    if (!text) return;
    setAskContext((prev) => {
      if (!prev) return text;
      return `${prev}\n\n--- New selection (output/selection) ---\n\n${text}`;
    });
    setAskContextCollapsed(false);
    term?.clearSelection();
    setHasSelection(false);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, []);

  const sendAsk = useCallback(() => {
    const q = askQuestion.trim();
    if (!q || !askContext) return;
    setAskLoading(true);
    setAskError(null);
    setAskMessages((prev) => [...prev, { role: 'user', content: q }]);
    setAskQuestion('');

    const historyForApi = askMessages.length > 0
      ? askMessages.map((m, i) => {
          if (i === 0 && m.role === 'user') {
            return { role: 'user' as const, content: `Selected terminal output:\n\`\`\`\n${askContext}\n\`\`\`\n\nUser question: ${m.content}` };
          }
          return m;
        })
      : undefined;

    socketRef.current?.emit('terminal:ask', {
      configurationId,
      selectedText: askContext,
      question: q,
      conversationHistory: historyForApi,
    });
  }, [configurationId, askQuestion, askContext, askMessages]);

  const sendCommandBar = useCallback(() => {
    const trimmed = commandInput.trim();
    if (!trimmed) return;
    setRequestingSuggestions(true);
    pendingCommandRef.current = trimmed;
    suggestionsFromCommandBarRef.current = true;

    const context = terminalRef.current?.buffer.active
      ? Array.from({ length: terminalRef.current.buffer.active.cursorY }, (_, i) => {
          const line = terminalRef.current?.buffer.active.getLine(i);
          return line?.translateToString(true) ?? '';
        })
          .join('\n')
          .slice(-500)
      : undefined;

    socketRef.current?.emit('terminal:autocomplete', {
      configurationId,
      line: trimmed,
      context: context || undefined,
    });

    suggestionTimeoutRef.current = setTimeout(() => {
      suggestionTimeoutRef.current = null;
      if (suggestionsFromCommandBarRef.current && pendingCommandRef.current) {
        suggestionsFromCommandBarRef.current = false;
        const pending = pendingCommandRef.current;
        pendingCommandRef.current = null;
        setRequestingSuggestions(false);
        executeCommand(pending);
      }
    }, 3000);
  }, [commandInput, configurationId, executeCommand]);

  useEffect(() => {
    if (showCommandBar) {
      commandInputRef.current?.focus();
    }
  }, [showCommandBar]);

  useEffect(() => {
    if (showAskPanel) {
      askInputRef.current?.focus();
    }
  }, [showAskPanel]);

  useEffect(() => {
    if (!containerRef.current || !configurationId) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        selectionBackground: 'rgba(255, 255, 255, 0.15)',
        selectionInactiveBackground: 'rgba(255, 255, 255, 0.08)',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    const viewport = containerRef.current?.querySelector('.xterm-viewport');
    if (viewport instanceof HTMLElement) {
      viewport.classList.add('kt-scrollable-y-auto');
      viewport.style.setProperty('--scrollbar-thumb-color', 'rgba(255,255,255,0.35)');
    }
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        requestAutocomplete();
      }
    };
    const containerEl = containerRef.current;
    containerEl?.addEventListener('keydown', handleKey, true);

    term.onData((data) => {
      setSuggestions([]);
      sendData(data);
    });

    term.onSelectionChange(() => {
      setHasSelection(term.hasSelection());
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims && socketRef.current) {
        socketRef.current.emit('terminal:resize', { rows: dims.rows, cols: dims.cols });
      }
    });
    resizeObserver.observe(containerRef.current);

    connect();

    return () => {
      containerEl?.removeEventListener('keydown', handleKey, true);
      resizeObserver.disconnect();
      socketRef.current?.disconnect();
      socketRef.current = null;
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [configurationId, connect, sendData, requestAutocomplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;
      if (e.key === 'Escape') {
        setSuggestions([]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionsIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionsIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = suggestions[suggestionsIndex];
        if (item) applySuggestion(item);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, suggestionsIndex, applySuggestion]);

  return (
    <div
      className={cn(
        'relative flex h-full w-full overflow-hidden rounded-lg bg-zinc-950',
        showAskPanel ? 'flex-row' : 'flex-col',
      )}
    >
      {status === 'connecting' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-sm text-muted-foreground">
          Connecting...
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 text-destructive">
          <p>{errorMessage ?? 'Connection failed'}</p>
          {onClose && (
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 flex-col',
          showAskPanel ? 'min-w-0 flex-1 rounded-l-lg' : 'flex-1',
          showAskPanel && 'border-r border-zinc-800/80 bg-black/50',
        )}
      >
        <div className="relative min-h-0 flex-1">
          <div ref={containerRef} className="h-full w-full rounded-lg" />
          {status === 'ready' && (
          <div className="absolute right-2 top-2 z-20 flex gap-0.5">
            {hasSelection && !showAskPanel && (
              <button
                type="button"
                onClick={openAskPanel}
                className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-200"
                title="Ask about selected context"
                aria-label="Ask about selection"
              >
                <MessageCirclePlus className="h-4 w-4" />
              </button>
            )}
            {hasSelection && showAskPanel && (
              <button
                type="button"
                onClick={addSelectionToContext}
                className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-200"
                title="Add selection to context (for follow-up questions)"
                aria-label="Add selection to context"
              >
                <FilePlus className="h-4 w-4" />
              </button>
            )}
            <button
                type="button"
                onClick={() => setShowCommandBar((v) => !v)}
                className={cn(
                  'rounded-md p-2 transition-colors hover:bg-zinc-700/60',
                  showCommandBar ? 'text-primary' : 'text-zinc-500 hover:text-zinc-200',
                )}
                title="Command bar (complete current line and execute)"
                aria-label="Show command bar"
              >
                <WandSparkles className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {showCommandBar && (
          <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-800/80 bg-zinc-900/80 px-3 py-2.5">
            {suggestions.length > 0 && suggestionsFromCommandBar && (
              <AutocompleteOverlay
                items={suggestions}
                selectedIndex={suggestionsIndex}
                onSelect={applySuggestion}
                className="!relative left-0 right-0 mb-2 max-h-48 w-full"
                firstItemLabel="Send as typed"
                showCommandActions
                onCopy={copyToClipboard}
                onExecute={executeCommand}
              />
            )}
            <div className="flex gap-2">
              {requestingSuggestions && (
                <span className="text-2sm shrink-0 text-zinc-500">Getting suggestions…</span>
              )}
              <input
                ref={commandInputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (suggestions.length > 0) {
                      const item = suggestions[suggestionsIndex];
                      if (item) applySuggestion(item);
                    } else {
                      sendCommandBar();
                    }
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowCommandBar(false);
                    setCommandInput('');
                    setSuggestions([]);
                    setSuggestionsFromCommandBar(false);
                    suggestionsFromCommandBarRef.current = false;
                    pendingCommandRef.current = null;
                    setRequestingSuggestions(false);
                  }
                }}
                placeholder="Complete current line or type new command, Enter to send"
                className="flex-1 rounded-lg border border-zinc-600/80 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={sendCommandBar}
                disabled={!commandInput.trim()}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (suggestionTimeoutRef.current) {
                    clearTimeout(suggestionTimeoutRef.current);
                    suggestionTimeoutRef.current = null;
                  }
                  setShowCommandBar(false);
                  setCommandInput('');
                  setSuggestions([]);
                  setSuggestionsFromCommandBar(false);
                  suggestionsFromCommandBarRef.current = false;
                  pendingCommandRef.current = null;
                  setRequestingSuggestions(false);
                }}
                className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-200"
                aria-label="Close command bar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAskPanel && (
        <aside className="flex w-[420px] shrink-0 flex-col border-l border-zinc-800/80 bg-zinc-900/95">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-700/50 px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
              Ask about context
            </h3>
            <button
              type="button"
              onClick={closeAskPanel}
              className="-mr-1 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700/50 hover:text-zinc-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAskContextCollapsed((c) => !c)}
            className="flex shrink-0 items-center gap-2 border-b border-zinc-700/50 px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/50"
          >
            {askContextCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Selected context
            </span>
            {askContextCollapsed && (
              <span className="truncate text-xs text-zinc-600">
                — {askContext.slice(0, 36)}…
              </span>
            )}
          </button>
          {!askContextCollapsed && (
            <div className="max-h-32 shrink-0 overflow-y-auto border-b border-zinc-700/50 px-4 py-3">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-400">
                {askContext}
              </pre>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {askError && (
                <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {askError}
                </p>
              )}
              <div className="flex flex-col gap-4">
                {askMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[92%] rounded-xl px-4 py-3 shadow-sm',
                      msg.role === 'user'
                        ? 'ml-auto bg-primary/20 text-sm text-zinc-100'
                        : 'mr-auto border border-zinc-700/60 bg-zinc-800/60 text-sm leading-relaxed text-zinc-200',
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="[&_pre]:leading-relaxed [&_span]:leading-relaxed">
                        {renderAskResponse(msg.content, {
                          onCopy: copyToClipboard,
                          onExecute: executeCommand,
                        })}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-zinc-700/50 bg-zinc-900/80 px-4 py-3">
              {hasSelection && (
                <button
                  type="button"
                  onClick={addSelectionToContext}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600/80 bg-zinc-800/40 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  Add selection to context
                </button>
              )}
              <div className="flex gap-2">
                <input
                  ref={askInputRef}
                  type="text"
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendAsk();
                    if (e.key === 'Escape') closeAskPanel();
                  }}
                  placeholder="Ask or follow up…"
                  disabled={askLoading}
                  className="flex-1 rounded-lg border border-zinc-600/80 bg-zinc-800/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={sendAsk}
                  disabled={!askQuestion.trim() || askLoading}
                  className="rounded-lg bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:bg-primary/90 disabled:opacity-50"
                >
                  {askLoading ? '…' : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {suggestions.length > 0 && !suggestionsFromCommandBar && (
        <AutocompleteOverlay
          items={suggestions}
          selectedIndex={suggestionsIndex}
          onSelect={applySuggestion}
        />
      )}
    </div>
  );
}
