// Retro Romantic Chiptune & Music Box Web Audio API Synthesizer
// 100% Procedural synthesis - no external audio files required

export type RomanticThemeId = 'canon' | 'moonlight';

// Convert MIDI number to Frequency
const midiToFreq = (midi: number): number => {
  return 440 * Math.pow(2, (midi - 69) / 12);
};

// ROMANTIC MELODY: "Canon Cinta Romantis" (Romantic Love Canon)
// 16 bars of heartfelt, sweet, melodic romance at 74 BPM
// Durations in beats (1 beat = quarter note). All notes align to half-beat (eighth note) steps.
const CANON_MELODY: { note: number; dur: number }[] = [
  // Bar 1 (C Major): Walking under stars
  { note: 76, dur: 1.5 }, // E5
  { note: 74, dur: 0.5 }, // D5
  { note: 72, dur: 1.0 }, // C5
  { note: 74, dur: 1.0 }, // D5

  // Bar 2 (G Major): Longing glance
  { note: 71, dur: 2.0 }, // B4
  { note: 67, dur: 1.0 }, // G4
  { note: 71, dur: 1.0 }, // B4

  // Bar 3 (A minor): Steps drawing closer
  { note: 72, dur: 1.5 }, // C5
  { note: 71, dur: 0.5 }, // B4
  { note: 69, dur: 1.0 }, // A4
  { note: 71, dur: 1.0 }, // B4

  // Bar 4 (E minor): First gentle smile
  { note: 67, dur: 2.0 }, // G4
  { note: 64, dur: 2.0 }, // E4

  // Bar 5 (F Major): Hearts beating faster
  { note: 69, dur: 1.0 }, // A4
  { note: 72, dur: 1.0 }, // C5
  { note: 77, dur: 2.0 }, // F5

  // Bar 6 (C Major): Hands reaching out
  { note: 76, dur: 1.5 }, // E5
  { note: 74, dur: 0.5 }, // D5
  { note: 72, dur: 2.0 }, // C5

  // Bar 7 (F Major): Walking side by side
  { note: 74, dur: 1.0 }, // D5
  { note: 76, dur: 1.0 }, // E5
  { note: 77, dur: 1.0 }, // F5
  { note: 81, dur: 1.0 }, // A5

  // Bar 8 (G Major): Reaching resolution
  { note: 79, dur: 2.5 }, // G5
  { note: 77, dur: 0.5 }, // F5
  { note: 76, dur: 0.5 }, // E5
  { note: 74, dur: 0.5 }, // D5

  // Bar 9 (C Major - Climax): Warm embrace
  { note: 79, dur: 1.5 }, // G5
  { note: 81, dur: 0.5 }, // A5
  { note: 79, dur: 1.0 }, // G5
  { note: 76, dur: 1.0 }, // E5

  // Bar 10 (G Major): Looking into each other's eyes
  { note: 74, dur: 1.0 }, // D5
  { note: 76, dur: 1.0 }, // E5
  { note: 77, dur: 2.0 }, // F5

  // Bar 11 (A minor): Soft whispered feelings
  { note: 76, dur: 1.0 }, // E5
  { note: 77, dur: 1.0 }, // F5
  { note: 76, dur: 1.0 }, // E5
  { note: 72, dur: 1.0 }, // C5

  // Bar 12 (E minor): Floating stardust
  { note: 71, dur: 2.0 }, // B4
  { note: 67, dur: 2.0 }, // G4

  // Bar 13 (F Major): Transforming heart
  { note: 72, dur: 1.0 }, // C5
  { note: 74, dur: 1.0 }, // D5
  { note: 76, dur: 1.0 }, // E5
  { note: 77, dur: 1.0 }, // F5

  // Bar 14 (C Major): "I Love You" glowing in the sky
  { note: 79, dur: 2.0 }, // G5
  { note: 84, dur: 2.0 }, // C6

  // Bar 15 (F Major / Dm): Pure happiness
  { note: 81, dur: 1.0 }, // A5
  { note: 79, dur: 1.0 }, // G5
  { note: 77, dur: 1.0 }, // F5
  { note: 76, dur: 1.0 }, // E5

  // Bar 16 (G7): Eternal promise & smooth loop
  { note: 74, dur: 2.5 }, // D5
  { note: 79, dur: 0.5 }, // G5
  { note: 74, dur: 1.0 }, // D5
];

