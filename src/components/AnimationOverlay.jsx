import React, { useEffect, useState, useRef } from 'react';

export default function AnimationOverlay() {
  const [settings, setSettings] = useState({
    type: 'particles', // particles, confetti, snow, none
    speed: 50, // 1 to 100
    density: 50, // 1 to 100
    colorTheme: 'gold', // gold, neon, cold, multi
    interactive: true,
  });

  // Reload settings on mount and listen to storage updates
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('dashboard_animation_settings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadSettings();

    // Listen to custom event when settings change in the Animation page
    window.addEventListener('animation-settings-changed', loadSettings);
    // Also listen to storage events (in case of multi-tab sync, though same-tab is fine)
    window.addEventListener('storage', loadSettings);

    return () => {
      window.removeEventListener('animation-settings-changed', loadSettings);
      window.removeEventListener('storage', loadSettings);
    };
  }, []);

  if (settings.type === 'none') {
    return null;
  }

  if (settings.type === 'snow') {
    return <SnowOverlay speed={settings.speed} density={settings.density} />;
  }

  if (settings.type === 'confetti') {
    return <ConfettiOverlay speed={settings.speed} density={settings.density} colorTheme={settings.colorTheme} />;
  }

  return <ParticlesOverlay speed={settings.speed} density={settings.density} colorTheme={settings.colorTheme} interactive={settings.interactive} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PARTICLES OVERLAY (Canvas-based high-performance connecting particles)
