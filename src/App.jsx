import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import CommandsPage from './pages/CommandsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import AnimationsPage from './pages/AnimationsPage';
import ResetPage from './pages/ResetPage';
import AnimationOverlay from './components/AnimationOverlay';
import ScrollHand from './components/ScrollHand';
import { Menu, X } from 'lucide-react';

function ProtectedRoute({ children }) {
  // Always let the user through without checking for a token
  return children;
}

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Prefetch/warm cache for all sidebar menus so metrics & data pages feel instant/low-load on navigation.
  // Uses the shared endpointCache in useApi.
  useEffect(() => {
    const token = localStorage.getItem('dashToken') || 'bypass-no-password';
    const eps = ['/overview', '/users', '/commands', '/analytics', '/settings', '/bot', '/bot-meta', '/cycles'];
    eps.forEach((ep) => {
      fetch(`/api${ep}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    });
  }, []);

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-surface-900">
      {/* Mobile top nav bar (premium polish: reach $6k feel with mobile-first) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-surface-800 border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm text-text-primary">
          🤖N0M3RCi <span className="font-normal text-text-muted">• Console</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-text-primary p-2 -mr-1 active:opacity-70" aria-label="Toggle menu">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Sidebar stretches the full viewport footer precisely (lg static, mobile drawer) to align exactly bottom with the main metric content area */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 p-5 lg:p-6 overflow-y-auto overflow-x-hidden h-full">
        <div className="max-w-[1100px] mx-auto pb-12">
          {children}
        </div>
      </main>

      {/* Small hand scrollbar replacement tool: far right of viewport. Mouse-cursor sized. Gesture animations + drag/click to scroll the page. */}
      <ScrollHand />
    </div>
  );
}

export default function App() {
  return (
    <>
      <AnimationOverlay />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Layout><UsersPage /></Layout></ProtectedRoute>} />
        <Route path="/commands" element={<ProtectedRoute><Layout><CommandsPage /></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Layout><AnalyticsPage /></Layout></ProtectedRoute>} />
        <Route path="/animations" element={<ProtectedRoute><Layout><AnimationsPage /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
        <Route path="/reset" element={<ProtectedRoute><Layout><ResetPage /></Layout></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><Layout><AboutPage /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