// Precompute melody notes map keyed by eighth-note step (0 to 127)
interface LeadNoteDef {
  note: number;
  durationBeats: number;
}
const MELODY_STEP_MAP = new Map<number, LeadNoteDef>();
let cumulativeBeats = 0;
CANON_MELODY.forEach((m) => {
  const step = Math.round(cumulativeBeats * 2);
  MELODY_STEP_MAP.set(step, { note: m.note, durationBeats: m.dur });
  cumulativeBeats += m.dur;
});

// Romantic Chords backing (Bass + Arpeggio notes for each of the 16 bars)
const CANON_HARMONY = [
  { bass: 48, arpeggio: [60, 64, 67, 72] }, // Bar 1: C (C3, C4-E4-G4-C5)
  { bass: 43, arpeggio: [59, 62, 67, 71] }, // Bar 2: G (G2, B3-D4-G4-B4)
  { bass: 45, arpeggio: [57, 60, 64, 69] }, // Bar 3: Am (A2, A3-C4-E4-A4)
  { bass: 40, arpeggio: [55, 59, 64, 67] }, // Bar 4: Em (E2, G3-B3-E4-G4)
  { bass: 41, arpeggio: [57, 60, 65, 69] }, // Bar 5: F (F2, A3-C4-F4-A4)
  { bass: 48, arpeggio: [55, 60, 64, 67] }, // Bar 6: C (C3, G3-C4-E4-G4)
  { bass: 41, arpeggio: [57, 60, 65, 69] }, // Bar 7: F (F2, A3-C4-F4-A4)
  { bass: 43, arpeggio: [55, 59, 62, 67] }, // Bar 8: G (G2, G3-B3-D4-G4)

  { bass: 48, arpeggio: [60, 64, 67, 72] }, // Bar 9: C
  { bass: 43, arpeggio: [59, 62, 67, 71] }, // Bar 10: G
  { bass: 45, arpeggio: [57, 60, 64, 69] }, // Bar 11: Am
  { bass: 40, arpeggio: [55, 59, 64, 67] }, // Bar 12: Em
  { bass: 41, arpeggio: [57, 60, 65, 69] }, // Bar 13: F
  { bass: 48, arpeggio: [60, 64, 67, 72] }, // Bar 14: C
  { bass: 41, arpeggio: [57, 62, 65, 69] }, // Bar 15: Dm
  { bass: 43, arpeggio: [55, 59, 62, 65] }, // Bar 16: G7
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private enabled: boolean = true; // Auto-on default
  private isPlaying: boolean = true; // Animation playing
  private tempoBpm: number = 74; // Romantic tempo (~0.81s per beat, 0.405s per eighth note)

  // Step-based scheduler: 16 bars * 8 eighth notes = 128 total steps
  private readonly totalSteps: number = 128;
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private scheduleTimer: number | null = null;
  private isLoopRunning: boolean = false;
  private lastFootstepTime: number = 0;

  constructor() {
    // Attempt lazy init when user interacts with screen
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        if (this.isPlaying && this.enabled) {
          this.startMelodyLoop();
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private exportGain: GainNode | null = null;

  // Safe context initialization: NEVER calls startMelodyLoop to prevent mutual recursion
  public initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          // Initialize with 48kHz and interactive latency for maximum audio fidelity
          try {
            this.ctx = new AudioCtx({ latencyHint: 'interactive', sampleRate: 48000 });
          } catch {
            this.ctx = new AudioCtx();
          }

          // Studio Mastering Limiter / Dynamics Compressor:
          // Keeps audio completely free of distortion/clipping, ensuring crystal-clear playback ("suara jernih")
          this.masterCompressor = this.ctx.createDynamicsCompressor();
          this.masterCompressor.threshold.setValueAtTime(-12, this.ctx.currentTime); // -12 dB threshold
          this.masterCompressor.knee.setValueAtTime(10, this.ctx.currentTime);       // soft musical knee
          this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);        // gentle transparent compression
          this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);   // rapid transient protection
          this.masterCompressor.release.setValueAtTime(0.12, this.ctx.currentTime);  // smooth musical release

          // Master Gain (controls speaker output)
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.enabled ? 0.40 : 0.0, this.ctx.currentTime);

          // Route: Master Compressor -> Master Gain -> Speakers
          this.masterCompressor.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);

          // Dedicated Export Gain Bus (guarantees crystal-clear, optimal reference level for video recording)
          this.exportGain = this.ctx.createGain();
          this.exportGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
          this.masterCompressor.connect(this.exportGain);

          // Music Gain (for the romantic background melody)
          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.setValueAtTime(0.38, this.ctx.currentTime);
          this.musicGain.connect(this.masterCompressor);

          // SFX Gain (for footsteps, sparkles, chimes, heartbeats)
          this.sfxGain = this.ctx.createGain();
          this.sfxGain.gain.setValueAtTime(0.48, this.ctx.currentTime);
          this.sfxGain.connect(this.masterCompressor);
        } catch {
          // AudioContext creation might fail in restricted environments
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // MediaStream for crystal-clear video recording with synchronized romantic audio
  public getAudioStream(): MediaStream | null {
    this.initContext();
    if (!this.ctx || !this.exportGain) return null;
    try {
      if (!this.mediaStreamDestination && typeof this.ctx.createMediaStreamDestination === 'function') {
        this.mediaStreamDestination = this.ctx.createMediaStreamDestination();
        this.exportGain.connect(this.mediaStreamDestination);
      }
      return this.mediaStreamDestination ? this.mediaStreamDestination.stream : null;
    } catch {
      return null;
    }
  }

  public setEnabled(enable: boolean) {
    this.enabled = enable;
    this.initContext();

    if (this.ctx && this.masterGain) {
      const targetGain = enable ? 0.35 : 0.0;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
    }

    if (enable && this.isPlaying) {
      this.startMelodyLoop();
    } else if (!enable) {
      this.stopMelodyLoop();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setPlaying(playing: boolean) {
    this.isPlaying = playing;
    if (playing && this.enabled) {
      this.startMelodyLoop();
    } else {
      this.stopMelodyLoop();
    }
  }

  public resetMelody() {
    this.currentStep = 0;
    if (this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }
  }

  // Lookahead audio scheduler for flawless, jitter-free and recursion-safe playback
  public startMelodyLoop() {
    if (this.isLoopRunning) return;
    if (!this.enabled || !this.isPlaying) return;

    this.initContext();
    if (!this.ctx) return;

    this.isLoopRunning = true;
    if (this.nextStepTime < this.ctx.currentTime) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }

    const schedule = () => {
      if (!this.isLoopRunning || !this.isPlaying || !this.enabled || !this.ctx) {
        this.isLoopRunning = false;
        this.scheduleTimer = null;
        return;
      }

      const secondsPerBeat = 60 / this.tempoBpm;
      const secondsPerStep = secondsPerBeat * 0.5; // Eighth note step
      const lookahead = 0.25; // 250ms lookahead window

      // Schedule up to lookahead window
      while (this.nextStepTime < this.ctx.currentTime + lookahead) {
        this.scheduleStep(this.nextStepTime, this.currentStep);
        this.nextStepTime += secondsPerStep;
        this.currentStep = (this.currentStep + 1) % this.totalSteps;
      }

      this.scheduleTimer = window.setTimeout(schedule, 50);
    };

    schedule();
  }

  public stopMelodyLoop() {
    this.isLoopRunning = false;
    if (this.scheduleTimer !== null) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
  }

  // Schedule one eighth-note step (half beat)
  private scheduleStep(time: number, step: number) {
    if (!this.ctx || !this.musicGain) return;

    // 8 steps per bar (4 beats * 2)
    const currentBar = Math.floor(step / 8) % 16;
    const stepInBar = step % 8;
    const harmony = CANON_HARMONY[currentBar];

    // 1. Bass Note on beat 0 of each bar (step 0)
    if (stepInBar === 0 && harmony) {
      this.playBassNote(harmony.bass, time, 3.2);
    }

    // 2. Music Box Arpeggio backing on every quarter beat (even steps: 0, 2, 4, 6)
    if (step % 2 === 0 && harmony) {
      const beatInBar = Math.floor(stepInBar / 2);
      const arpNote = harmony.arpeggio[beatInBar % harmony.arpeggio.length];
      this.playMusicBoxNote(arpNote, time, 0.85, 0.045);
    }

    // 3. Lead Romantic Melody Note
    const lead = MELODY_STEP_MAP.get(step);
    if (lead) {
      const noteDurationSeconds = (lead.durationBeats * 60) / this.tempoBpm;
      this.playLeadRomanticNote(lead.note, time, noteDurationSeconds);
    }
  }

  // Dreamy Music Box Lead Note with pure sine + bell harmonics
  private playLeadRomanticNote(midi: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    try {
      const freq = midiToFreq(midi);

      // Main bell tine
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, time);

      // Shimmer octave overtone
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, time);

      // Warm lowpass filter to produce music box acoustic chime
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, time);
      filter.frequency.exponentialRampToValueAtTime(1400, time + duration);

      // Envelope: gentle ping, romantic singing sustain, soft decay
      gain1.gain.setValueAtTime(0.001, time);
      gain1.gain.linearRampToValueAtTime(0.12, time + 0.025);
      gain1.gain.exponentialRampToValueAtTime(0.06, time + 0.3);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.35);

      gain2.gain.setValueAtTime(0.001, time);
      gain2.gain.linearRampToValueAtTime(0.035, time + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + Math.min(duration, 0.45));

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(this.musicGain);

      osc2.connect(gain2);
      gain2.connect(this.musicGain);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration + 0.4);
      osc2.stop(time + duration + 0.4);
    } catch {
      // Audio error safety
    }
  }

  // Arpeggio chime note
  private playMusicBoxNote(midi: number, time: number, duration: number, volume: number = 0.05) {
    if (!this.ctx || !this.musicGain) return;

    try {
      const freq = midiToFreq(midi);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    } catch {
      // Audio error safety
    }
  }

  // Warm Bass Pad Note
  private playBassNote(midi: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    try {
      const freq = midiToFreq(midi);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.02, time + duration * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + duration + 0.1);
    } catch {
      // Audio error safety
    }
  }

  // Subtle footstep in early walking scenes (delicate and unobtrusive)
  public playFootstep() {
    if (!this.enabled || !this.isPlaying) return;
    const now = performance.now();
    if (now - this.lastFootstepTime < 240) return;
    this.lastFootstepTime = now;

    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.setValueAtTime(2, this.ctx.currentTime);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch {
      // ignore
    }
  }

  // Gentle encounter chime (Scene 3)
  public playMeeting() {
    if (!this.enabled || !this.isPlaying) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [659.25, 783.99, 1046.5]; // E5, G5, C6 (harmonious with Canon in C)
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + i * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.35);
      } catch {
        // ignore
      }
    });
  }

  // Warm hug chord (Scene 4)
  public playHug() {
    if (!this.enabled || !this.isPlaying) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const chord = [349.23, 440.0, 523.25, 659.25]; // F4, A4, C5, E5 (Fmaj7)
    chord.forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.04, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.9);
      } catch {
        // ignore
      }
    });
  }

  // Sparkling stardust transformation arpeggio (Scene 6)
  public playSparkle() {
    if (!this.enabled || !this.isPlaying) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [1046.5, 1318.5, 1567.98, 2093.0, 2637.0];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.22);
      } catch {
        // ignore
      }
    });
  }

  // Heart emergence crystal sweep (Scene 7)
  public playHeartAppear() {
    if (!this.enabled || !this.isPlaying) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.3); // C6

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.45);
    } catch {
      // ignore
    }
  }

  // Gentle lub-dub heartbeat (Scenes 10-12)
  public playHeartbeat() {
    if (!this.enabled || !this.isPlaying) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, t);
      osc1.frequency.exponentialRampToValueAtTime(45, t + 0.1);
      gain1.gain.setValueAtTime(0.09, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(t);
      osc1.stop(t + 0.12);

      const t2 = t + 0.16;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(80, t2);
      osc2.frequency.exponentialRampToValueAtTime(50, t2 + 0.12);
      gain2.gain.setValueAtTime(0.1, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.14);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.14);
    } catch {
      // ignore
    }
  }

  // Romantic reveal fanfare (Scene 9)
  public playRevealFanfare() {
    if (!this.enabled || !this.isPlaying) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    // Romantic melodic flourish harmonizing in C major
    const melody = [
      { f: 523.25, d: 0.14 },
      { f: 659.25, d: 0.14 },
      { f: 783.99, d: 0.14 },
      { f: 1046.5, d: 0.32 },
      { f: 987.77, d: 0.2 },
      { f: 880.0, d: 0.25 },
      { f: 1046.5, d: 0.6 },
    ];

    let offset = 0;
    melody.forEach((note) => {
      if (!this.ctx || !this.sfxGain) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + offset;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + note.d);
      } catch {
        // ignore
      }

      offset += note.d * 0.95;
    });
  }
}

export const soundEngine = new SoundEngine();
