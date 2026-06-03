import React, { useEffect, useState } from 'react';

export default function SnowOverlay() {
  const [flakes, setFlakes] = useState([]);

  useEffect(() => {
    // Generate a sparse but highly detailed list of snowflakes
    const flakeCount = 28; // Perfect density for beautiful, non-distracting premium look
    const newFlakes = Array.from({ length: flakeCount }).map((_, i) => {
      const duration = Math.random() * 12 + 16; // Extremely slow float (16s to 28s)
      return {
        id: i,
        left: Math.random() * 100, // percentage from left
        size: Math.random() * 4 + 3.5, // Realistic larger flakes (3.5px to 7.5px size)
        duration,
        // Distribute them perfectly along the vertical axis immediately on render
        delay: Math.random() * -duration,
        opacity: Math.random() * 0.25 + 0.20, // Light/medium highly realistic opacities
        wind: Math.random() * 60 - 30, // Drift sway
      };
    });
    setFlakes(newFlakes);
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
