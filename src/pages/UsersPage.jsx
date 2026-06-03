import { useApi, apiPost } from '../hooks/useApi';
import { RefreshCw, Users, Search, MessageSquare, Cpu } from 'lucide-react';
import { useState } from 'react';

export default function UsersPage() {
  const { data, loading, refresh } = useApi('/users', 30000);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    await apiPost('/sync');
    refresh();
    setSyncing(false);
  };

  const handleExportCSV = () => {
    if (!users.length) return alert('No users to export yet. Sync or wait for bot activity.');
    const header = ['id','first_name','last_name','username','language','lastSeenISO','messagesCount','tokensUsed'];
    const rows = users.map(u => [
      u.id,
      (u.first_name || '').replace(/"/g,'""'),
      (u.last_name || '').replace(/"/g,'""'),
      (u.username || '').replace(/"/g,'""'),
      u.language_code || 'en',
      new Date(u.lastSeen).toISOString(),
      u.messagesCount || 0,
      u.tokensUsed || 0,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `n0m3rci-subscribers-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const users = data?.users || [];
  const lastSyncDisplay = data?.lastSync ? new Date(data.lastSync).toLocaleString() : "Never";

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const username = (user.username || '').toLowerCase();
    const id = String(user.id);
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || username.includes(query) || id.includes(query);
  });

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-text-primary">System Subscribers</h2>
          <span className="badge badge-green text-[11px]">● {users.length} Total</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="btn-outline text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium">
            Export CSV
          </button>
          <button onClick={handleSync} disabled={syncing} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync now
          </button>
        </div>
      </div>

      <strong className="text-xs text-text-muted">{"Last sync: "}{lastSyncDisplay}</strong>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-text-muted font-semibold uppercase">Total Users</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{users.length}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
            <MessageSquare size={18} className="text-yellow-500" />
          </div>
          <div>
            <p className="text-[11px] text-text-muted font-semibold uppercase">Active Today</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">
              {users.filter(u => Date.now() - u.lastSeen < 24 * 60 * 60 * 1000).length}
            </p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Cpu size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-[11px] text-text-muted font-semibold uppercase">Total Telemetry Active</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">
              {users.filter(u => u.messagesCount > 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex items-center bg-surface-800 border border-border/80 px-3.5 py-2 rounded-xl gap-2.5 max-w-md">
        <Search size={16} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Search by name, @username, or Telegram ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-0 outline-none text-sm text-text-primary w-full p-0 focus:ring-0 placeholder:text-zinc-500"
        />
      </div>

      {/* Users list */}
      <div className="card overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-surface-600 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {searchQuery ? 'No matching users found' : 'No subscribers yet'}
            </h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              {searchQuery ? 'Try adjusting your search terms or filters.' : 'Telegram has returned no users for this bot. Encourage people to message your bot, then click Sync now.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-5 text-[11px] text-text-muted uppercase font-semibold tracking-wider">Subscriber</th>
                  <th className="text-left py-3 px-5 text-[11px] text-text-muted uppercase font-semibold tracking-wider">Telegram ID</th>
                  <th className="text-left py-3 px-5 text-[11px] text-text-muted uppercase font-semibold tracking-wider">Username</th>
                  <th className="text-left py-3 px-5 text-[11px] text-text-muted uppercase font-semibold tracking-wider">Lang</th>
                  <th className="text-center py-3 px-5 text-[11px] text-text-muted uppercase font-semibold tracking-wider">Msgs Sent</th>
                  <th className="text-center py-3 px-5 text-[11px] text-text-muted uppercase font-semibold tracking-wider">Tokens Used</th>
                  <th className="text-left py-3 px-5 text-[11px] text-text-muted uppercase font-semibold tracking-wider">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-primary/20">
                          {user.first_name?.[0] || '?'}
                        </div>
                        <span className="text-text-primary font-medium truncate">{user.first_name} {user.last_name || ''}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-text-muted font-mono text-xs">
                      {user.id}
                    </td>
                    <td className="py-3 px-5 text-text-muted font-mono text-xs truncate max-w-[150px]">
                      {user.username ? (
                        <a href={`https://t.me/${user.username}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          @{user.username}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-5 text-text-muted uppercase text-xs">{user.language_code || 'en'}</td>
                    <td className="py-3 px-5 text-center text-text-primary font-semibold">{user.messagesCount || 0}</td>
                    <td className="py-3 px-5 text-center text-text-muted font-mono text-xs">{(user.tokensUsed || 0).toLocaleString()}</td>
                    <td className="py-3 px-5 text-text-muted text-xs">{new Date(user.lastSeen).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
