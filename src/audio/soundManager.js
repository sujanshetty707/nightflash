// Audio Manager using Web Audio API synthesis (zero external asset dependencies)
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.humGain = null;
    this.humOsc = null;
    this.humFilter = null;
    this.subOsc = null;
    this.subGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    // Constant electrical 60Hz hum + harmonics (very quiet, muted by default)
    this.humGain = this.ctx.createGain();
    this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // 60Hz hum
    this.humOsc = this.ctx.createOscillator();
    this.humOsc.type = 'sawtooth';
    this.humOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

    // Filter to give that warm transformer hum
    this.humFilter = this.ctx.createBiquadFilter();
    this.humFilter.type = 'lowpass';
    this.humFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.humOsc.connect(this.humFilter);
    this.humFilter.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);
    this.humOsc.start();
  }

  toggleSound() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (this.humGain) {
      const targetGain = this.isMuted ? 0 : 0.04;
      this.humGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
    return !this.isMuted;
  }

  // Camera flash "thunk" / capacitor discharge and recharge
  playFlash(intensity = 1.0) {
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;

    // 1. Heavy sub-bass thud (sine 48Hz drop to 18Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, t);
    subOsc.frequency.exponentialRampToValueAtTime(18, t + 0.35);

    subGain.gain.setValueAtTime(0.35 * intensity, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.4);

    // 2. White noise burst pop (transient snap)
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2800, t);
    noiseFilter.Q.setValueAtTime(1.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2 * intensity, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(t);

    // 3. High-frequency capacitor recharge whine (rising pitch 800Hz to 3200Hz)
    const whineOsc = this.ctx.createOscillator();
    const whineGain = this.ctx.createGain();
    whineOsc.type = 'sine';
    whineOsc.frequency.setValueAtTime(800, t + 0.08);
    whineOsc.frequency.exponentialRampToValueAtTime(3200, t + 0.65);

    whineGain.gain.setValueAtTime(0.0001, t);
    whineGain.gain.setValueAtTime(0.05 * intensity, t + 0.1);
    whineGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

    whineOsc.connect(whineGain);
    whineGain.connect(this.ctx.destination);
    whineOsc.start(t + 0.08);
    whineOsc.stop(t + 0.75);
  }

  // Spark burst crackle
  playSpark() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600 + Math.random() * 800, t);
    osc.frequency.setValueAtTime(200, t + 0.04);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Glitch / eye stutter click
  playEyeStutter() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const soundManager = new SoundManager();
