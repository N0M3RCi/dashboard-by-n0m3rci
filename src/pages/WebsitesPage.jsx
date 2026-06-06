import { useApi, apiPost } from '../hooks/useApi';
import { Globe, Monitor, Smartphone, Eye, Clock, ArrowUpRight, RefreshCw, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';

const COLORS = ['#eab308', '#f59e0b', '#d97706', '#b45309', '#78350f', '#a16207'];
const DEVICE_COLORS = { Desktop: '#eab308', Mobile: '#3b82f6', Tablet: '#10b981' };
const BROWSER_COLORS = ['#eab308', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

export default function WebsitesPage() {
  const { data, loading, refresh } = useApi('/webtrack-data', 15000);
  const [selectedSite, setSelectedSite] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleRefresh = async () => {
    setSyncing(true);
    await apiPost('/sync');
    refresh();
    setSyncing(false);
  };

  const handleClear = async (site) => {
    await apiPost('/webtrack/clear', { site: site || undefined });
    setShowClearConfirm(false);
    refresh();
  };

  const sites = data?.sites || {};
  const siteNames = data?.siteNames || [];

  // Compute all-sites aggregate
  const aggregate = useMemo(() => {
    if (!data?.sites) return null;
    const entries = Object.entries(data.sites);
    if (entries.length === 0) return null;
    return {
      visits: entries.reduce((s, [, v]) => s + (v.visits || 0), 0),
      visits24h: entries.reduce((s, [, v]) => s + (v.visits24h || 0), 0),
      uniqueIPs: entries.reduce((s, [, v]) => s + (v.uniqueIPs || 0), 0),
      avgTimeOnSite: entries.length > 0
        ? Math.round(entries.reduce((s, [, v]) => s + (v.avgTimeOnSite || 0), 0) / entries.length)
        : 0,
    };
  }, [data]);

  // Get the right data subset based on selected site
  const currentData = selectedSite === 'all' ? aggregate : sites[selectedSite] || null;
  const currentSiteVisits = selectedSite === 'all'
    ? (data?.dailyVisits ? Object.entries(data.dailyVisits).map(([day, sites]) => ({
        date: day.split('-').slice(1).join('/'),
        visits: Object.values(sites).reduce((s, c) => s + c, 0),
      })).slice(-15) : [])
    : (data?.dailyVisits ? Object.entries(data.dailyVisits).map(([day, sites]) => ({
        date: day.split('-').slice(1).join('/'),
        visits: sites[selectedSite] || 0,
      })).filter(d => d.visits > 0).slice(-15) : []);

  if (loading && !data) {
    return (
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1.5"><div className="h-6 w-44 bg-surface-700 animate-pulse rounded" /><div className="h-3 w-60 bg-surface-700/70 animate-pulse rounded" /></div>
          <div className="h-8 w-28 bg-surface-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i) => <div key={i} className="card p-5 h-24 bg-surface-700 animate-pulse" />)}
        </div>
        <div className="card p-5 h-72 bg-surface-700 animate-pulse" />
      </div>
    );
  }

  if (!data || siteNames.length === 0) {
    return (
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Website Analytics</h2>
            <p className="text-xs text-text-muted">Track visitors, page views, and device data from your websites</p>
          </div>
        </div>
        <div className="card text-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-surface-600 flex items-center justify-center mx-auto mb-4">
            <Globe size={28} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No website data yet</h3>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            Add the tracking script to your websites to start collecting visitor analytics.
            Each website will appear here with its own metrics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Website Analytics</h2>
          <p className="text-xs text-text-muted">
            {siteNames.length} website{siteNames.length !== 1 ? 's' : ''} tracked · Last updated{' '}
            <strong className="text-primary">{data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'never'}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowClearConfirm(true)} className="btn-outline text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-danger hover:bg-danger/10">
            <Trash2 size={14} /> Clear data
          </button>
          <button onClick={handleRefresh} disabled={syncing} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Site selector tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSite('all')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            selectedSite === 'all'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'bg-surface-700 text-text-muted border border-border hover:text-text-primary'
          }`}
        >
          All Sites
        </button>
        {siteNames.map(site => (
          <button
            key={site}
            onClick={() => setSelectedSite(site)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedSite === site
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-surface-700 text-text-muted border border-border hover:text-text-primary'
            }`}
          >
            {site}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Total Visits</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{(currentData?.visits || 0).toLocaleString()}</p>
          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
            <Eye size={11} className="text-primary" />
            Lifetime
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Visits (24h)</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{(currentData?.visits24h || 0).toLocaleString()}</p>
          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
            <ArrowUpRight size={11} className="text-primary" />
            Last 24 hours
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Unique IPs</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{(currentData?.uniqueIPs || 0).toLocaleString()}</p>
          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
            <Monitor size={11} className="text-primary" />
            Unique visitors
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Avg. Time on Site</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{currentData?.avgTimeOnSite || 0}s</p>
          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
            <Clock size={11} className="text-primary" />
            Per visit
          </p>
        </div>
      </div>

      {/* Per-site detail cards (when "All Sites" is selected) */}
      {selectedSite === 'all' && siteNames.map(site => {
        const s = sites[site];
        if (!s) return null;
        return (
          <div key={site} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Globe size={16} className="text-primary" /> {site}
                </h3>
              </div>
              <div className="flex gap-4 text-xs text-text-muted">
                <span><strong className="text-text-primary">{s.visits || 0}</strong> visits</span>
                <span><strong className="text-text-primary">{s.uniqueIPs || 0}</strong> unique IPs</span>
                <span><strong className="text-text-primary">{s.avgTimeOnSite || 0}s</strong> avg</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Charts: daily timeline + device/browser/OS breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily visit timeline */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Eye size={16} className="text-primary" /> Daily Visit Timeline ({selectedSite === 'all' ? 'All Sites' : selectedSite})
          </h3>
          <div className="h-56 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentSiteVisits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                />
                <Bar dataKey="visits" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Smartphone size={16} className="text-primary" /> Device Type
          </h3>
          {currentData?.deviceBreakdown?.length > 0 ? (
            <div className="h-52 w-full text-xs flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentData.deviceBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name">
                    {currentData.deviceBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={DEVICE_COLORS[entry.name] || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-text-muted">No device data yet</div>
          )}
        </div>

        {/* Browser breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Monitor size={16} className="text-primary" /> Browser Distribution
          </h3>
          {currentData?.browserBreakdown?.length > 0 ? (
            <div className="h-52 w-full text-xs flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentData.browserBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name">
                    {currentData.browserBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={BROWSER_COLORS[idx % BROWSER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-text-muted">No browser data yet</div>
          )}
        </div>

        {/* OS breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Monitor size={16} className="text-primary" /> Operating System
          </h3>
          {currentData?.osBreakdown?.length > 0 ? (
            <div className="h-52 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData.osBreakdown} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                  <XAxis type="number" stroke="#71717a" />
                  <YAxis dataKey="name" type="category" stroke="#71717a" width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
                  <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-text-muted">No OS data yet</div>
          )}
        </div>

        {/* Top Pages */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Globe size={16} className="text-primary" /> Top Pages
          </h3>
          {currentData?.topPages?.length > 0 ? (
            <div className="space-y-2">
              {currentData.topPages.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-text-secondary truncate flex-1">{p.page}</span>
                  <span className="text-xs font-mono text-text-primary ml-2">{p.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-text-muted">No page data yet</div>
          )}
        </div>
      </div>

      {/* Recent Visitors table */}
      {currentData?.recentVisitors?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Eye size={16} className="text-primary" /> Recent Visitors (Last 20)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-auto">
              <thead>
                <tr className="border-b border-border text-left text-[10px] text-text-muted uppercase tracking-wider">
                  <th className="py-2 px-2 font-semibold">Time</th>
                  <th className="py-2 px-2 font-semibold">Page</th>
                  <th className="py-2 px-2 font-semibold">IP</th>
                  <th className="py-2 px-2 font-semibold">Device</th>
                  <th className="py-2 px-2 font-semibold">Browser</th>
                  <th className="py-2 px-2 font-semibold">OS</th>
                  <th className="py-2 px-2 font-semibold text-right">Time Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {currentData.recentVisitors.map((v, idx) => (
                  <tr key={idx} className="table-row align-top">
                    <td className="py-3 px-2 text-text-muted whitespace-nowrap text-[11px]">{new Date(v.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 px-2 text-text-secondary truncate max-w-[180px]" title={v.page}>{v.page}</td>
                    <td className="py-3 px-2 font-mono text-[11px] text-text-muted">{v.ip}</td>
                    <td className="py-3 px-2 text-text-secondary">{v.device}</td>
                    <td className="py-3 px-2 text-text-secondary">{v.browser}</td>
                    <td className="py-3 px-2 text-text-secondary">{v.os}</td>
                    <td className="py-3 px-2 text-right font-mono text-text-primary">{v.timeSpent}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-800 border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-text-primary mb-2">Clear website data?</h3>
            <p className="text-xs text-text-muted mb-4">
              {selectedSite !== 'all'
                ? `This will permanently delete all analytics for ${selectedSite}.`
                : 'This will permanently delete ALL website analytics data.'}
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="btn-outline text-xs px-4 py-2 rounded-lg">
                Cancel
              </button>
              <button onClick={() => handleClear(selectedSite !== 'all' ? selectedSite : undefined)} className="bg-danger text-white text-xs px-4 py-2 rounded-lg font-semibold">
                Delete data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}