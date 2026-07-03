import { Zap, Shield, BarChart3, Globe, Cpu, Layers } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div className="text-left">
          <h2 className="text-xl font-bold text-text-primary">About</h2>
          <p className="text-xs text-text-muted mt-0.5">N0M3RCi AI Chat Bot — Admin Dashboard</p>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-2xl bg-surface-800 border border-border flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden shrink-0">
          <img src="/logo.png" alt="N0M3RCi Logo" className="w-full h-full object-cover max-w-full max-h-full block" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">🤖N0M3RCi AI Chat Bot</h1>
        <p className="text-sm text-text-muted max-w-xl mx-auto mt-2">
          Professional admin panel for managing your Telegram bot with real-time metrics, command management and subscriber insights powered by the Telegram Bot.
        </p>
        <span className="badge badge-yellow text-xs mt-4 inline-block">🇬🇭 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐝 𝐛𝐲 𝐍𝟎𝐌𝟑𝐑𝐂𝐢 🇬🇭</span>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          icon={Zap}
          title="Live Sync"
          description="Auto-polls Telegram Bot API every 1 minute. Manual sync anytime. All metrics are live."
        />
        <FeatureCard
          icon={BarChart3}
          title="Real-time Analytics"
          description="Track message volume, command usage, and subscriber growth with live visual charts."
        />
        <FeatureCard
          icon={Cpu}
          title="Command Manager"
          description="View all registered commands synced from Telegram. See usage stats and manage responses."
        />
        <FeatureCard
          icon={Shield}
          title="Secure Access"
          description="Password-protected with token-based auth. Credentials hidden by default with reveal toggle."
        />
        <FeatureCard
          icon={Globe}
          title="Hostable Anywhere"
          description="Deploy to Railway, Vercel, or any Node.js host. Connect with just a bot token."
        />
        <FeatureCard
          icon={Layers}
          title="Bot API Direct"
          description="No middleware or third-party services. Direct connection for maximum reliability."
        />
      </div>

      {/* Tech Stack */}
      <div className="card p-6 overflow-hidden">
        <h3 className="text-base font-semibold text-text-primary mb-4">Tech Stack</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TechBadge name="React 18" />
          <TechBadge name="Vite" />
          <TechBadge name="Tailwind CSS 4" />
          <TechBadge name="Express.js" />
          <TechBadge name="Telegram Bot API" />
          <TechBadge name="Lucide Icons" />
          <TechBadge name="React Router" />
          <TechBadge name="Node.js" />
        </div>
      </div>


      {/* Footer */}
      <div className="text-center py-4">
        <span className="badge badge-yellow text-xs mt-4 inline-block">🇬🇭 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐝 𝐛𝐲 𝐍𝟎𝐌𝟑𝐑𝐂𝐢 🇬🇭</span>
         <br></br>
      
      
      <br></br>
        <p className="text-xs text-text-muted"><strong>🤖N0M3RCi AI Chat Bot · V 1.0.0 · ©2026 All Right Reserved · Built From Scratch · No Third Party Wrappers.</strong></p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="card p-5">
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
        <Icon size={20} className="text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function TechBadge({ name }) {
  return (
    <div className="bg-surface-700 border border-border rounded-xl px-3 py-2.5 text-center">
      <span className="text-xs text-text-secondary font-medium">{name}</span>
    </div>
  );
}
