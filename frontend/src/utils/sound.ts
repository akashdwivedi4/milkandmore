// Web Audio API Synthesizer for Delivery Alerts

let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;
const alertCooldowns = new Map<string, number>();

export const initAudioContext = (): void => {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (err) {
    console.warn('Failed to initialize AudioContext:', err);
  }
};

export const setAlertMuted = (muted: boolean): void => {
  isMuted = muted;
};

export const isAlertMuted = (): boolean => isMuted;

/**
 * Play a double-beep pleasant but attention-grabbing notification tone.
 */
export const playMissedCustomerTone = (customerId?: string, cooldownSeconds: number = 60): boolean => {
  if (isMuted) return false;

  // Check cooldown
  if (customerId) {
    const lastAlert = alertCooldowns.get(customerId) || 0;
    const now = Date.now();
    if (now - lastAlert < cooldownSeconds * 1000) {
      return false; // In cooldown, do not play
    }
    alertCooldowns.set(customerId, now);
  }

  try {
    initAudioContext();
    if (!audioCtx) return false;

    const now = audioCtx.currentTime;

    // Beep 1 (higher tone: 880Hz, A5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Beep 2 (cheerful resolve tone: 1174Hz, D6)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174, now + 0.25);
    gain2.gain.setValueAtTime(0.3, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.55);

    return true;
  } catch (err) {
    console.warn('Audio play error:', err);
    return false;
  }
};
