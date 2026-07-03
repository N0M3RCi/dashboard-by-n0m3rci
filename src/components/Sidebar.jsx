import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Terminal, BarChart3, Sparkles, Settings, Info, LogOut, RotateCcw, Bug } from 'lucide-react';
import { useApi } from '../hooks/useApi';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/commands', icon: Terminal, label: 'Commands' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/animations', icon: Sparkles, label: 'FX Animations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/reset', icon: RotateCcw, label: 'Reset' },
  { to: '/about', icon: Info, label: 'About' },
  { to: '/system-log', icon: Bug, label: 'System Log' },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const { data: bot } = useApi('/bot', 60000);

  const handleLogout = () => {
    localStorage.removeItem('dashToken');
    navigate('/login');
  };

  const handleNavClick = () => {
    // Close mobile drawer after navigation (polished UX)
    if (onClose) onClose();
  };

  return (
    <aside
      className={`fixed lg:static lg:translate-x-0 top-0 h-screen lg:h-full min-h-0 w-60 lg:w-56 bg-surface-800 border-r border-border flex flex-col z-50 transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-900 border border-border flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.png" alt="N0M3RCi Logo" className="w-full h-full object-cover max-w-full max-h-full block" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary tracking-wide truncate">🇬🇭 𝐍𝟎𝐌𝟑𝐑𝐂𝐢 🇬🇭</p>
            <p className="text-[10px] text-text-muted uppercase tracking-widest truncate">Restricted Access</p>
          </div>
        </div>
      </div>

      {/* Bot profile */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-600 flex items-center justify-center relative">
            <span className="text-sm">🦀</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-800"></span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary truncate">
              {bot?.first_name || '🤖N0M3RCi Bot'}
            </p>
            <p className="text-xs text-text-muted truncate">
              {bot?.username ? `@${bot.username}` : '@KwameJr_bot'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'nav-active'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-600'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-border space-y-3 mt-auto">
        {/* System status */}
        <div className="bg-surface-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="live-dot" />
            <span className="text-xs font-semibold text-text-primary">Systems Online</span>
          </div>
          <p className="text-[10px] text-text-muted">API connected · 99.98% uptime</p>
        </div>

        {/* Logout */}
        <button
          onClick={() => { handleLogout(); handleNavClick(); }}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-text-muted hover:text-danger hover:bg-surface-600 transition-colors"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
