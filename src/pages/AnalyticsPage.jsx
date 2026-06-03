import { useApi, apiPost } from '../hooks/useApi';
import { RefreshCw, BarChart3, PieChart as PieIcon, Globe, Layers } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AnalyticsPage() {
  const { data, loading, refresh } = useApi('/analytics', 30000);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await apiPost('/sync');
    refresh();
    setSyncing(false);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
        <button onClick={handleSync} disabled={syncing} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          Sync now
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

          {/* Activity feed */}
          {data.activity?.length > 0 && (
            <div className="card p-5">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Recent Direct Interactions</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto scroll-container">
                {data.activity.slice(0, 25).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-surface-700/60 border border-border/40 rounded-xl overflow-hidden text-xs">
                    <span className="text-sm shrink-0">{a.isCommand ? '⚡' : '💬'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary truncate">{a.firstName}</span>
                        {a.username && <span className="text-text-muted truncate">@{a.username}</span>}
                        <span className="text-[10px] text-zinc-500">ID: {a.userId}</span>
                      </div>
                      {a.text && <p className="text-text-muted mt-0.5 truncate">{a.text}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {a.command && <span className="badge badge-yellow text-[10px]">{a.command}</span>}
                        {a.model && <span className="badge badge-green text-[10px]">{a.model.split('/').pop()}</span>}
                      </div>
                      <span className="text-[10px] text-text-muted">{new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
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
