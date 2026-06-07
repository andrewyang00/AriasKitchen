// ===========================================================================
// audio.js — All sound effects are synthesized with the Web Audio API.
// No audio files are loaded, so there is nothing to license or download.
//
// iOS Safari (and most mobile browsers) refuse to start audio until a
// real user gesture happens. GameAudio.unlock() must be called from inside
// a click/touch/pointer handler — app.js does this on the very first tap
// of the Start screen, then every later sound "just works".
// ===========================================================================

class GameAudio {
  constructor() {
    this.ctx = null;
    this._noiseBuffer = null;
  }

  /** Call this from within a user-gesture handler (tap/click/touch). */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  _now() {
    return this.ctx.currentTime;
  }

  /** Lazily build (and cache) a 1-second white-noise buffer for whoosh/pour/sizzle sounds. */
  _noise() {
    if (this._noiseBuffer) return this._noiseBuffer;
    const ctx = this.ctx;
    const length = ctx.sampleRate * 1;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this._noiseBuffer = buffer;
    return buffer;
  }

  /** Simple envelope helper: ramps a gain node up then down over `duration`. */
  _envelope(gainNode, peak, attack, release, startAt) {
    const g = gainNode.gain;
    g.cancelScheduledValues(startAt);
    g.setValueAtTime(0.0001, startAt);
    g.exponentialRampToValueAtTime(peak, startAt + attack);
    g.exponentialRampToValueAtTime(0.0001, startAt + attack + release);
  }

  /** A single short tone — building block for chimes / pops / blips. */
  _tone({ freq = 440, type = 'sine', duration = 0.18, gain = 0.18, glideTo = null, when = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const start = this._now() + when;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
    }
    this._envelope(gainNode, gain, Math.min(0.02, duration / 4), duration, start);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** Tap / "boop" — gentle nudge sound for off-target taps. Friendly, never harsh. */
  playBoop() {
    if (!this.ctx) return;
    this._tone({ freq: 320, type: 'sine', duration: 0.12, gain: 0.12, glideTo: 260 });
  }

  /** Egg crack — a short percussive click + low knock. */
  playCrack() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const start = this._now();

    // Percussive "knock"
    const knock = ctx.createOscillator();
    const knockGain = ctx.createGain();
    knock.type = 'triangle';
    knock.frequency.setValueAtTime(180, start);
    knock.frequency.exponentialRampToValueAtTime(70, start + 0.09);
    this._envelope(knockGain, 0.3, 0.005, 0.1, start);
    knock.connect(knockGain).connect(ctx.destination);
    knock.start(start);
    knock.stop(start + 0.16);

    // Bright "crack" using filtered noise burst
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this._noise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const noiseGain = ctx.createGain();
    this._envelope(noiseGain, 0.18, 0.002, 0.06, start);
    noiseSrc.connect(filter).connect(noiseGain).connect(ctx.destination);
    noiseSrc.start(start);
    noiseSrc.stop(start + 0.1);
  }

  /** Yolk plop — quick pitch-drop "blip" when the egg empties into the bowl. */
  playPlop() {
    if (!this.ctx) return;
    this._tone({ freq: 520, type: 'sine', duration: 0.22, gain: 0.22, glideTo: 160 });
  }

  /**
   * Pouring loop (milk or batter). Returns a stop() function.
   * Filtered noise with a slow gain swell makes a soft "glug/pour" texture
   * that is calm rather than alarming for a toddler.
   */
  playPourLoop() {
    if (!this.ctx) return () => {};
    const ctx = this.ctx;
    const start = this._now();

    const src = ctx.createBufferSource();
    src.buffer = this._noise();
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.25);

    // gentle warble so it doesn't sound like static
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 4.5;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start(start);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);

    let stopped = false;
    return () => {
      if (stopped || !this.ctx) return;
      stopped = true;
      const t = this._now();
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      src.stop(t + 0.2);
      lfo.stop(t + 0.2);
    };
  }

  /** Soft swirl "whoosh" played each time a stir revolution completes. */
  playSwirl() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const start = this._now();
    const src = ctx.createBufferSource();
    src.buffer = this._noise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, start);
    filter.frequency.exponentialRampToValueAtTime(1400, start + 0.35);
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    this._envelope(gain, 0.2, 0.03, 0.32, start);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);
    src.stop(start + 0.45);
  }

  /** Sizzling pan loop while batter is poured / pancake cooks. Returns stop(). */
  playSizzleLoop() {
    if (!this.ctx) return () => {};
    const ctx = this.ctx;
    const start = this._now();

    const src = ctx.createBufferSource();
    src.buffer = this._noise();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.2);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);

    let stopped = false;
    return () => {
      if (stopped || !this.ctx) return;
      stopped = true;
      const t = this._now();
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      src.stop(t + 0.2);
    };
  }

  /** Big upward "whoosh" for the flip gesture. */
  playFlipWhoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const start = this._now();
    const src = ctx.createBufferSource();
    src.buffer = this._noise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, start);
    filter.frequency.exponentialRampToValueAtTime(2600, start + 0.3);
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    this._envelope(gain, 0.28, 0.02, 0.34, start);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);
    src.stop(start + 0.45);

    // little upward chirp layered on top
    this._tone({ freq: 380, type: 'triangle', duration: 0.3, gain: 0.12, glideTo: 760, when: 0.02 });
  }

  /** Friendly two-note "ding-dong" used for completing a step. */
  playStepComplete() {
    if (!this.ctx) return;
    this._tone({ freq: 660, type: 'sine', duration: 0.16, gain: 0.18 });
    this._tone({ freq: 880, type: 'sine', duration: 0.22, gain: 0.18, when: 0.12 });
  }

  /** Bright ascending arpeggio chime — recipe selected / big success. */
  playChime() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      this._tone({ freq, type: 'sine', duration: 0.28, gain: 0.16, when: i * 0.1 });
    });
  }

  /** Big celebratory fanfare for the finished pancake. */
  playFanfare() {
    if (!this.ctx) return;
    const melody = [523.25, 523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    melody.forEach((freq, i) => {
      this._tone({ freq, type: 'triangle', duration: 0.32, gain: 0.18, when: i * 0.16 });
    });
    // warm low pad underneath
    this._tone({ freq: 261.63, type: 'sine', duration: 1.4, gain: 0.08 });
  }
}

const gameAudio = new GameAudio();
