import { useState } from 'react';
import { useApi, apiPost } from '../hooks/useApi';
import { RotateCcw, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export default function ResetPage() {
  const { data, loading, refresh } = useApi('/cycles', 15000);
  const [selected, setSelected] = useState({ messages: true, views: true, subscribers: false, commands: false, newUsers: false });
  const [resetting, setResetting] = useState(false);
  const [lastReset, setLastReset] = useState(null);

  const metrics = [
    { key: 'messages', label: 'Messages', desc: 'Displayed messages counter (auto-resets at 2000)' },
    { key: 'views', label: 'Views', desc: 'Displayed activity/views counter (auto-resets at 2000)' },
    { key: 'subscribers', label: 'Subscribers', desc: 'Displayed new subscriber joins count (auto-resets at 2000)' },
    { key: 'commands', label: 'Commands', desc: 'Displayed commands fired counter (auto-resets at 2000)' },
    { key: 'newUsers', label: 'New Users', desc: 'Displayed new users count (auto-resets at 2000)' },
  ];

  const cycles = data?.cycles || {};
  const lifetimes = data?.lifetimes || {};
  const threshold = 2000;

  const toggle = (key) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => setSelected({ messages: true, views: true, subscribers: true, commands: true, newUsers: true });
  const clearAll = () => setSelected({ messages: false, views: false, subscribers: false, commands: false, newUsers: false });

  const anySelected = Object.values(selected).some(Boolean);

  const handleReset = async (targetsOverride) => {
    const targets = targetsOverride || Object.keys(selected).filter(k => selected[k]);
    if (!targets.length) return;

    const confirmed = window.confirm(
      `Reset the following display counters to 0?\n\n${targets.map(t => '• ' + metrics.find(m => m.key === t)?.label).join('\n')}\n\nUnderlying data/logs remain untouched and accurate. These will re-accumulate from 0 until each hits 2000 again (auto) or you manually reset.`
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await apiPost('/reset', { targets });
      if (res?.success) {
        setLastReset(res.reset || targets);
        refresh();
        // Broadcast refresh so other tabs/pages update
        window.dispatchEvent(new CustomEvent('api-refresh'));
      } else {
        alert('Reset failed: ' + (res?.error || 'unknown'));
      }
    } catch (e) {
      alert('Error performing reset: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  const cycleValue = (k) => {
    const v = cycles[k];
    return typeof v === 'number' ? v : 0;
  };

  const lifeValue = (k) => {
    if (k === 'messages') return lifetimes.messages || 0;
    if (k === 'views') return lifetimes.messages || 0;
    if (k === 'subscribers' || k === 'newUsers') return lifetimes.subscribers || 0;
    if (k === 'commands') return lifetimes.commands || 0;
    return 0;
  };

  const progress = (k) => {
    const cur = cycleValue(k);
    return Math.min(Math.round((cur / threshold) * 100), 100);
  };

  const willAutoReset = (k) => cycleValue(k) >= threshold - 10; // warn near threshold

  if (loading && !data) {
    return (
      <div className="space-y-5 animate-in">
        <div className="flex items-center gap-3">
          <RotateCcw size={28} className="text-primary" />
          <div>
            <div className="h-7 w-48 bg-surface-700 rounded animate-pulse" />
            <div className="h-3 w-64 bg-surface-700/70 mt-2 animate-pulse rounded" />
          </div>
        </div>
        <div className="card p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-surface-700/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <RotateCcw className="text-primary" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Reset Metrics</h1>
              <p className="text-xs text-text-muted mt-0.5">Selectively wipe DISPLAY counters (they auto-reset at 2000 each). Full historical data, logs, and subscriber lists stay accurate and never deleted.</p>
            </div>
          </div>
        </div>
        <button onClick={() => refresh()} className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Auto-reset notice */}
      <div className="card border-l-4 border-l-yellow-500 bg-yellow-900/5 p-4 flex items-start gap-3">
        <AlertTriangle className="text-yellow-400 mt-0.5 shrink-0" size={18} />
        <div className="text-xs leading-relaxed text-text-secondary">
          <strong className="text-text-primary">Auto-reset behavior (default):</strong> Every metric display count here increments on new activity. When any one reaches 2000 it is automatically zeroed on the server (display reset). The real lifetime totals (see below) continue counting forever. This page lets you manually force zero any subset early.
        </div>
      </div>

      {/* Current Cycle Status */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary">Current Display Cycles (auto cap & reset at 2000)</h3>
            <p className="text-[11px] text-text-muted">These are the values shown in the main Dashboard KPI cards.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[10px] px-2.5 py-1 rounded border border-border hover:bg-surface-700 text-text-muted">Select All</button>
            <button onClick={clearAll} className="text-[10px] px-2.5 py-1 rounded border border-border hover:bg-surface-700 text-text-muted">Clear</button>
          </div>
        </div>

        <div className="space-y-3">
          {metrics.map((m) => {
            const val = cycleValue(m.key);
            const pct = progress(m.key);
            const life = lifeValue(m.key);
            const near = willAutoReset(m.key);
            const isSel = selected[m.key];
            return (
              <label
                key={m.key}
                className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition ${isSel ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-800/60'}`}
                onClick={() => toggle(m.key)}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(m.key)}
                  className="w-4 h-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{m.label}</span>
                    {near && <span className="badge badge-yellow text-[9px]">Near 2000</span>}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">{m.desc}</div>

                  {/* Progress bar */}
                  <div className="mt-2.5 h-2.5 w-full bg-surface-800 rounded-full overflow-hidden border border-border/50">
                    <div
                      className={`h-full transition-all ${val === 0 ? 'bg-surface-700' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
                    <span className="text-text-primary font-bold">{val.toLocaleString()} <span className="text-text-muted font-normal">/ {threshold}</span></span>
                    <span className="text-text-muted">Lifetime accurate: {life.toLocaleString()}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleReset()}
          disabled={!anySelected || resetting}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
        >
          <RotateCcw size={16} />
          {resetting ? 'Resetting selected...' : 'Reset Selected Display Counters'}
        </button>

        <button
          onClick={() => handleReset(['messages', 'views', 'subscribers', 'commands', 'newUsers'])}
          disabled={resetting}
          className="px-3 py-2 rounded-xl border border-danger/40 text-danger hover:bg-danger/10 active:bg-danger/20 text-xs font-semibold flex items-center gap-2"
        >
          Reset ALL Display Counters
        </button>

        {!anySelected && <span className="text-xs text-text-muted">Select at least one metric above.</span>}
      </div>

      {/* Result / last action */}
      {lastReset && (
        <div className="card p-4 border-l-4 border-l-success flex items-start gap-3 bg-success/5">
          <CheckCircle size={18} className="text-success mt-px shrink-0" />
          <div className="text-xs text-success/90">
            Last reset successfully applied for: <span className="font-semibold text-text-primary">{lastReset.join(', ')}</span>.
            Display metrics were zeroed — new activity will accumulate again from 0 (until 2000).
          </div>
        </div>
      )}

      {/* Quick note */}
      <div className="text-[11px] text-text-muted px-1">
        Note: Full wipe of raw logs & subscriber database (for test cleanup) remains in <a href="/settings" className="text-primary hover:underline">Settings → Danger zone</a>.
      </div>
    </div>
  );
}
