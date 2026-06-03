import { useEffect, useRef, useState } from 'react';

// Tiny mouse-cursor-sized hand scrolling tool. Fixed far right. Replaces scrollbar.
// Supports tap-to-jump on vertical track, drag gesture to scroll, and direction-aware hand semi-animations.

export default function ScrollHand() {
  const [gesture, setGesture] = useState('idle'); // idle | point-up | point-down | grab
  const [thumbTopPct, setThumbTopPct] = useState(0);

  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const dragStateRef = useRef(null); // { startClientY, startScrollTop }
  const releaseTimerRef = useRef(null);
  const scrollListenerRef = useRef(null);

  const findScrollContainer = () => {
    // The primary page scroller is the <main> from Layout (h-full overflow-y-auto)
    const main = document.querySelector('main');
    if (main && main.scrollHeight > main.clientHeight + 4) return main;
    // Fallback to document scroll if layout ever changes
    return document.scrollingElement || document.documentElement;
  };

  const cleanupTimers = () => {
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  };


  const flashGesture = (dir) => {
    cleanupTimers();
    const g = dir < 0 ? 'point-up' : 'point-down';
    setGesture(g);
    // Return to idle soon after the anim plays. Longer for visibility of gesture.
    releaseTimerRef.current = setTimeout(() => {
      setGesture('idle');
    }, 650);
  };

  const updateThumbPosition = () => {
    const container = containerRef.current || findScrollContainer();
    if (!container) return;
    const max = Math.max(1, container.scrollHeight - container.clientHeight);
    const frac = Math.max(0, Math.min(1, container.scrollTop / max));
    setThumbTopPct(frac);
  };

  // Attach one time scroll listener once container exists
  useEffect(() => {
    let tries = 0;
    const attach = () => {
      const c = findScrollContainer();
      if (!c) {
        if (tries++ < 20) setTimeout(attach, 50);
        return;
      }
      containerRef.current = c;

      const listener = () => {
        updateThumbPosition();

        // Detect delta sign to flash pointing gesture briefly during external scroll (native wheel / other)
        // Use a simple previous value for direction
        if (!listener._last) listener._last = c.scrollTop;
        const delta = c.scrollTop - listener._last;
        listener._last = c.scrollTop;

        // Flash only when obvious scroll motion (avoid micro jitter)
        if (Math.abs(delta) > 3) {
          flashGesture(delta);
        }
      };

      c.addEventListener('scroll', listener, { passive: true });
      scrollListenerRef.current = { container: c, listener };

      // Initial sync
      updateThumbPosition();
    };

    attach();

    // Re-sync on window resize (scroll height / viewport can change)
    const onResize = () => updateThumbPosition();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cleanupTimers();
      if (scrollListenerRef.current) {
        const { container, listener } = scrollListenerRef.current;
        if (container && listener) container.removeEventListener('scroll', listener);
      }
    };
    // Run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag handlers
  const beginDrag = (clientY) => {
    const container = containerRef.current || findScrollContainer();
    if (!container) return;

    dragStateRef.current = {
      startClientY: clientY,
      startScrollTop: container.scrollTop,
    };
    setGesture('grab');
    // Lock native pointer events if needed — graceful fail
    try { document.body.style.userSelect = 'none'; } catch (e) { void e; }
    cleanupTimers();
  };

  const doDrag = (clientY) => {
    const drag = dragStateRef.current;
    const container = containerRef.current;
    if (!drag || !container) return;

    const deltaY = clientY - drag.startClientY;
    // Sensitivity tuned for finger drag feel matching mouse scroll pix per delta (2.4x scroll)
    const newScrollTop = Math.max(0, Math.min(
      container.scrollHeight - container.clientHeight,
      drag.startScrollTop + deltaY * 2.45
    ));
    container.scrollTop = newScrollTop;

    // Continuous gesture based on vertical move sign
    const dir = Math.sign(deltaY);
    if (dir !== 0) {
      setGesture(dir > 0 ? 'point-down' : 'point-up');
    }
  };

  const endDrag = () => {
    dragStateRef.current = null;
    try { document.body.style.userSelect = ''; } catch (e) { void e; }
    // After drag, briefly hold grab visual then idle
    setGesture('grab');
    releaseTimerRef.current = setTimeout(() => {
      setGesture('idle');
    }, 180);
    updateThumbPosition();
  };

  // Click the track: jump to that progress point with smooth + hand gesture
  const onTrackPointer = (e) => {
    if (dragStateRef.current) return; // ignore if dragging the handle concurrently

    const track = trackRef.current;
    const container = containerRef.current || findScrollContainer();
    if (!track || !container) return;

    const rect = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
    const target = p * maxScroll;

    // Smooth animation makes it feel premium
    container.scrollTo({ top: target, behavior: 'smooth' });

    // Determine gesture direction from current position comparison
    const nowScroll = container.scrollTop;
    const dir = target < nowScroll ? -1 : 1;
    flashGesture(dir);
  };

  // Handle on the small hand itself (also reacts as hit zone inside the track)
  const handleHandPointerDown = (e) => {
    e.stopPropagation();
    beginDrag(e.clientY);

    const onMove = (ev) => doDrag(ev.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endDrag();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // Vertical position within track based on pct — clamp inside track
  const thumbStyle = {
    top: `calc(${thumbTopPct * 100}% - 11px)`, // offset to keep 22px hand roughly centered on "thumb" location
    left: '50%',
    transform: 'translateX(-50%)',
  };

  // Current glyph + class for gesture
  let emoji = '🖐️';
  let className = 'hand-tool idle';
  if (gesture === 'grab') {
    emoji = '✊';
    className = 'hand-tool grab';
  } else if (gesture === 'point-up') {
    emoji = '👆';
    className = 'hand-tool point-up';
  } else if (gesture === 'point-down') {
    emoji = '👇';
    className = 'hand-tool point-down';
  }

  // Track geometry: tall thin right strip at far edge for page scroll interaction
  // (positioned outside content margins slightly so it's clearly "at the far right")
  // Align roughly to the scroll viewport area (ignore exact mobile header calc)
  return (
    <div
      className="fixed right-1 z-[180] w-6 pointer-events-none select-none"
      style={{
        top: '72px',
        height: 'calc(100dvh - 130px)',
      }}
      aria-hidden="true"
    >
      {/* Invisible tall track that receives clicks for proportion jump — thin affordance column */}
      <div
        ref={trackRef}
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(thumbTopPct * 100)}
        title="Drag hand to scroll • Tap track to jump"
        className="absolute inset-0 pointer-events-auto cursor-pointer"
        onPointerDown={onTrackPointer}
        onClick={onTrackPointer}
      />

      {/* The actual tiny hand at current scroll progress position. Mouse sized and gestureful. */}
      <div
        className="absolute left-1/2 w-[22px] h-[22px] flex items-center justify-center pointer-events-auto"
        style={thumbStyle}
        onPointerDown={handleHandPointerDown}
        title="Scroll handle — drag vertically. Size matches typical mouse cursor glyph."
      >
        <div
          className={className}
          style={{
            // ensure color is high contrast on the dark surface yet elegant
            color: '#f5c518',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))',
            opacity: gesture === 'idle' ? 0.65 : 1,
          }}
        >
          {emoji}
        </div>
      </div>

      {/* Extremely minimal cue: subtle vertical rule only under hover area on the right, for accessibility of "track". Non-obtrusive for premium look */}
      <div className="pointer-events-none absolute right-[5px] top-0 h-full w-px bg-white/10" />
    </div>
  );
}
