import { useApi, apiPost } from '../hooks/useApi';
import { RefreshCw, BarChart3, Globe, Layers, Search, Download } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AnalyticsPage() {
  const { data, loading, refresh } = useApi('/analytics', 30000);
  const [syncing, setSyncing] = useState(false);
  const [syncFlash, setSyncFlash] = useState(false);

  // Event explorer state (top-tier data obs for all the rich Telegram events we ingest)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | message | command
  const [sortMode, setSortMode] = useState('time'); // time | tokens

  // Top-tier Live Activity Observatory: filtered + sorted rich event list pulled from Telegram bot data
  // NOTE: must be declared BEFORE any early return to obey react-hooks rules (same hook order every render)
  const filteredActivity = useMemo(() => {
    if (!data?.activity) return [];
    let items = data.activity;

    // Search across user/text/command
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      items = items.filter(a =>
        (a.firstName + ' ' + a.username + ' ' + (a.text || '') + ' ' + (a.command || '')).toLowerCase().includes(q) ||
        String(a.userId).includes(q)
      );
    }

    // Type filter using the TG data fields
    if (filterType === 'command') items = items.filter(a => a.isCommand);
    if (filterType === 'message') items = items.filter(a => !a.isCommand);

    // Sort (date desc or tokens desc)
    if (sortMode === 'time') {
      items = [...items].sort((a, b) => b.timestamp - a.timestamp);
    } else {
      items = [...items].sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
    }
    return items;
  }, [data?.activity, searchTerm, filterType, sortMode]);

  const handleSync = async () => {
    setSyncing(true);
    await apiPost('/sync');
    refresh();
    setSyncing(false);
    setSyncFlash(true);
    setTimeout(() => setSyncFlash(false), 1350);
  };

  if (loading && !data) {
    return (
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1.5"><div className="h-6 w-44 bg-surface-700 animate-pulse rounded" /><div className="h-3 w-60 bg-surface-700/70 animate-pulse rounded" /></div>
          <div className="h-8 w-28 bg-surface-700 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5 h-80"><div className="h-4 w-32 bg-surface-600 rounded mb-3 animate-pulse" /><div className="h-60 mt-3 w-full bg-surface-700/60 animate-pulse rounded" /></div>
          <div className="card p-5 h-80"><div className="h-4 w-20 bg-surface-600 rounded mb-3 animate-pulse" /><div className="h-52 w-52 mx-auto bg-surface-700/60 animate-pulse rounded-full mt-2" /></div>
        </div>

        <div className="card p-5"><div className="h-4 w-40 bg-surface-600 rounded mb-4 animate-pulse" /><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-20 bg-surface-700 rounded-xl animate-pulse" />)}</div></div>
      </div>
    );
  }

  const dailyData = data?.daily ? Object.entries(data.daily).map(([day, count]) => ({
    date: day.split('-').slice(1).join('/'), // format as MM/DD
    messages: count
  })).slice(-15) : []; // show last 15 days of active data

  const modelData = data?.modelBreakdown ? Object.entries(data.modelBreakdown).map(([model, count]) => ({
    name: model.split('/').pop() || model,
    value: count
  })) : [];

  const langData = data?.languageBreakdown ? Object.entries(data.languageBreakdown).map(([lang, count]) => ({
    language: lang.toUpperCase(),
    users: count
  })) : [];

  const COLORS = ['#eab308', '#f59e0b', '#d97706', '#b45309', '#78350f'];

  const hasData = data?.totalMessages > 0 || dailyData.length > 0;

  const exportFilteredCSV = () => {
    if (!filteredActivity.length) return alert('No events to export yet.');
    const header = ['timestampISO', 'userId', 'firstName', 'username', 'type', 'isCommand', 'command', 'text', 'model', 'tokens', 'cost'];
    const rows = filteredActivity.map(a => [
      new Date(a.timestamp).toISOString(),
      a.userId,
      (a.firstName || '').replace(/"/g, '""'),
      (a.username || '').replace(/"/g, '""'),
      a.type || '',
      a.isCommand ? '1' : '0',
      a.command || '',
      (a.text || '').replace(/"/g, '""'),
      a.model || '',
      a.tokens || 0,
      a.cost || 0,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `n0m3rci-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary">System Analytics</h2>
          <p className="text-xs text-text-muted">
            Live metrics from Telegram updates · Last sync <strong className="text-primary">{data?.lastSync ? timeSince(data.lastSync) : 'Never'}</strong>
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing} className={`btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${syncFlash ? 'scale-[0.985]' : ''}`}>
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncFlash ? 'Pulled ✓' : syncing ? 'Syncing TG…' : 'Sync now'}
        </button>
      </div>

      {/* Main Charts Row */}
      {hasData ? (
        <div className="space-y-5">
          {/* Daily Messages Bar Chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" /> Daily Traffic Volume
            </h3>
            <div className="h-56 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="messages" fill="var(--color-primary, #eab308)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Double column: Models and Languages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model distribution pie chart */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Layers size={16} className="text-primary" /> Model Demographics
                </h3>
                <p className="text-[11px] text-text-muted mb-4">Total volume slice per AI model</p>
              </div>

              {modelData.length > 0 ? (
                <div className="h-52 w-full text-xs flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {modelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-xs text-text-muted">
                  No model tracking data recorded yet
                </div>
              )}
            </div>

            {/* Language stats */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Globe size={16} className="text-primary" /> Subscriber Languages
                </h3>
                <p className="text-[11px] text-text-muted mb-4">Users language profile breakdown</p>
              </div>

              {langData.length > 0 ? (
                <div className="h-52 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={langData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                      <XAxis type="number" stroke="#71717a" />
                      <YAxis dataKey="language" type="category" stroke="#71717a" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                      />
                      <Bar dataKey="users" fill="#d97706" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-xs text-text-muted">
                  No language analytics captured yet
                </div>
              )}
            </div>
          </div>

          {/* Live Activity Observatory — top-tier modern explorer for ALL the rich live data pushed from your Telegram bot */}
          {data.activity?.length > 0 && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Search size={16} className="text-primary" /> Activity Observatory
                  </h3>
                  <p className="text-[11px] text-text-muted">Searchable + filterable events pulled live from Telegram (last 50)</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search user, text, command, ID…"
                    className="input-field text-xs py-1 px-3 w-52"
                  />
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field text-xs py-1 px-2">
                    <option value="all">All events</option>
                    <option value="message">Messages only</option>
                    <option value="command">Commands only</option>
                  </select>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="input-field text-xs py-1 px-2">
                    <option value="time">Newest first</option>
                    <option value="tokens">Highest tokens</option>
                  </select>
                  <button onClick={exportFilteredCSV} className="btn-outline text-xs py-1 px-2 flex items-center gap-1.5">
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs table-auto">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] text-text-muted uppercase tracking-wider">
                      <th className="py-2 px-2 font-semibold">Time</th>
                      <th className="py-2 px-2 font-semibold">User</th>
                      <th className="py-2 px-2 font-semibold">Message</th>
                      <th className="py-2 px-2 font-semibold">Model</th>
                      <th className="py-2 px-2 font-semibold text-right">Tokens</th>
                      <th className="py-2 px-2 font-semibold text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredActivity.length ? (
                      filteredActivity.slice(0, 60).map((a, idx) => (
                        <tr key={idx} className="table-row align-top">
                          <td className="py-3 px-2 text-text-muted whitespace-nowrap text-[11px]">{new Date(a.timestamp).toLocaleTimeString()}</td>
                          <td className="py-3 px-2 min-w-[160px]">
                            <div className="font-semibold text-text-primary truncate">{a.firstName}</div>
                            {a.username && <div className="text-primary text-[10px] truncate">@{a.username}</div>}
                            <div className="text-[10px] text-text-muted">ID {a.userId} · {a.type}</div>
                          </td>
                          <td className="py-3 px-2 min-w-[220px]">
                            {a.isCommand && <span className="badge badge-yellow text-[9px] mr-1.5 align-middle">{a.command}</span>}
                            <span className="text-text-secondary break-words line-clamp-2">{a.text || (a.isCommand ? '(command executed)' : '(no text)')}</span>
                          </td>
                          <td className="py-3 px-2 text-text-muted"><span className="font-mono text-[10px]">{a.model ? a.model.split('/').pop() : '—'}</span></td>
                          <td className="py-3 px-2 text-right font-mono text-text-primary">{(a.tokens || 0).toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-mono text-green-400 text-[11px]">${(a.cost || 0).toFixed(4)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="py-6 text-center text-text-muted text-xs">No matching events for current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-text-muted text-right">{filteredActivity.length} matching events (of {data.activity.length} captured)</div>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-surface-600 flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No data yet</h3>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            As people message your bot or fire commands, this page will populate with real analytics data from the Telegram API.
          </p>
        </div>
      )}
    </div>
  );
}

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'Just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
