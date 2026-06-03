import { useState, useEffect } from 'react';
import { Sparkles, Sliders, Check, Activity, Palette } from 'lucide-react';

export default function AnimationsPage() {
  const [settings, setSettings] = useState(() => {
    // Lazy initializer avoids setState in effect (fixes react-hooks set-state-in-effect violation)
    try {
      const saved = localStorage.getItem('dashboard_animation_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      type: 'snow',
      speed: 50,
      density: 50,
      colorTheme: 'gold',
      interactive: true,
    };
  });
  const [successMsg, setSuccessMsg] = useState('');

  // Only listen for live changes from other tabs / animation settings page (no initial setState here)
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('dashboard_animation_settings');
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('animation-settings-changed', loadSettings);
    window.addEventListener('storage', loadSettings);
    return () => {
      window.removeEventListener('animation-settings-changed', loadSettings);
      window.removeEventListener('storage', loadSettings);
    };
  }, []);

  const handleSave = () => {
    localStorage.setItem('dashboard_animation_settings', JSON.stringify(settings));
    // Trigger custom event to let the main AnimationOverlay know it should reload settings
    window.dispatchEvent(new CustomEvent('animation-settings-changed'));

    setSuccessMsg('Animation profile updated & permanently saved!');
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  // Helper to change settings live
  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    // Auto-apply live settings for instant gratification!
    localStorage.setItem('dashboard_animation_settings', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('animation-settings-changed'));
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary animate-pulse" size={24} />
          <h2 className="text-xl font-bold text-text-primary">VFX & Animations</h2>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          Infuse ultra-modern, interactive physics and high-fidelity, luxury atmospheric animations into your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Config Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Selector */}
          <div className="card p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-glow rounded-full blur-3xl pointer-events-none opacity-40" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Atmosphere Selection</h3>
                <p className="text-xs text-text-muted">Choose your ambient atmospheric overlay</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <AnimationSelectorCard
                id="snow"
                title="Cold Winter Snow"
                desc="Calm, chilly falling snow flakes integrated with drifting horizontal mist and fading fog clouds."
                icon="❄️"
                active={settings.type === 'snow'}
                onClick={() => {
                  const updated = { ...settings, type: 'snow', colorTheme: 'cold' };
                  setSettings(updated);
                  localStorage.setItem('dashboard_animation_settings', JSON.stringify(updated));
                  window.dispatchEvent(new CustomEvent('animation-settings-changed'));
                }}
              />
              <AnimationSelectorCard
                id="confetti"
                title="Luxury Confetti"
                desc="Ultra-smooth, slow falling 3D rotated ribbons drifting across the screen for celebratory vibes."
                icon="🎉"
                active={settings.type === 'confetti'}
                onClick={() => updateSetting('type', 'confetti')}
              />
              <AnimationSelectorCard
                id="none"
                title="Disable FX"
                desc="Turn off all atmospheric elements completely for a static, clean dashboard appearance."
                icon="🚫"
                active={settings.type === 'none'}
                onClick={() => updateSetting('type', 'none')}
              />
            </div>
          </div>

          {/* Card 2: Speed / Density Settings */}
          {settings.type !== 'none' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sliders className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">VFX Dynamics</h3>
                  <p className="text-xs text-text-muted">Configure velocity vectors and component concentration</p>
                </div>
              </div>

              <div className="space-y-5 pt-2">
                {/* Speed Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">Velocity Speed</span>
                    <span className="font-mono text-primary font-bold">{settings.speed}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    className="w-full h-2 rounded-lg bg-surface-600 appearance-none cursor-pointer accent-primary"
                    value={settings.speed}
                    onChange={(e) => updateSetting('speed', parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Zen Snail</span>
                    <span>Standard</span>
                    <span>Blazing Fast</span>
                  </div>
                </div>

                {/* Density Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">Component Density</span>
                    <span className="font-mono text-primary font-bold">{settings.density}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    className="w-full h-2 rounded-lg bg-surface-600 appearance-none cursor-pointer accent-primary"
                    value={settings.density}
                    onChange={(e) => updateSetting('density', parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Sparse Elegance</span>
                    <span>Atmospheric</span>
                    <span>Max Overdrive</span>
                  </div>
                </div>
              </div>

              {/* Advanced Properties (color only for non-snow types like confetti) */}
              {settings.type !== 'snow' && settings.type !== 'none' && (
                <div className="border-t border-border pt-5 space-y-4">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-widest">Aesthetics & Behaviors</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Theme Selector */}
                    <div>
                      <label className="text-[11px] text-text-muted font-semibold mb-1.5 block uppercase tracking-wider">Color Swatch</label>
                      <div className="grid grid-cols-4 gap-2">
                        <ThemeSwatchButton
                          theme="gold"
                          label="Gold"
                          active={settings.colorTheme === 'gold'}
                          colorClass="bg-gradient-to-tr from-[#e0a904] to-[#f5c518]"
                          onClick={() => updateSetting('colorTheme', 'gold')}
                        />
                        <ThemeSwatchButton
                          theme="neon"
                          label="Neon"
                          active={settings.colorTheme === 'neon'}
                          colorClass="bg-gradient-to-tr from-[#3b82f6] to-[#ec4899]"
                          onClick={() => updateSetting('colorTheme', 'neon')}
                        />
                        <ThemeSwatchButton
                          theme="cold"
                          label="Cold"
                          active={settings.colorTheme === 'cold'}
                          colorClass="bg-gradient-to-tr from-[#38bdf8] to-[#ffffff]"
                          onClick={() => updateSetting('colorTheme', 'cold')}
                        />
                        <ThemeSwatchButton
                          theme="multi"
                          label="Multi"
                          active={settings.colorTheme === 'multi'}
                          colorClass="bg-gradient-to-tr from-[#ef4444] via-[#10b981] to-[#3b82f6]"
                          onClick={() => updateSetting('colorTheme', 'multi')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Column: Preview & Status Card */}
        <div className="space-y-6">
          <div className="card p-6 space-y-5 relative overflow-hidden bg-radial-[circle_at_50%_0%] from-surface-700 to-surface-800">
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Activity size={16} className="text-primary animate-pulse" />
              Engine Status
            </h3>

            <div className="space-y-4 text-xs pt-1">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Atmosphere State</span>
                <span className={`font-semibold ${settings.type === 'none' ? 'text-danger' : 'text-success'}`}>
                  ● {settings.type === 'none' ? 'DISABLED' : 'RUNNING'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Renderer Type</span>
                <span className="font-mono text-text-primary capitalize">{settings.type === 'none' ? 'Static HTML' : 'HTML5 Canvas 2D'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Animation Refresh</span>
                <span className="font-semibold text-text-primary">60 FPS (Hardware Accel)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Persistence Engine</span>
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Check size={12} strokeWidth={3} /> LocalStorage Sync
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleSave}
                className="w-full btn-primary justify-center text-xs py-3.5 font-bold"
              >
                💾 Save Animation Profile
              </button>
            </div>

            {successMsg && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-success/10 border-success/20 text-success text-xs font-semibold animate-bounce mt-2">
                <Check size={14} />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          <div className="bg-surface-700/50 border border-border rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Palette size={14} className="text-primary" />
              $3,000 Signature Edition
            </h4>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Every transition and particle calculation is optimized via requestAnimationFrame to guarantee butter-smooth performance. Built for the elite digital experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimationSelectorCard({ id: _id, title, desc, icon, active, onClick }) { // eslint-disable-line no-unused-vars
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3 select-none ${
        active
          ? 'bg-primary-glow border-primary/50 text-text-primary ring-1 ring-primary/30'
          : 'bg-surface-700/50 border-border text-text-secondary hover:border-border-light hover:bg-surface-600/30'
      }`}
    >
      <div className="w-9 h-9 rounded-xl bg-surface-800 border border-border flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-text-primary tracking-wide flex items-center gap-2">
          {title}
          {active && <Check size={12} className="text-primary" strokeWidth={3} />}
        </h4>
        <p className="text-[10px] text-text-muted leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}

function ThemeSwatchButton({ theme: _theme, label, active, colorClass, onClick }) { // eslint-disable-line no-unused-vars
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative group flex flex-col items-center p-1.5 rounded-xl border transition-all ${
        active
          ? 'bg-primary-glow border-primary text-primary'
          : 'bg-surface-700 border-border text-text-muted hover:border-border-light'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg ${colorClass} shadow-md border border-black/10 shrink-0 mb-1`} />
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
