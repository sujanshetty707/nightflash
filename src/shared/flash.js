/**
 * NIGHTFLASH – Shared Flash Event System
 * All scenes subscribe to this. One renderer, one post-processing chain.
 * flash(intensity, color?, duration?)
 * strobe(count)
 * blackout(ms)
 */

class FlashSystem {
  constructor() {
    this.intensity = 0.0;
    this.afterimage = 0.0;
    this._listeners = [];
    this._lastFlashTime = 0;
    this.MIN_INTERVAL = 333; // never faster than 3/s
    this.reducedFlashing = false;
  }

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  flash(intensity = 1.0, color = null, duration = 0) {
    const now = performance.now();
    if (now - this._lastFlashTime < this.MIN_INTERVAL) return;
    this._lastFlashTime = now;

    if (this.reducedFlashing) {
      this.intensity = 0.15;
      this.afterimage = 0.0;
    } else {
      this.intensity = Math.min(1.0, intensity * 0.92);
      this.afterimage = 0.85;
      // Double-pulse at 120ms
      setTimeout(() => {
        if (!this.reducedFlashing) {
          this.intensity = Math.max(this.intensity, 0.45 * intensity);
        }
      }, 120);
    }

    this._listeners.forEach(fn => fn({ type: 'flash', intensity, color }));
  }

  strobe(count = 3, interval = 120) {
    if (this.reducedFlashing) return;
    let n = 0;
    const go = () => {
      if (n >= count) return;
      this.flash(0.7);
      n++;
      setTimeout(go, interval);
    };
    go();
  }

  blackout(ms = 1000, onDone = null) {
    this.intensity = -1.0; // Signal to shader to go fully black
    setTimeout(() => {
      this.intensity = 0.0;
      if (onDone) onDone();
    }, ms);
  }

  // Decay called every frame from the main render loop
  update(delta) {
    if (this.intensity > 0) {
      this.intensity = Math.max(0, this.intensity - delta * 2.8);
    }
    if (this.afterimage > 0) {
      this.afterimage = Math.max(0, this.afterimage - delta * 1.2);
    }
  }
}

export const flashSystem = new FlashSystem();
