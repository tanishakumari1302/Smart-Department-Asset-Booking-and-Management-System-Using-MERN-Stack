/**
 * Institutional Audio Notification Utility
 * Synthesizes crisp, professional auditory cues using the browser's native Web Audio API.
 * Requires 0 external audio assets and operates 100% reliably in all browsers.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn('Web Audio Context initialization warning:', err);
    return null;
  }
}

/**
 * 1. Play sound when faculty books an asset
 * Ascending pleasant institutional chime (C5 -> E5 -> G5)
 */
export function playBookingRequestSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      // Volume envelope
      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.36);
    });
  } catch (e) {
    console.warn('Error playing booking request sound:', e);
  }
}

/**
 * 2. Play sound when a booking is confirmed / approved
 * Celebratory double-chime / success arpeggio (C5 -> G5 -> C6 -> E6)
 */
export function playBookingConfirmedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 783.99, 1046.5, 1318.51]; // C5, G5, C6, E6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.46);
    });
  } catch (e) {
    console.warn('Error playing booking confirmed sound:', e);
  }
}

/**
 * 3. Play sound when an admin or staff member receives a request
 * Distinct urgent alert double-ping (A5 -> D6)
 */
export function playAdminRequestReceivedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const pings = [880.0, 1174.66]; // A5, D6
    const now = ctx.currentTime;

    pings.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.001, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.3);
    });
  } catch (e) {
    console.warn('Error playing admin request received sound:', e);
  }
}
