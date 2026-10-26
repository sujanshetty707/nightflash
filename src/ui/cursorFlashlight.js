export class CursorFlashlight {
  constructor() {
    this.mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    this.lerped = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    this.normalized = { x: 0.5, y: 0.5 };
    this.targetRadius = 180;
    this.currentRadius = 180;
    this.isHoveringButton = false;

    this.createDomElements();
    this.bindEvents();
  }

  createDomElements() {
    // Custom Crosshair Cursor Element (thin plus sign with 1px gap in center)
    this.crosshair = document.createElement('div');
    this.crosshair.id = 'hud-crosshair';
    this.crosshair.innerHTML = `
      <div class="ch-line ch-top"></div>
      <div class="ch-line ch-bottom"></div>
      <div class="ch-line ch-left"></div>
      <div class="ch-line ch-right"></div>
      <div class="ch-dot"></div>
    `;
    document.body.appendChild(this.crosshair);

    // CSS flashlight background overlay mask for DOM elements (reveals text/scratch underneath)
    this.flashlightDiv = document.createElement('div');
    this.flashlightDiv.id = 'cursor-flashlight-glow';
    document.body.appendChild(this.flashlightDiv);
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }
    }, { passive: true });
  }

  setHoverState(isHovering) {
    this.isHoveringButton = isHovering;
    this.targetRadius = isHovering ? 250 : 180;
    if (this.crosshair) {
      if (isHovering) {
        this.crosshair.classList.add('crosshair-hover');
      } else {
        this.crosshair.classList.remove('crosshair-hover');
      }
    }
  }

  update() {
    // Lerp 0.08 lag as specified in requirements
    const lerpFactor = 0.08;
    this.lerped.x += (this.mouse.x - this.lerped.x) * lerpFactor;
    this.lerped.y += (this.mouse.y - this.lerped.y) * lerpFactor;

    this.currentRadius += (this.targetRadius - this.currentRadius) * 0.1;

    // Crosshair follows direct mouse
    this.crosshair.style.transform = `translate3d(${this.mouse.x}px, ${this.mouse.y}px, 0)`;

    // DOM Flashlight radial mask follows lerped position
    const radiusPx = this.currentRadius;
    const radialBg = `radial-gradient(circle ${radiusPx}px at ${this.lerped.x}px ${this.lerped.y}px, rgba(125, 249, 255, 0.07) 0%, rgba(5, 5, 5, 0) 75%)`;
    this.flashlightDiv.style.background = radialBg;

    // Normalized screen coordinates (0 to 1, UV coordinates: y inverted for WebGL)
    this.normalized.x = this.lerped.x / window.innerWidth;
    this.normalized.y = 1.0 - (this.lerped.y / window.innerHeight);

    return {
      screenX: this.lerped.x,
      screenY: this.lerped.y,
      normX: this.normalized.x,
      normY: this.normalized.y,
      radiusNorm: this.currentRadius / window.innerHeight
    };
  }
}
