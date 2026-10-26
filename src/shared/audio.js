/**
 * NIGHTFLASH – Shared Audio Module
 * Extends soundManager with per-scene sounds.
 * All sounds are optional (off by default), synthesized via Web Audio API.
 */

export class SceneAudio {
  constructor(soundManager) {
    this.sm = soundManager;
    this._drones = new Map(); // sceneId -> oscillator + gain
  }

  get ctx() { return this.sm?.ctx; }
  get muted() { return this.sm?.isMuted; }

  // Cross-fade to a new scene's ambient drone
  setSceneDrone(sceneId, freq = 40, filterFreq = 120, gain = 0.025) {
    if (this.muted || !this.ctx) return;

    // Fade out old drones
    this._drones.forEach((drone, id) => {
      if (id !== sceneId) {
        drone.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        setTimeout(() => { try { drone.osc.stop(); } catch (_) {} this._drones.delete(id); }, 1500);
      }
    });

    if (this._drones.has(sceneId)) return;

    const osc = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.8);
    osc.connect(filt); filt.connect(g); g.connect(this.ctx.destination);
    osc.start();
    this._drones.set(sceneId, { osc, gain: g });
  }

  // Footstep for corridor
  playFootstep() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.06, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(filt); filt.connect(g); g.connect(this.ctx.destination);
    src.start(t);
  }

  // Servo whine for anatomy
  playServoWhine(pitch = 800) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.6, t + 0.3);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.45);
  }

  // Radio static for signal tower
  playStaticBurst() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 1800; f1.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(f1); f1.connect(g); g.connect(this.ctx.destination);
    src.start(t);
  }

  // Morse beep for signal tower
  playMorseBeep(duration = 0.08) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 680;
    g.gain.setValueAtTime(0.06, t);
    g.gain.setValueAtTime(0.06, t + duration);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration + 0.02);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + duration + 0.05);
  }

  // Tick/clock for timeline
  playTick() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square'; osc.frequency.value = 1200;
    g.gain.setValueAtTime(0.025, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.03);
  }

  // CRT power-up whine for transmit
  playCRTWhine() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(15700, t + 0.8);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 1.0);
  }

  stopAll() {
    this._drones.forEach((drone) => {
      try { drone.gain.gain.setTargetAtTime(0, this.ctx?.currentTime || 0, 0.3); } catch (_) {}
    });
  }
}
