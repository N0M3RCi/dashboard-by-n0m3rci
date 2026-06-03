import { useApi, apiPost } from '../hooks/useApi';
import { RefreshCw, Eye, EyeOff, Copy, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { data, loading, refresh } = useApi('/settings', 30000);
  const { data: botMeta } = useApi('/bot-meta', 60000); // Pulls the full TG Bot API exported metadata snapshot for inspector.
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable fields form state — initialize from localStorage to survive navigation
  const [botDisplayName, setBotDisplayName] = useState(() => localStorage.getItem('draft_botDisplayName') || '');
  const [botDescription, setBotDescription] = useState(() => localStorage.getItem('draft_botDescription') || '');
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('draft_webhookUrl') || '');
  const [botToken, setBotToken] = useState(() => localStorage.getItem('stored_bot_token') || '');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { success: boolean, text: string }
  const [initialized, setInitialized] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Only populate form from API on first load (not on every refresh)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data && !initialized) {
      setInitialized(true);
      const savedToken = localStorage.getItem('stored_bot_token');
      const draftName = localStorage.getItem('draft_botDisplayName');
      const draftDesc = localStorage.getItem('draft_botDescription');
      const draftWebhook = localStorage.getItem('draft_webhookUrl');

      // Prefer server data (last permanently saved/persisted on disk) over old unsaved drafts.
      // Ensures on close/reopen dashboard the canonical values from save settings always appear.
      setBotDisplayName(data.botDisplayName || draftName || '');
      setBotDescription(data.botDescription || draftDesc || '');
      setWebhookUrl(data.webhookUrl || draftWebhook || '');
      setBotToken(savedToken || data.botToken || '');
    }
  }, [data, initialized]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist draft edits to localStorage so they survive tab switches
  useEffect(() => {
    if (initialized) {
      localStorage.setItem('draft_botDisplayName', botDisplayName);
      localStorage.setItem('draft_botDescription', botDescription);
      localStorage.setItem('draft_webhookUrl', webhookUrl);
      localStorage.setItem('stored_bot_token', botToken);
    }
  }, [botDisplayName, botDescription, webhookUrl, botToken, initialized]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await apiPost('/test-connection');
    setTestResult(result);
    setTesting(false);
    refresh();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(botToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    const res = await apiPost('/settings', {
      botDisplayName,
      botDescription,
      webhookUrl,
      botToken,
    });

    setSaving(false);
    if (res && !res.error) {
      // Clear drafts — server now has the canonical values
      localStorage.removeItem('draft_botDisplayName');
      localStorage.removeItem('draft_botDescription');
      localStorage.removeItem('draft_webhookUrl');
      localStorage.setItem('stored_bot_token', botToken);
      setSaveStatus({
        success: true,
        text: 'Changes saved successfully and updated on Telegram!',
      });
      refresh();
    } else {
      setSaveStatus({
        success: false,
        text: res?.error || 'Failed to save settings',
      });
    }
  };

  const handleResetAnalytics = async () => {
    if (!window.confirm('⚠️ This will permanently WIPE message logs, subscribers, command usage history and token counts from the stored analytics (disk + in-memory).\n\nThe data will begin repopulating from fresh bot interactions or a manual Force Sync.\n\nThis is mainly for cleaning test data. Continue?')) {
      return;
    }
    setResetting(true);
    await apiPost('/debug/reset-analytics');
    setResetting(false);
    // Tell any open pages to refetch
    window.dispatchEvent(new CustomEvent('api-refresh'));
    alert('Analytics fully reset. Switch to Dashboard page and click "Force Sync" (or refresh the tabs) so the UI picks up the clean state.');
  };

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const d = data || {};

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary">Settings</h2>
        <p className="text-xs text-text-muted mt-0.5">Manage bot credentials, display attributes and connection profiles</p>
      </div>

      {/* Connection Status */}
      <div className="card p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg">🔌</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary">Connection Status</h3>
              <p className="text-xs text-text-muted">Verify your bot token reaches Telegram</p>
            </div>
            <span className={`badge ${testResult?.success ? 'badge-green' : 'badge-neutral'} text-[11px] shrink-0`}>
              ● {testResult?.success ? 'CONNECTED' : 'NOT TESTED'}
            </span>
          </div>
          <button type="button" onClick={handleTest} disabled={testing} className="btn-primary text-xs shrink-0">
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            Test connection
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoBox label="BOT" value={`@${d.botUsername || 'KwameJr_bot'}`} />
          <InfoBox label="LATENCY" value={testResult?.latency ? `${testResult.latency}ms` : d.latency ? `${d.latency}ms` : '—'} />
          <InfoBox label="LAST TESTED" value={testResult ? 'Just now' : 'Never'} />
          <InfoBox label="ENDPOINT" value={d.endpoint || 'Webhook'} />
        </div>
      </div>

      {/* Bot Credentials Form */}
      <form onSubmit={handleSave} className="card p-6 overflow-hidden space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-lg">🔑</span>
            <h3 className="text-base font-semibold text-text-primary">Bot Credentials</h3>
          </div>
          <span className="badge badge-yellow text-[11px]">🔄 SYNCED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              required
              className="input-field"
              value={botDisplayName}
              onChange={(e) => setBotDisplayName(e.target.value)}
              placeholder="N0M3RCi"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Username</label>
            <input
              type="text"
              disabled
              className="input-field opacity-50 cursor-not-allowed font-mono"
              value={`@${d.botUsername || 'KwameJr_bot'}`}
            />
            <p className="text-[10px] text-text-muted mt-1">Username is fixed on Telegram.</p>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Bot Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              required
              className="input-field font-mono pr-24"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" onClick={() => setShowToken(!showToken)} className="text-text-muted hover:text-text-primary transition-colors">
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button type="button" onClick={handleCopy} className="text-text-muted hover:text-primary transition-colors">
                {copied ? <CheckCircle size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-text-muted mt-1.5">Your token grants full access to the bot. Keep it private.</p>
        </div>

        <div>
          <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Webhook URL</label>
          <div className="relative">
            <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="url"
              className="input-field pl-11"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/webhook"
            />
          </div>
          <p className="text-[11px] text-text-muted mt-1.5">Leave empty to use automatic live Polling instead of a webhook.</p>
        </div>

        <div>
          <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Bot Description</label>
          <textarea
            rows={3}
            className="input-field"
            value={botDescription}
            onChange={(e) => setBotDescription(e.target.value)}
            placeholder="Introduce your bot here..."
          />
        </div>

        {saveStatus && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
            saveStatus.success ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
          }`}>
            {saveStatus.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-xs font-medium">{saveStatus.text}</span>
          </div>
        )}

        {/* Top Tier: Live Telegram Bot API Inspector — on EVERY sync this section receives real data directly from TG (via /bot-meta) */}
        {botMeta && (
          <div className="mt-5 pt-4 border-t border-border/60">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Globe size={14} /> LIVE TELEGRAM BOT API SNAPSHOT <span className="font-mono text-[10px] text-primary">(all available data)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="card-dark p-3">
                <div className="font-semibold mb-1 text-text-secondary">Profile</div>
                <div>@{botMeta.me?.username || '—'} · {botMeta.me?.first_name || '—'}</div>
                <div className="text-[10px] text-text-muted">id: {botMeta.me?.id || '—'} · can_join_groups: {String(botMeta.me?.can_join_groups)}</div>
              </div>
              <div className="card-dark p-3">
                <div className="font-semibold mb-1 text-text-secondary">Descriptions (synced live)</div>
                <div className="truncate"><span className="text-text-muted">Full:</span> {botMeta.description || '—'}</div>
                <div className="truncate"><span className="text-text-muted">Short:</span> {botMeta.shortDescription || '—'}</div>
              </div>
              <div className="card-dark p-3">
                <div className="font-semibold mb-1 text-text-secondary">Webhook</div>
                <div>{(botMeta.webhook?.url) ? 'ACTIVE' : 'POLLING'} {botMeta.webhook?.url ? '• ' + botMeta.webhook.url : ''}</div>
                <div className="text-[10px] text-text-muted">pending: {botMeta.webhook?.pending_update_count || 0} · last err: {botMeta.webhook?.last_error_message || 'none'}</div>
              </div>
              <div className="card-dark p-3">
                <div className="font-semibold mb-1 text-text-secondary">Commands registered on TG</div>
                <div>{(botMeta.commands || []).length} commands</div>
                <div className="text-[10px] text-text-muted truncate">{(botMeta.commands || []).map(c => '/' + c.command).join(', ') || '—'}</div>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-text-muted">Data is always re-pulled live from the Telegram Bot API when you hit any Sync. No stale data.</p>
          </div>
        )}

        {/* Danger zone: reset the collected data (analytics + users + logs). Useful if polluted by tests. */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetAnalytics}
              className="px-3 py-1.5 rounded-lg border border-danger/40 hover:bg-danger/10 active:bg-danger/20 text-danger text-xs font-semibold transition disabled:opacity-50"
            >
              {resetting ? 'Resetting…' : '🧹 Reset Analytics (wipe msgs/users/counts)'}
            </button>
            <span className="text-[11px] text-text-muted">Removes everything stored in analytics.json so counters and lists start over on next activity/sync.</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving changes...' : '💾 Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="bg-surface-700 border border-border rounded-xl px-4 py-3 overflow-hidden">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-sm font-semibold text-text-primary truncate">{value}</p>
    </div>
  );
}
