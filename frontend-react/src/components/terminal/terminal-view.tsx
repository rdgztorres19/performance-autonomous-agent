import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import { WandSparkles, Send, X } from 'lucide-react';
import { environment } from '@/config/environment';
import { AutocompleteOverlay } from './autocomplete-overlay';

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
  const [requestingSuggestions, setRequestingSuggestions] = useState(false);
  const [suggestionsFromCommandBar, setSuggestionsFromCommandBar] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
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
      const term = terminalRef.current;
      const text = trimmed + '\r';
      sendData(text);
      if (term) term.write(text);
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
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg bg-black">
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
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />
        {status === 'ready' && (
          <button
            type="button"
            onClick={() => setShowCommandBar((v) => !v)}
            className="absolute right-2 top-2 z-20 rounded p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            title="Command bar (complete current line and execute)"
            aria-label="Show command bar"
          >
            <WandSparkles className={`h-4 w-4 ${showCommandBar ? 'text-primary' : ''}`} />
          </button>
        )}
      </div>
      {showCommandBar && (
        <div className="relative flex shrink-0 flex-col gap-2 border-t border-white/20 bg-black/80 p-2">
          {suggestions.length > 0 && suggestionsFromCommandBar && (
            <AutocompleteOverlay
              items={suggestions}
              selectedIndex={suggestionsIndex}
              onSelect={applySuggestion}
              className="!relative left-0 right-0 mb-2 max-h-48 w-full"
              firstItemLabel="Send as typed"
            />
          )}
          <div className="flex gap-2">
            {requestingSuggestions && (
              <span className="text-2sm text-muted-foreground shrink-0">Getting suggestions…</span>
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
            className="flex-1 rounded border border-white/30 bg-black px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-primary focus:outline-none"
          />
            <button
              type="button"
              onClick={sendCommandBar}
              disabled={!commandInput.trim()}
              className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
              className="rounded p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              aria-label="Close command bar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
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
