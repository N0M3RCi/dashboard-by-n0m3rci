import { useEffect, useState, useRef } from 'react';

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

  if (settings.type === 'snow' || settings.type === 'constellation') {
    // snow was the deprecated cold winter thing. now ALWAYS a beautiful modern color constellation
    // (for users who had 'snow' saved in localStorage we gracefully upgrade the visual)
    return <ConstellationOverlay speed={settings.speed} density={settings.density} colorTheme={settings.colorTheme} interactive={settings.interactive} />;
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
// 3. CONSTELLATION OVERLAY (replaces cold winter snow)
//    Modern digital/color constellation: glowing variable stars + vibrant line webs
//    Exactly same API as ParticlesOverlay so speed/density/colors/interactive just work.
//    Twinkling high-quality stars and color-matching elegant connections for a premium sigil look.
// ─────────────────────────────────────────────────────────────────────────────
function ConstellationOverlay({ speed, density, colorTheme, interactive }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, radius: 160 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let stars = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const getColors = () => {
      switch (colorTheme) {
        case 'neon':
          return ['#60a5fa', '#c084fc', '#f472b6', '#34d399'];
        case 'cold':
          return ['#bae6fd', '#e0f2fe', '#a5f3fc', '#f0f9ff'];
        case 'multi':
          return ['#fcd34d', '#c084fc', '#60a5fa', '#34d399', '#fb7185'];
        case 'gold':
        default:
          return ['#fde047', '#facc15', '#fffbeb', '#f59e0b'];
      }
    };

    class Star {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        const sMul = (speed / 100) * 0.8 + 0.25;
        this.vx = (Math.random() - 0.5) * sMul * 0.7;
        this.vy = (Math.random() - 0.5) * sMul * 0.7;
        this.size = Math.random() * 2.2 + 1.4; // Larger, varied to evoke stars
        const colors = getColors();
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.45 + 0.55;
        this.twinkle = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.04 + Math.random() * 0.035;
        this.pulse = Math.random() * 0.55 + 0.75;
      }

      draw() {
        const tw = 0.68 + Math.sin(this.twinkle) * 0.32 * this.pulse;
        const alpha = this.opacity * tw;

        // digital soft glow halo (constellations often show faint halos)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha * 0.15;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
        ctx.globalAlpha = alpha * 0.26;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.twinkle += this.twinkleSpeed;

        // toroidal wrap (beautiful for infinite sky field)
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        if (interactive && mouseRef.current.x !== null) {
          const dx = this.x - mouseRef.current.x;
          const dy = this.y - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouseRef.current.radius) {
            const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
            const angle = Math.atan2(dy, dx);
            const p = Math.cos(angle) * force * 1.2;
            const q = Math.sin(angle) * force * 1.2;
            this.x += p;
            this.y += q;
          }
        }
      }
    }

    const initStars = () => {
      stars = [];
      const area = (canvas.width * canvas.height) / 8800;
      const target = Math.floor(area * (density / 100) * 0.92);
      for (let i = 0; i < Math.min(target, 320); i++) {
        stars.push(new Star());
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

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

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      // artistic constellation lines
      ctx.globalAlpha = 0.17;
      const maxD = 138;

      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i];
          const b = stars[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < maxD) {
            const aa = Math.max(0.04, (1 - (d / maxD)) * 0.23);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = a.color;
            ctx.lineWidth = (d < 52) ? 0.95 : 0.55;
            ctx.globalAlpha = aa;
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
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [speed, density, colorTheme, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] select-none opacity-90"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

// (old snow implementation fully removed/replaced by modern constellation above)
// ----------------------------------------------------------------



    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let globalGust = 0;
    let gustTarget = 0;
    let lastGustAt = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dynamic windy gusts for ultra realistic snow motion (0 normal, up to ~1.8 occasional blast)
      const tNow = Date.now();
      if (tNow - lastGustAt > 1800 + Math.random() * 2900) {
        gustTarget = (Math.random() > 0.65) ? (0.7 + Math.random() * 1.15) : 0;
        lastGustAt = tNow;
      }
      // Ease gust in/out
      globalGust += (gustTarget - globalGust) * 0.032;

      flakes.forEach((f) => {
        f.update(globalGust);
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
      {/* 1. Canvas Snowflakes Layer - 6-pointed tumbling crystalline winter flakes */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[2] select-none"
      />

      {/* 2. Thick realistic cold winter fog + mist layers - heavy atmospheric "frosted" feel */}
      <div className="pointer-events-none fixed inset-0 z-[1] select-none overflow-hidden">
        {/* Very distant pale blue cold haze - sky simulation */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_48%_12%,rgba(186,215,255,0.045)_0%,transparent_68%)] mix-blend-screen" />

        {/* Low heavy ground fog bank (thicker denser near floor) */}
        <div className="absolute bottom-0 inset-x-0 h-[66vh] bg-gradient-to-t from-[rgba(232,242,255,0.075)] via-[rgba(255,255,255,0.032)] via-55% to-transparent pointer-events-none mix-blend-overlay blur-[42px] animate-fog-slow" />

        {/* Mid height swirling slow valley mist */}
        <div className="absolute inset-x-[6%] bottom-[9vh] h-[43vh] bg-gradient-to-br from-[rgba(255,255,255,0.022)] via-[rgba(232,242,255,0.040)] to-[rgba(255,255,255,0.015)] mix-blend-screen blur-3xl animate-fog-slow" style={{ animationDuration: '26s' }} />

        {/* Large drifting cold banks full screen horizontal travel for immersive winter depth */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-screen bg-[radial-gradient(ellipse_at_42%_38%,rgba(214,233,255,0.45)_0%,transparent_72%)] animate-fog-drift" />
        <div className="absolute inset-0 opacity-[0.038] pointer-events-none mix-blend-screen bg-[radial-gradient(ellipse_at_68%_59%,rgba(240,248,255,0.32)_0%,transparent_66%)] animate-fog-drift" style={{ animationDuration: '48s', transform: 'scale(1.1)' }} />

        {/* Fine frost/chill particulate haze overlay across entire view for final cold realism */}
        <div className="absolute inset-0 opacity-[0.022] mix-blend-screen bg-[repeating-radial-gradient(circle_at_center,rgba(250,252,255,0.9)_0,rgba(250,252,255,0.9)_0.6px,transparent_1.4px)]" />

        {/* Ground snow bank subtle accumulation for more realistic winter floor look + extra thick low fog */}
        <div className="absolute bottom-0 inset-x-0 h-[22vh] bg-gradient-to-t from-[rgba(255,255,255,0.08)] via-[rgba(232,242,255,0.045)] to-transparent mix-blend-overlay blur-2xl pointer-events-none" />
      </div>
    </>
  );
}
