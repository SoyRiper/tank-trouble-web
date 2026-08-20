// Web Audio API Procedural Sound Engine for Tank Trouble Web

class WebAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
    this._playNoise(0.05, 0.4, 1200);
  }

  playGatling() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playRicochet() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 1800 + Math.random() * 600;
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.18);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 1.58, t);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.18);
    osc2.stop(t + 0.18);
  }

  playMissile() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.4);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playExplosion(heavy = false) {
    if (!this.enabled) return;
    this.init();
    const dur = heavy ? 0.75 : 0.5;
    this._playNoise(dur, heavy ? 1.2 : 0.9, 280);

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + dur);
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  playLaser() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.32);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  playCrate() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [659.25, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.4, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.24);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.24);
    });
  }

  playPowerup() {
    this.playCrate();
  }

  playShotgun() {
    if (!this.enabled) return;
    this.init();
    this._playNoise(0.35, 1.3, 500);
    this.playShoot();
  }

  playPlasma() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playShield() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.25);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playSiren() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.4);
    osc.frequency.linearRampToValueAtTime(440, t + 0.8);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.85);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.85);
  }

  playLava() {
    if (!this.enabled) return;
    this.init();
    this._playNoise(0.2, 0.5, 450);
  }

  playMeteor() {
    if (!this.enabled) return;
    this.init();
    this.playExplosion(true);
  }

  playEMP() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.5);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  playVictory() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0.6, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.4);
    });
  }

  _playNoise(duration, volume, filterFreq) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(t);
    whiteNoise.stop(t + duration);
  }
}

export const Sound = new WebAudioEngine();
