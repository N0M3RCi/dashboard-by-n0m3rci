import { useMemo } from 'react';

export default function SnowOverlay() {
  // Use useMemo (no state + effect) so we generate once without setState synchronously in effect.
  // This fixes the react-hooks/set-state-in-effect error and is more efficient.
  const flakes = useMemo(() => {
    // Use only deterministic math based on index (pure function, avoids React "impure render" rule).
    // This produces a visually stable layout of snowflakes that still looks varied and realistic.
    const flakeCount = 28;
    const seeded = (i, mod) => ((i * 16807 + 12345) % mod) / mod; // simple LCG-ish portable seed
    return Array.from({ length: flakeCount }).map((_, i) => {
      const duration = seeded(i, 12) + 16; // 16-28s
      return {
        id: i,
        left: seeded(i + 7, 100),
        size: seeded(i + 11, 4) + 3.5,
        duration,
        delay: -(seeded(i + 3, duration)),
        opacity: seeded(i + 19, 0.25) + 0.20,
        wind: seeded(i + 29, 60) - 30,
      };
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      {/* Light drifting fogs/clouds spreading over the dashboard */}
      <div className="absolute inset-0 bg-radial-[circle_at_50%_120%] from-[rgba(255,255,255,0.015)] via-transparent to-transparent mix-blend-screen pointer-events-none" />

      {/* Dynamic fog layer 1 */}
      <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-[rgba(255,255,255,0.02)] via-[rgba(255,255,255,0.005)] to-transparent pointer-events-none mix-blend-overlay blur-3xl animate-fog-slow" />

      {/* Dynamic fog layer 2 (drifting horizontally) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,255,255,0.15)_0%,transparent_60%)] animate-fog-drift" />

      {/* Snowflakes */}
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute rounded-full bg-white animate-snow"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            '--wind-drift': `${flake.wind}px`,
            filter: 'blur(0.4px)', // Soften edges for realism
          }}
        />
      ))}
    </div>
  );
}
