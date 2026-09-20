import { useCallback, useRef } from 'react';

// Shared AudioContext — one per app (singleton)
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a short sine-wave beep.
 * @param {number} frequency - Hz (default 1800 for hover, 1200 for click)
 * @param {number} duration  - seconds (default 0.03)
 * @param {number} volume    - 0-1 (default 0.06)
 */
function playTone(frequency = 1800, duration = 0.03, volume = 0.06) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio not available
  }
}

/**
 * Hook: returns onMouseEnter handler that plays a subtle hover tick.
 */
export function useHoverSound() {
  const lastPlayed = useRef(0);

  const onMouseEnter = useCallback(() => {
    const now = Date.now();
    // Throttle: min 60ms between sounds to avoid rapid-fire
    if (now - lastPlayed.current > 60) {
      playTone(1800, 0.025, 0.05);
      lastPlayed.current = now;
    }
  }, []);

  return { onMouseEnter };
}

/**
 * Hook: returns onClick handler that plays a deeper click sound.
 */
export function useClickSound() {
  const onClick = useCallback(() => {
    playTone(1200, 0.04, 0.08);
  }, []);

  return { onClick };
}

export default useHoverSound;