// ─────────────────────────────────────────────────────────────────────────────
function ParticlesOverlay({ speed, density, colorTheme, interactive }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, radius: 180 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    // Determine particle colors based on luxurious themes
    const getColors = () => {
      switch (colorTheme) {
        case 'neon':
          return ['#3b82f6', '#8b5cf6', '#ec4899']; // Premium vibrant blues/purples
        case 'cold':
          return ['#93c5fd', '#e0f2fe', '#ffffff']; // Cold winter whites/blues
        case 'multi':
          return ['#f5c518', '#3b82f6', '#10b981', '#ef4444']; // Multi-color elite array
        case 'gold':
        default:
          return ['#f5c518', '#e0a904', '#fffbeb', '#ffd700']; // $3000 Golden Luxury theme
      }
    };

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        // Map 1-100 speed slider to reasonable velocities
        const speedMultiplier = (speed / 100) * 1.5 + 0.2;
        this.vx = (Math.random() - 0.5) * speedMultiplier;
        this.vy = (Math.random() - 0.5) * speedMultiplier;
        this.size = Math.random() * 2.5 + 1; // Elegant small dots (1px to 3.5px)
        const colors = getColors();
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.5 + 0.3;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce back from boundaries elegantly
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;

        // Push away from mouse (repulsion effect)
        if (interactive && mouseRef.current.x !== null) {
          const dx = this.x - mouseRef.current.x;
          const dy = this.y - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouseRef.current.radius) {
            const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * force * 1.2;
            const pushY = Math.sin(angle) * force * 1.2;
            this.x += pushX;
            this.y += pushY;
          }
        }
      }
    }

    const initParticles = () => {
      particles = [];
      // Calculate particle count based on slider density & screen size
      const area = (canvas.width * canvas.height) / 10000;
      const count = Math.floor(area * (density / 100) * 1.2);
      for (let i = 0; i < Math.min(count, 400); i++) {
        particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track mouse move for interactive physics
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
    }

    // Main animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Update and Draw Particles
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      // 2. Draw connections/webs
      ctx.globalAlpha = 0.12;
      const maxDistance = 110;
      const connectionColors = getColors();

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i];
          const pj = particles[j];
          const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);

          if (dist < maxDistance) {
            // Fade connection alpha near max distance
            const alpha = (1 - dist / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = pi.color; // Match connection line to first particle's color
            ctx.lineWidth = 0.6;
            ctx.globalAlpha = alpha;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [speed, density, colorTheme, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] select-none opacity-80"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONFETTI OVERLAY (Ultra-smooth drifting luxury confetti pieces)
// ─────────────────────────────────────────────────────────────────────────────
function ConfettiOverlay({ speed, density, colorTheme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let pieces = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initConfetti();
    };

    const getColors = () => {
      switch (colorTheme) {
        case 'gold':
          return ['#f5c518', '#d4a800', '#fffbeb', '#ffd700', '#c5a018']; // Pure Gold Luxury
        case 'neon':
          return ['#a855f7', '#ec4899', '#3b82f6', '#06b6d4', '#10b981']; // Cyber Neon
        case 'cold':
          return ['#93c5fd', '#38bdf8', '#e0f2fe', '#ffffff', '#cbd5e1']; // Ice-cold winter gems
        case 'multi':
        default:
          return ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f5c518', '#f97316']; // Premium Rainbow
      }
    };

    class ConfettiPiece {
      constructor(isInitial = false) {
        this.x = Math.random() * canvas.width;
        // If initial, scatter on screen. If respawning, start above top boundary.
        this.y = isInitial ? Math.random() * canvas.height : -20;
        this.size = Math.random() * 6 + 5; // Size (5px to 11px)
        this.colors = getColors();
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)];

        // Motion dynamics based on Speed slider
        const s = (speed / 100) * 3.5 + 1.2;
        this.vy = (Math.random() * 0.6 + 0.4) * s;
        this.vx = (Math.random() - 0.5) * (s * 0.4);

        // Luxurious 3D-rotation simulation
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() * 2 - 1) * (s * 0.8);
        this.wobble = Math.random() * 10;
        this.wobbleSpeed = Math.random() * 0.04 + 0.01;
        this.opacity = Math.random() * 0.4 + 0.5; // High opacity (0.5 to 0.9)
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        // Draw elegant rectangle shape
        // To simulate 3D rotation, wobble the drawn width
        const w = Math.sin(this.wobble) * this.size;
        ctx.fillRect(-w / 2, -this.size / 2, w, this.size);
        ctx.restore();
      }

      update() {
        this.y += this.vy;
        this.x += this.vx + Math.sin(this.wobble) * 0.3;
        this.rotation += this.rotationSpeed;
        this.wobble += this.wobbleSpeed;

        // If piece falls past bottom, respawn it on top beautifully
        if (this.y > canvas.height + 20) {
          Object.assign(this, new ConfettiPiece(false));
        }
        // If floats past sides, loop it back
        if (this.x < -20) this.x = canvas.width + 20;
        if (this.x > canvas.width + 20) this.x = -20;
      }
    }

    const initConfetti = () => {
      pieces = [];
      const count = Math.floor((density / 100) * 120);
      for (let i = 0; i < Math.min(count, 300); i++) {
        pieces.push(new ConfettiPiece(true));
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [speed, density, colorTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] select-none"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SNOW OVERLAY (Sophisticated cold chilly winter with fading fog/mist clouds)
// ─────────────────────────────────────────────────────────────────────────────
function SnowOverlay({ speed, density }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let flakes = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initSnow();
    };

    class SnowFlake {
      constructor(isInitial = false) {
        this.x = Math.random() * canvas.width;
        this.y = isInitial ? Math.random() * canvas.height : -15;
        this.size = Math.random() * 3.8 + 1.2; // Snowflake diameter (1.2px to 5px)

        // Map 1-100 speed slider to slow falling velocities (0.3px to 2.2px per frame)
        const s = (speed / 100) * 1.5 + 0.3;
        this.vy = (Math.random() * 0.4 + 0.6) * s;
        this.vx = (Math.random() * 0.4 - 0.2) * s; // Light side drift

        this.opacity = Math.random() * 0.4 + 0.35; // 0.35 to 0.75 opacities
        this.sway = Math.random() * 100;
        this.swaySpeed = Math.random() * 0.02 + 0.005;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        // Smooth gradient fill for each flake to simulate realistic blur glow!
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = this.size > 3 ? 3 : 0; // Adds glow to larger flakes
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }

      update() {
        this.y += this.vy;
        // Drifting horizontal sway
        this.x += this.vx + Math.sin(this.sway) * 0.22;
        this.sway += this.swaySpeed;

        if (this.y > canvas.height + 15) {
          Object.assign(this, new SnowFlake(false));
        }
        if (this.x < -15) this.x = canvas.width + 15;
        if (this.x > canvas.width + 15) this.x = -15;
      }
    }

    const initSnow = () => {
      flakes = [];
      const count = Math.floor((density / 100) * 160);
      for (let i = 0; i < Math.min(count, 350); i++) {
        flakes.push(new SnowFlake(true));
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      flakes.forEach((f) => {
        f.update();
        f.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [speed, density]);

  return (
    <>
      {/* 1. Canvas Snowflakes Layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[2] select-none"
      />

      {/* 2. $3000 Fading Fog and Chilly Winter Mist Overlays */}
      <div className="pointer-events-none fixed inset-0 z-[1] select-none overflow-hidden">
        {/* Subtle center-bottom warmth blending into chilly fog */}
        <div className="absolute inset-0 bg-radial-[circle_at_50%_100%] from-[rgba(255,255,255,0.015)] via-transparent to-transparent pointer-events-none mix-blend-screen" />

        {/* Dense dynamic fog layer rising from the bottom */}
        <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-gradient-to-t from-[rgba(255,255,255,0.025)] via-[rgba(255,255,255,0.008)] to-transparent pointer-events-none mix-blend-overlay blur-3xl animate-fog-slow" />

        {/* Full-screen floating horizontal mist drifting */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-screen bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,255,255,0.2)_0%,transparent_65%)] animate-fog-drift" />
      </div>
    </>
  );
}
