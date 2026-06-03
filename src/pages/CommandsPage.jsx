import { useApi, apiPost } from '../hooks/useApi';
import { RefreshCw, Zap, Terminal, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CommandsPage() {
  const { data, loading, refresh } = useApi('/commands', 30000);
  const [syncing, setSyncing] = useState(false);
  const [syncFlash, setSyncFlash] = useState(false);
  const [selected, setSelected] = useState(0);

  // Edit form state
  const [editDesc, setEditDesc] = useState('');
  const [editTemplate, setEditTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { success: boolean, text: string }

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newCmdName, setNewCmdName] = useState('');
  const [newCmdDesc, setNewCmdDesc] = useState('');
  const [newCmdTemplate, setNewCmdTemplate] = useState('');
  const [creating, setCreating] = useState(false);

  const commands = data?.commands || [];
  const active = commands[selected] || commands[0];

  // Sync edits with active selection
  // Intentionally syncs local form state from async data / selection.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (active) {
      setEditDesc(active.description || '');
      setEditTemplate(active.responseTemplate || '');
      setSaveStatus(null);
    }
  }, [active, selected]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSync = async () => {
    setSyncing(true);
    await apiPost('/sync');
    refresh();
    setSyncing(false);
    setSyncFlash(true);
    setTimeout(() => setSyncFlash(false), 1350);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!active) return;
    setSaving(true);
    setSaveStatus(null);

    const res = await apiPost('/commands', {
      command: active.command,
      description: editDesc,
      responseTemplate: editTemplate,
    });

    setSaving(false);
    if (res && !res.error) {
      setSaveStatus({ success: true, text: 'Changes saved directly to Telegram!' });
      refresh();
    } else {
      setSaveStatus({ success: false, text: res?.error || 'Save failed' });
    }
  };

  const handleDelete = async () => {
    if (!active) return;
    if (!confirm(`Are you sure you want to delete ${active.command}? This will remove it from Telegram.`)) return;

    setSaving(true);
    const res = await apiPost('/commands/delete', { command: active.command });
    setSaving(false);

    if (res && !res.error) {
      alert(`${active.command} deleted!`);
      setSelected(0);
      refresh();
    } else {
      alert(res?.error || 'Delete failed');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCmdName || !newCmdDesc) return;

    setCreating(true);
    const formattedName = newCmdName.startsWith('/') ? newCmdName : `/${newCmdName}`;
    const res = await apiPost('/commands/create', {
      command: formattedName,
      description: newCmdDesc,
      responseTemplate: newCmdTemplate,
    });
    setCreating(false);

    if (res && !res.error) {
      setShowCreate(false);
      setNewCmdName('');
      setNewCmdDesc('');
      setNewCmdTemplate('');
      refresh();
      alert(`Command ${formattedName} created successfully on Telegram!`);
    } else {
      alert(res?.error || 'Creation failed');
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div className="h-6 w-44 bg-surface-700 rounded animate-pulse" />
          <div className="h-8 w-24 bg-surface-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 card p-4">
            <div className="h-4 w-28 bg-surface-600 rounded mb-3 animate-pulse" />
            {Array.from({length:6}).map((_,i)=><div key={i} className="h-12 bg-surface-700/70 animate-pulse rounded-xl mb-1.5" />)}
          </div>
          <div className="lg:col-span-3 card p-5">
            <div className="h-5 w-48 bg-surface-600 rounded mb-5 animate-pulse" />
            <div className="space-y-4">
              <div className="h-9 bg-surface-700 animate-pulse rounded" /><div className="h-9 bg-surface-700 animate-pulse rounded" /><div className="h-20 bg-surface-700 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-text-primary">Commands</h2>
          <span className="badge badge-green text-[11px]">{data?.total || 0} total</span>
          <span className="badge badge-yellow text-[11px]"><Zap size={10} /> {data?.live || 0} live</span>
          <span className="text-xs text-text-muted">Last sync: <strong className="text-primary">{data?.lastSync ? timeSince(data.lastSync) : 'Never'}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(!showCreate)} className="btn-outline text-xs">
            <Plus size={14} />
            Create Command
          </button>
          <button onClick={handleSync} disabled={syncing} className={`btn-primary text-xs ${syncFlash ? 'ring-1 ring-inset ring-primary/70' : ''}`}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncFlash ? 'Synced from TG ✓' : (syncing ? 'Pulling live...' : 'Sync list')}
          </button>
        </div>
      </div>

      {/* Create Command Modal / Overlay Inline */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 bg-surface-700 border-primary/30 space-y-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Plus size={16} className="text-primary" /> Create New Bot Command
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-text-muted font-semibold mb-1 block uppercase tracking-wider">Command Name (e.g. /info)</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="/info"
                value={newCmdName}
                onChange={(e) => setNewCmdName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted font-semibold mb-1 block uppercase tracking-wider">Description (shown in Telegram /help)</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Get info about the bot"
                value={newCmdDesc}
                onChange={(e) => setNewCmdDesc(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-text-muted font-semibold mb-1 block uppercase tracking-wider">Response Template</label>
            <textarea
              rows={2}
              className="input-field font-mono text-xs"
              placeholder="Template response..."
              value={newCmdTemplate}
              onChange={(e) => setNewCmdTemplate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-outline text-xs py-1.5 px-3">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary text-xs py-1.5 px-3">
              {creating ? 'Creating...' : 'Create on Telegram'}
            </button>
          </div>
        </form>
      )}

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Command list */}
        <div className="lg:col-span-2 card p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm text-text-secondary font-semibold">Commands</p>
            <span className="text-[11px] text-text-muted">{commands.length} registered</span>
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto scroll-container pr-1">
            {commands.map((cmd, idx) => (
              <button
                key={cmd.command}
                onClick={() => setSelected(idx)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                  (selected === idx)
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-surface-600 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-text-muted shrink-0">{'>'}_</span>
                  <span className="text-sm font-medium text-text-primary truncate">{cmd.command}</span>
                  <span className="badge badge-yellow text-[9px] py-0 px-1.5 shrink-0"><Zap size={8} />LIVE</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 ml-5 truncate">{cmd.description}</p>
                <p className="text-[11px] text-text-muted ml-5 opacity-60">{cmd.uses ? `${cmd.uses.toLocaleString()} uses` : '0 uses'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Command detail edit pane */}
        <div className="lg:col-span-3 card p-5 overflow-hidden">
          {active ? (
            <form onSubmit={handleSave}>
              <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Terminal size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-text-primary truncate">{active.command}</h3>
                    <p className="text-xs text-text-muted">{active.uses ? `${active.uses.toLocaleString()} triggers` : '0 triggers'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="p-2 text-text-muted hover:text-danger rounded-lg hover:bg-surface-600 transition-colors"
                    title="Delete Command"
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className="badge badge-yellow text-[11px]"><Zap size={10} /> SYNCED</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Command</label>
                  <input
                    type="text"
                    disabled
                    className="input-field font-mono opacity-50 cursor-not-allowed"
                    value={active.command}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Description (shown in Telegram /help)</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Response Template</label>
                  <textarea
                    rows={4}
                    className="input-field font-mono text-xs"
                    value={editTemplate}
                    onChange={(e) => setEditTemplate(e.target.value)}
                  />
                  <p className="text-[11px] text-text-muted mt-1.5">Use {'{{first_name}}'}, {'{{username}}'} for personalization.</p>
                </div>
              </div>

              {saveStatus && (
                <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                  saveStatus.success ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
                }`}>
                  {saveStatus.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span className="text-xs font-medium">{saveStatus.text}</span>
                </div>
              )}

              <div className="flex justify-end mt-5">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : '💾 Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-text-muted text-sm">Select a command to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
