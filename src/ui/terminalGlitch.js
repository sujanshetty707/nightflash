export class TerminalGlitch {
  constructor(soundManager, onFlashTrigger) {
    this.soundManager = soundManager;
    this.onFlashTrigger = onFlashTrigger;

    this.rebootPercent = 37;
    this.rebootTimer = 0;
    this.timecodeFrame = 12;
    this.timecodeSec = 37;
    this.timecodeMin = 0;
    this.timecodeHour = 0;

    this.headlineEl = document.getElementById('glitch-headline');
    this.statusEl = document.getElementById('reboot-status');
    this.timecodeEl = document.getElementById('timecode-readout');

    this.initGlitchHeadline();
    this.initButtons();
  }

  initGlitchHeadline() {
    if (!this.headlineEl) return;
    // Set up structured HTML for slice displacement & RGB split
    this.headlineEl.innerHTML = `
      <span class="glitch-word word-system" data-text="SYSTEM">SYSTEM</span>
      <span class="glitch-word word-failure" data-text="FAILURE">FAILURE</span>
    `;

    // Intermittent signal dropouts (letters missing, slice offsets)
    this.glitchInterval = setInterval(() => {
      if (Math.random() < 0.28) {
        this.triggerHeadlineGlitch(false);
      }
    }, 180);
  }

  triggerHeadlineGlitch(isHard = false) {
    if (!this.headlineEl) return;
    const words = this.headlineEl.querySelectorAll('.glitch-word');

    words.forEach(w => {
      const originalText = w.getAttribute('data-text');
      // Random missing letter or bad character
      if (Math.random() < (isHard ? 0.7 : 0.4)) {
        const charIdx = Math.floor(Math.random() * originalText.length);
        const chars = originalText.split('');
        const glitchChars = ['█', '░', '▒', '_', ' '];
        chars[charIdx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        w.innerText = chars.join('');

        // Slice displacement & horizontal glitch
        const sliceY1 = Math.floor(Math.random() * 80);
        const sliceY2 = sliceY1 + Math.floor(Math.random() * 25);
        const shiftX = (Math.random() - 0.5) * (isHard ? 18 : 8);
        w.style.setProperty('--slice-y1', `${sliceY1}%`);
        w.style.setProperty('--slice-y2', `${sliceY2}%`);
        w.style.setProperty('--shift-x', `${shiftX}px`);
        w.classList.add('is-glitching');

        setTimeout(() => {
          w.innerText = originalText;
          w.classList.remove('is-glitching');
        }, isHard ? 180 : 70);
      }
    });

    if (isHard && this.soundManager) {
      this.soundManager.playEyeStutter();
    }
  }

  initButtons() {
    const buttons = document.querySelectorAll('.terminal-btn');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=~█';

    buttons.forEach(btn => {
      const originalText = btn.getAttribute('data-text') || btn.innerText.trim();
      btn.setAttribute('data-text', originalText);

      let scrambleInterval = null;

      btn.addEventListener('mouseenter', () => {
        // Trigger small flash on button hover
        if (this.onFlashTrigger) {
          this.onFlashTrigger(0.45);
        }
        if (this.soundManager) {
          this.soundManager.playFlash(0.35);
        }

        btn.classList.add('btn-flicker');

        // Text scramble effect
        let iteration = 0;
        clearInterval(scrambleInterval);
        scrambleInterval = setInterval(() => {
          btn.innerText = originalText
            .split('')
            .map((letter, index) => {
              if (index < iteration) {
                return originalText[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('');

          if (iteration >= originalText.length) {
            clearInterval(scrambleInterval);
          }
          iteration += 1 / 2;
        }, 30);
      });

      btn.addEventListener('mouseleave', () => {
        clearInterval(scrambleInterval);
        btn.innerText = originalText;
        btn.classList.remove('btn-flicker');
      });
    });
  }

  update(delta) {
    // 1. Timecode incrementing: "00:00:37:12"
    this.timecodeFrame += 1;
    if (this.timecodeFrame >= 24) {
      this.timecodeFrame = 0;
      this.timecodeSec += 1;
      if (this.timecodeSec >= 60) {
        this.timecodeSec = 0;
        this.timecodeMin += 1;
      }
    }

    if (this.timecodeEl) {
      const hh = String(this.timecodeHour).padStart(2, '0');
      const mm = String(this.timecodeMin).padStart(2, '0');
      const ss = String(this.timecodeSec).padStart(2, '0');
      const ff = String(this.timecodeFrame).padStart(2, '0');
      this.timecodeEl.innerText = `${hh}:${mm}:${ss}:${ff}`;
    }

    // 2. Status line "REBOOTING… 37%" counts up and drops back down randomly, never reaching 100
    this.rebootTimer += delta;
    if (this.rebootTimer > 0.45) {
      this.rebootTimer = 0;
      if (Math.random() < 0.6) {
        // Count up slightly
        this.rebootPercent += Math.floor(Math.random() * 5) + 1;
        if (this.rebootPercent > 89) {
          // Drops back down suddenly!
          this.rebootPercent = 14 + Math.floor(Math.random() * 26);
        }
      } else {
        // Drops slightly
        this.rebootPercent -= Math.floor(Math.random() * 4) + 1;
        if (this.rebootPercent < 8) this.rebootPercent = 23;
      }

      if (this.statusEl) {
        this.statusEl.innerText = `REBOOTING… ${this.rebootPercent}%`;
      }
    }
  }
}
