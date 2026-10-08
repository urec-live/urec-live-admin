import { Injectable, InjectionToken, inject, signal } from '@angular/core';

/** Creates the Web Audio context; swapped for a fake in tests. Returns null where audio is unsupported. */
export const AUDIO_CONTEXT_FACTORY = new InjectionToken<() => AudioContext | null>('AUDIO_CONTEXT_FACTORY', {
  providedIn: 'root',
  factory: () => () => {
    const Ctor =
      typeof window === 'undefined'
        ? undefined
        : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  },
});

export const CHIME_MUTED_KEY = 'urec_help_chime_muted';

function readMuted(): boolean {
  try {
    return localStorage.getItem(CHIME_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * The two-tone "cabin call" chime played when a member calls staff. Synthesised with Web Audio,
 * so there's no sound file to load. Browsers block audio until someone interacts with the page,
 * so {@link armUnlock} resumes audio on the first click or keypress after a reload.
 */
@Injectable({ providedIn: 'root' })
export class ChimeService {
  private createContext = inject(AUDIO_CONTEXT_FACTORY);
  private context: AudioContext | null = null;

  readonly muted = signal(readMuted());

  setMuted(muted: boolean): void {
    this.muted.set(muted);
    try {
      localStorage.setItem(CHIME_MUTED_KEY, String(muted));
    } catch {
      // Storage blocked: the setting just won't survive a reload
    }
  }

  /** Resumes audio if the browser suspended it. Call from a user gesture. */
  unlock(): void {
    const context = this.ensureContext();
    if (context?.state === 'suspended') context.resume().catch(() => {});
  }

  /** Unlocks audio on the next click or keypress anywhere. Returns a function that stops listening. */
  armUnlock(): () => void {
    const handler = () => {
      this.unlock();
      remove();
    };
    const remove = () => {
      document.removeEventListener('pointerdown', handler);
      document.removeEventListener('keydown', handler);
    };
    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', handler);
    return remove;
  }

  /** A high note then a lower one, like an aircraft cabin call. Does nothing when muted. */
  play(): void {
    if (this.muted()) return;
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    const start = context.currentTime;
    this.tone(context, 988, start, 0.45); // B5
    this.tone(context, 784, start + 0.35, 0.6); // G5
  }

  private tone(context: AudioContext, frequency: number, at: number, duration: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }

  private ensureContext(): AudioContext | null {
    if (!this.context) {
      try {
        this.context = this.createContext();
      } catch {
        this.context = null;
      }
    }
    return this.context;
  }
}
