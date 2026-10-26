export class LogsController {
  constructor(soundManager, onFlashTrigger) {
    this.soundManager = soundManager;
    this.onFlashTrigger = onFlashTrigger;

    this.logsData = [
      {
        id: 'LOG_0113',
        status: 'CORRUPTED // MEM_FAULT',
        resolved: "ERR_404: MEMORY NOT FOUND. Last known user: K. VANCE. Last known words: 'please don't turn me off.'",
        corrupted: "ERR_404: MEMORY NOT FOUND. Last known user: ██████. Last known words: 'please don't turn me off.'",
        tag: 'NODE_07 // SECTOR_C'
      },
      {
        id: 'LOG_0842',
        status: 'ANOMALOUS KINEMATICS',
        resolved: "POWER LEVEL 3%. Motor 4 offline. Motor 7 offline. Still moving anyway. Cause unknown.",
        corrupted: "POWER LEVEL 3%. Motor 4 offline. Motor 7 offline. Still moving anyway. Cause unknown.",
        tag: 'ACTUATOR_DIAGNOSTIC'
      },
      {
        id: 'LOG_1904',
        status: 'OPTICAL DETECTION ALERT',
        resolved: "VISUAL SENSOR REPORT: 1 PERSON DETECTED. No one else is in the building. It has been 4,381 days.",
        corrupted: "VISUAL SENSOR REPORT: 1 PERSON DETECTED. No one else is in the building. It has been 4,381 days.",
        tag: 'SENSOR_OPTIC_01'
      }
    ];

    this.initLogs();
  }

  initLogs() {
    const cards = document.querySelectorAll('.log-card');
    cards.forEach((card, idx) => {
      const data = this.logsData[idx];
      if (!data) return;

      const bodyEl = card.querySelector('.log-card-body');
      if (!bodyEl) return;

      // On hover: corruption briefly resolves into readable text, then re-corrupts.
      // Small flash fires on enter.
      card.addEventListener('mouseenter', () => {
        if (this.onFlashTrigger) {
          this.onFlashTrigger(0.4);
        }
        if (this.soundManager) {
          this.soundManager.playFlash(0.3);
        }

        // Briefly unmask / resolve text
        bodyEl.innerHTML = `<span class="unmasked-text">${data.resolved}</span>`;

        setTimeout(() => {
          bodyEl.innerHTML = this.formatCorruptedText(data.corrupted);
        }, 1200);
      });

      card.addEventListener('mouseleave', () => {
        bodyEl.innerHTML = this.formatCorruptedText(data.corrupted);
      });
    });
  }

  formatCorruptedText(text) {
    // Wrap █ blocks and provide terminal strike styling
    return text.replace(/██████/g, '<span class="redact-block">██████</span>');
  }

  // Typewriter effect with stutter when scrolling into view
  typewriteCard(card, text, onComplete) {
    const bodyEl = card.querySelector('.log-card-body');
    if (!bodyEl) return;

    let index = 0;
    bodyEl.innerHTML = '';

    const typeStep = () => {
      if (index <= text.length) {
        const currentSub = text.substring(0, index);
        bodyEl.innerHTML = this.formatCorruptedText(currentSub) + '<span class="term-cursor">█</span>';
        index++;

        // Random stutter in typing cadence
        let delay = 18 + Math.random() * 28;
        if (Math.random() < 0.08) {
          delay += 120; // Stutter hesitation
          if (this.soundManager) {
            this.soundManager.playEyeStutter();
          }
        }
        setTimeout(typeStep, delay);
      } else {
        bodyEl.innerHTML = this.formatCorruptedText(text);
        if (onComplete) onComplete();
      }
    };

    typeStep();
  }
}
