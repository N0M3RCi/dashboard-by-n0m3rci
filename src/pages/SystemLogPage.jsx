import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { AlertCircle, AlertTriangle, Info, Server, RefreshCw, Clock, Trash2, Bug } from 'lucide-react';

export default function SystemLogPage() {
  const { data, loading, refresh } = useApi('/errors', 5000);
  const [filter, setFilter] = useState('all');
  const [showDetails, setShowDetails] = useState(null);

  const errors = data?.errors || [];
  const filtered = filter === 'all' ? errors : errors.filter(e => e.source === filter);

  const sources = [...new Set(errors.map(e => e.source))];

  const sourceIcon = (src) => {
    switch(src) {
      case 'server': return <Server size={14} className="text-danger" />;
      case 'client': return <Bug size={14} className="text-yellow-500" />;
      case 'telegram': return <AlertCircle size={14} className="text-primary" />;
      default: return <AlertTriangle size={14} className="text-yellow-500" />;
    }
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (loading && !errors.length) {
    return (
      <div className="space-y-4 animate-in">
        <div className="h-7 w-64 bg-surface-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-surface-700/60 rounded animate-pulse" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-surface-700 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Bug size={20} className="text-primary" /> System Log
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Centralized error tracking — {data?.total || 0} logged events
          </p>
        </div>
        <button onClick={refresh} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-800 text-text-muted border border-border/60 hover:text-text-primary'}`}
        >
          All {errors.length > 0 && <span className="ml-1 text-[10px] opacity-70">({errors.length})</span>}
        </button>
        {sources.map(src => {
          const count = errors.filter(e => e.source === src).length;
          return (
            <button
              key={src}
              onClick={() => setFilter(src)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all flex items-center gap-1.5 ${filter === src ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-800 text-text-muted border border-border/60 hover:text-text-primary'}`}
            >
              {sourceIcon(src)} {src} {count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Error List */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={24} className="text-success" />
          </div>
          <p className="text-sm font-medium text-text-primary">All clear — no logged errors</p>
          <p className="text-xs text-text-muted mt-1">Errors from the dashboard and Telegram API will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="card p-4 hover:bg-surface-800/80 transition-colors cursor-pointer" onClick={() => setShowDetails(showDetails === entry.id ? null : entry.id)}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {sourceIcon(entry.source)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium text-text-primary font-mono break-words">{entry.message}</span>
                    <span className="text-[10px] text-text-muted shrink-0 ml-auto">{timeAgo(entry.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span className="bg-surface-700 px-1.5 py-0.5 rounded font-mono capitalize">{entry.source}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(entry.timestamp).toLocaleString()}</span>
                    {entry.details?.url && <span className="truncate max-w-[200px]">{entry.details.url}</span>}
                  </div>

                  {/* Expanded details */}
                  {showDetails === entry.id && (
                    <div className="mt-3 bg-surface-900 rounded-xl p-3 border border-border/60 space-y-2 text-[11px] font-mono">
                      <div><span className="text-text-muted">ID:</span> <span className="text-text-primary">{entry.id}</span></div>
                      <div><span className="text-text-muted">Time:</span> <span className="text-text-primary">{new Date(entry.timestamp).toISOString()}</span></div>
                      <div><span className="text-text-muted">Source:</span> <span className="text-text-primary">{entry.source}</span></div>
                      <div><span className="text-text-muted">Message:</span> <span className="text-text-primary">{entry.message}</span></div>
                      {entry.details?.stack && (
                        <div>
                          <span className="text-text-muted">Stack:</span>
                          <pre className="text-text-primary mt-1 whitespace-pre-wrap break-words text-[10px] bg-black/30 rounded-lg p-2">{entry.details.stack}</pre>
                        </div>
                      )}
                      {entry.details?.componentStack && (
                        <div>
                          <span className="text-text-muted">Component:</span>
                          <pre className="text-text-primary mt-1 whitespace-pre-wrap break-words text-[10px] bg-black/30 rounded-lg p-2">{entry.details.componentStack}</pre>
                        </div>
                      )}
                      {entry.details?.url && (
                        <div><span className="text-text-muted">URL:</span> <span className="text-text-primary">{entry.details.url}</span></div>
                      )}
                      {entry.details?.status && (
                        <div><span className="text-text-muted">Status:</span> <span className="text-text-primary">{entry.details.status}</span></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckCircle({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}