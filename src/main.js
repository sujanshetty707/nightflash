import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SceneManager } from './scene/sceneManager.js';
import { CursorFlashlight } from './ui/cursorFlashlight.js';
import { TerminalGlitch } from './ui/terminalGlitch.js';
import { LogsController } from './ui/logsController.js';
import { soundManager } from './audio/soundManager.js';

gsap.registerPlugin(ScrollTrigger);

class NightflashApp {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.loaderScreen = document.getElementById('loader-screen');
    this.loaderStatus = document.getElementById('loader-status');
    this.loaderBarFill = document.getElementById('loader-bar-fill');
    this.blackCutOverlay = document.getElementById('hard-black-cut');

    this.sceneManager = null;
    this.cursor = null;
    this.terminal = null;
    this.logs = null;
    this.lenis = null;

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isFlashingReduced = this.prefersReducedMotion;

    this.init();
  }

  init() {
    // 1. Initialize 3D Scene
    this.sceneManager = new SceneManager(this.container, soundManager);
    if (this.prefersReducedMotion) {
      this.sceneManager.reducedMotion = true;
      this.sceneManager.reducedFlashing = true;
    }

    // 2. Initialize UI Controllers
    this.cursor = new CursorFlashlight();
    this.terminal = new TerminalGlitch(soundManager, (intensity) => {
      this.sceneManager.triggerFlash(intensity);
    });
    this.logs = new LogsController(soundManager, (intensity) => {
      this.sceneManager.triggerFlash(intensity);
    });

    // Robot click callback (glitch headline hard)
    this.sceneManager.onRobotClickCallback = () => {
      this.terminal.triggerHeadlineGlitch(true);
    };

    // 3. Setup Lenis Smooth Scroll
    this.initLenis();

    // 4. Setup ScrollTrigger & Scroll Choreography
    this.initScrollChoreography();

    // 5. Setup Action Buttons & Toggles
    this.initActionButtons();

    // 6. Loading Sequence
    this.runLoadingSequence();

    // 7. Render Loop
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  initLenis() {
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Mechanical exponential decay
      smoothWheel: true,
      wheelMultiplier: 0.9
    });

    // Sync Lenis with GSAP ScrollTrigger
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  initScrollChoreography() {
    // 1. Pin the Hero for 150vh while camera dollies in toward robot's head
    ScrollTrigger.create({
      trigger: '#hero-section',
      start: 'top top',
      end: '+=150%',
      pin: true,
      scrub: 0.8,
      onUpdate: (self) => {
        // Dolly camera in on robot's head, ending with eye filling 1/3 screen
        const p = self.progress * 0.45;
        this.sceneManager.setScrollProgress(p);
      }
    });

    // 2. Section 2 (LOG FILES) Entry Flash & Typewriter
    let section2Flashed = false;
    ScrollTrigger.create({
      trigger: '#logs-section',
      start: 'top 75%',
      onEnter: () => {
        if (!section2Flashed) {
          section2Flashed = true;
          this.sceneManager.triggerFlash(0.85);

          // Typewriter each card with stutter
          const cards = document.querySelectorAll('.log-card');
          cards.forEach((card, idx) => {
            const data = this.logs.logsData[idx];
            if (data) {
              setTimeout(() => {
                this.logs.typewriteCard(card, data.corrupted);
              }, idx * 280);
            }
          });
        }
      },
      onLeaveBack: () => {
        section2Flashed = false;
      }
    });

    // Section 2 to Section 3: Camera pushes in further toward extreme eye close-up
    ScrollTrigger.create({
      trigger: '#logs-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.0,
      onUpdate: (self) => {
        const p = 0.45 + self.progress * 0.35;
        this.sceneManager.setScrollProgress(p);
      }
    });

    // 3. Section 3 (THE LAST SIGNAL) - Extreme Eye Close-Up
    let section3Flashed = false;
    ScrollTrigger.create({
      trigger: '#signal-section',
      start: 'top 70%',
      end: 'bottom 60%',
      scrub: 0.6,
      onEnter: () => {
        if (!section3Flashed) {
          section3Flashed = true;
          this.sceneManager.triggerFlash(1.0, true);
        }
      },
      onLeaveBack: () => {
        section3Flashed = false;
      },
      onUpdate: (self) => {
        // Eye close-up from 0.8 to 1.0 (pupil / iris dilates)
        const p = 0.8 + self.progress * 0.2;
        this.sceneManager.setScrollProgress(Math.min(1.0, p));

        // Dilate iris geometry
        if (this.sceneManager.robot && this.sceneManager.robot.liveIrisRing) {
          const dilation = 1.0 + self.progress * 0.6;
          this.sceneManager.robot.liveIrisRing.scale.set(dilation, dilation, 1);
        }

        // As user reaches end of section 3:
        // "then everything cuts to black for 1 second (a hard cut, no fade) before the footer"
        if (self.progress > 0.88) {
          this.blackCutOverlay.classList.add('active');
        } else {
          this.blackCutOverlay.classList.remove('active');
        }
      }
    });

    // Footer Entry Flash
    let footerFlashed = false;
    ScrollTrigger.create({
      trigger: '#site-footer',
      start: 'top 95%',
      onEnter: () => {
        // Release black cut when entering footer
        this.blackCutOverlay.classList.remove('active');
        if (!footerFlashed) {
          footerFlashed = true;
          this.sceneManager.triggerFlash(0.65);
        }
      },
      onLeaveBack: () => {
        footerFlashed = false;
      }
    });
  }

  initActionButtons() {
    // 1. "WAKE IT UP" -> Scrolls to Log Files section
    const wakeBtn = document.getElementById('btn-wake');
    if (wakeBtn) {
      wakeBtn.addEventListener('click', () => {
        this.sceneManager.triggerFlash(0.9, true);
        this.lenis.scrollTo('#logs-section', { duration: 1.5 });
      });
      wakeBtn.addEventListener('mouseenter', () => this.cursor.setHoverState(true));
      wakeBtn.addEventListener('mouseleave', () => this.cursor.setHoverState(false));
    }

    // 2. "ENTER THE DARK" -> Full Camera Push-in
    const enterBtn = document.getElementById('btn-enter');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => {
        this.sceneManager.triggerFlash(1.0, true);
        this.lenis.scrollTo('#signal-section', { duration: 2.2 });
      });
      enterBtn.addEventListener('mouseenter', () => this.cursor.setHoverState(true));
      enterBtn.addEventListener('mouseleave', () => this.cursor.setHoverState(false));
    }

    // 3. SOUND: OFF / ON Toggle
    const soundToggle = document.getElementById('toggle-sound');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        const isSoundOn = soundManager.toggleSound();
        soundToggle.innerText = isSoundOn ? 'SOUND: ON' : 'SOUND: OFF';
        if (isSoundOn) {
          soundToggle.classList.add('active');
          soundManager.playFlash(0.4);
        } else {
          soundToggle.classList.remove('active');
        }
      });
    }

    // 4. FLASH: SAFE / FULL Toggle (Reduce Flashing for photosensitivity)
    const flashToggle = document.getElementById('toggle-flash');
    if (flashToggle) {
      flashToggle.addEventListener('click', () => {
        this.isFlashingReduced = !this.isFlashingReduced;
        this.sceneManager.reducedFlashing = this.isFlashingReduced;
        flashToggle.innerText = this.isFlashingReduced ? 'FLASH: SAFE' : 'FLASH: FULL';
        if (this.isFlashingReduced) {
          flashToggle.classList.add('active');
        } else {
          flashToggle.classList.remove('active');
        }
      });
    }

    // Track button hover across other links
    document.querySelectorAll('a, button, .log-card').forEach(el => {
      el.addEventListener('mouseenter', () => this.cursor.setHoverState(true));
      el.addEventListener('mouseleave', () => this.cursor.setHoverState(false));
    });
  }

  runLoadingSequence() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 18) + 8;
      if (progress > 100) progress = 100;

      if (this.loaderStatus) {
        this.loaderStatus.innerText = `CHECKING POWER… ${progress}%`;
      }
      if (this.loaderBarFill) {
        this.loaderBarFill.style.width = `${progress}%`;
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // Single flash on loading complete!
          this.sceneManager.triggerFlash(1.0, true);
          if (this.loaderScreen) {
            this.loaderScreen.classList.add('loaded');
          }
        }, 250);
      }
    }, 60);
  }

  tick(now) {
    const time = now * 0.001;
    const delta = Math.min((now - this.lastTime) * 0.001, 0.1);
    this.lastTime = now;

    // Update Cursor & Flashlight
    const cursorState = this.cursor.update();

    // Update Terminal Glitch text and timecode
    this.terminal.update(delta);

    // Update 3D Scene & Composer
    this.sceneManager.update(time, delta, cursorState);

    requestAnimationFrame(this.tick);
  }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new NightflashApp();
});
