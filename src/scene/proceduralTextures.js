import * as THREE from 'three';

// Generates procedural PBR textures directly via HTML5 2D canvas
export function createScratchedMetalRoughnessMap() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base roughness ~0.42 (semi-reflective industrial cast iron/steel)
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(0, 0, size, size);

  // 1. Brushed horizontal tool marks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * size;
    const h = 1 + Math.random() * 2;
    ctx.fillRect(0, y, size, h);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * size;
    const h = 1 + Math.random() * 2;
    ctx.fillRect(0, y, size, h);
  }

  // 2. Deep sharp scratch gouges (white in roughness = rough/matte scratched metal)
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x1 = Math.random() * size;
    const y1 = Math.random() * size;
    const len = 30 + Math.random() * 120;
    const angle = (Math.random() - 0.5) * 1.5;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;

    // Dark gouge edge + bright scratch center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(20, 20, 20, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x1 + 1, y1 + 1);
    ctx.lineTo(x2 + 1, y2 + 1);
    ctx.stroke();
  }

  // 3. Grime and rust patches (darker/rougher spots)
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const rad = 15 + Math.random() * 45;
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
    grad.addColorStop(0, 'rgba(220, 220, 220, 0.4)');
    grad.addColorStop(1, 'rgba(107, 107, 107, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createArmorNormalMap() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Flat normal color in RGB: #8080ff (128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  // Panel seam grooves (recessed lines)
  function drawSeam(x1, y1, x2, y2) {
    ctx.strokeStyle = 'rgb(90, 90, 220)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgb(160, 160, 255)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1 + 2, y1 + 2);
    ctx.lineTo(x2 + 2, y2 + 2);
    ctx.stroke();
  }

  // Rectangular modular panel divisions
  drawSeam(60, 60, size - 60, 60);
  drawSeam(size - 60, 60, size - 60, size - 60);
  drawSeam(size - 60, size - 60, 60, size - 60);
  drawSeam(60, size - 60, 60, 60);
  drawSeam(size * 0.5, 60, size * 0.5, size - 60);
  drawSeam(60, size * 0.45, size - 60, size * 0.45);

  // Bolts / Rivets around perimeter and seams
  function drawRivet(cx, cy) {
    // Outer shadow ring
    ctx.fillStyle = 'rgb(90, 90, 220)';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();

    // Raised center cap
    ctx.fillStyle = 'rgb(165, 165, 255)';
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 1, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hex socket center indentation
    ctx.fillStyle = 'rgb(70, 70, 190)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Place perimeter rivets
  for (let x = 100; x < size - 60; x += 110) {
    drawRivet(x, 80);
    drawRivet(x, size * 0.45 - 20);
    drawRivet(x, size * 0.45 + 20);
    drawRivet(x, size - 80);
  }
  for (let y = 140; y < size - 100; y += 120) {
    drawRivet(80, y);
    drawRivet(size * 0.5 - 20, y);
    drawRivet(size * 0.5 + 20, y);
    drawRivet(size - 80, y);
  }

  // Random bullet/impact dents
  for (let i = 0; i < 12; i++) {
    const dx = 120 + Math.random() * (size - 240);
    const dy = 120 + Math.random() * (size - 240);
    const rad = 14 + Math.random() * 20;

    ctx.fillStyle = 'rgb(80, 80, 200)';
    ctx.beginPath();
    ctx.arc(dx, dy, rad, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgb(180, 180, 255)';
    ctx.beginPath();
    ctx.arc(dx - rad * 0.4, dy - rad * 0.4, rad * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Weathered serial stencil plate: "UNIT 07 // CARE SERIES" with half missing
export function createSerialDecalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Dark matte armor plate base
  ctx.fillStyle = '#121315';
  ctx.fillRect(0, 0, 1024, 256);

  // Border hairline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 1004, 236);

  // Corner notches
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 20, 20);
  ctx.fillRect(1004, 0, 20, 20);
  ctx.fillRect(0, 236, 20, 20);
  ctx.fillRect(1004, 236, 20, 20);

  // Faded Stencil Typography
  ctx.font = 'bold 84px "JetBrains Mono", "Courier New", monospace';
  ctx.fillStyle = '#d4dadf';
  ctx.textBaseline = 'middle';

  // "UNIT 07 // CARE SERIES"
  ctx.fillText('UNIT 07 // C', 40, 110);
  // Half weathered / missing "ARE SERIES"
  ctx.fillStyle = 'rgba(212, 218, 223, 0.35)';
  ctx.fillText('A', 560, 110);
  ctx.fillStyle = 'rgba(212, 218, 223, 0.12)';
  ctx.fillText('R', 615, 110);
  ctx.fillStyle = 'rgba(212, 218, 223, 0.05)';
  ctx.fillText('E SER', 670, 110);

  // Micro warning subtext
  ctx.font = '24px "JetBrains Mono", monospace';
  ctx.fillStyle = '#7df9ff';
  ctx.fillText('CHASSIS NO: AS-9941-K // AUTONOMOUS LIFE-SUPPORT', 40, 190);

  // Scratch gouges across the plate
  ctx.strokeStyle = '#121315';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(300, 40);
  ctx.lineTo(750, 210);
  ctx.stroke();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(600, 20);
  ctx.lineTo(950, 230);
  ctx.stroke();

  // Scorch marks (charred soot from explosion)
  const sootGrad = ctx.createRadialGradient(720, 130, 20, 720, 130, 180);
  sootGrad.addColorStop(0, 'rgba(5, 5, 5, 0.95)');
  sootGrad.addColorStop(0.5, 'rgba(15, 15, 15, 0.6)');
  sootGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sootGrad;
  ctx.fillRect(0, 0, 1024, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Exposed circuit board for damaged skull & chest
export function createCircuitBoardTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark industrial FR4 substrate
  ctx.fillStyle = '#0c1610';
  ctx.fillRect(0, 0, size, size);

  // Copper tracks
  ctx.strokeStyle = '#38a374';
  ctx.lineWidth = 2;
  for (let i = 0; i < 35; i++) {
    const y = 20 + i * 14;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(120 + Math.random() * 80, y);
    ctx.lineTo(240 + Math.random() * 80, y + (Math.random() > 0.5 ? 20 : -20));
    ctx.lineTo(size - 10, y);
    ctx.stroke();
  }

  // Solder pads and golden contact pins
  ctx.fillStyle = '#bfa143';
  for (let x = 30; x < size; x += 35) {
    for (let y = 30; y < size; y += 35) {
      if (Math.random() > 0.4) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Surface Mount IC chips (black epoxy rectangles with silver pins)
  function drawIC(x, y, w, h) {
    ctx.fillStyle = '#111215';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#c5c8cb';
    ctx.lineWidth = 1;
    // Left/right pins
    for (let p = 6; p < h - 4; p += 6) {
      ctx.beginPath();
      ctx.moveTo(x - 4, y + p);
      ctx.lineTo(x, y + p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w, y + p);
      ctx.lineTo(x + w + 4, y + p);
      ctx.stroke();
    }
  }

  drawIC(80, 80, 60, 90);
  drawIC(220, 140, 90, 60);
  drawIC(340, 240, 70, 70);
  drawIC(120, 320, 80, 50);

  // Heavy burn/scorch mark where circuit exploded
  const burn = ctx.createRadialGradient(280, 260, 10, 280, 260, 150);
  burn.addColorStop(0, 'rgba(5, 5, 5, 0.98)');
  burn.addColorStop(0.4, 'rgba(30, 20, 15, 0.8)');
  burn.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = burn;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Cracked glass texture for dead lens
export function createCrackedGlassTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark reflective glass base
  ctx.fillStyle = '#08090a';
  ctx.fillRect(0, 0, size, size);

  // Radial crack impact center at (200, 220)
  const cx = 200;
  const cy = 220;

  ctx.strokeStyle = 'rgba(230, 245, 255, 0.75)';
  ctx.lineWidth = 1.5;

  // 16 radiating splinter lines
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const len = 70 + Math.random() * 160;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    let px = cx;
    let py = cy;
    const steps = 6;
    for (let s = 1; s <= steps; s++) {
      const stepLen = (len / steps) * s;
      const jx = (Math.random() - 0.5) * 8;
      const jy = (Math.random() - 0.5) * 8;
      const nx = cx + Math.cos(angle) * stepLen + jx;
      const ny = cy + Math.sin(angle) * stepLen + jy;
      ctx.lineTo(nx, ny);
      px = nx;
      py = ny;
    }
    ctx.stroke();
  }

  // Concentric fracture webs
  for (let r = 25; r < 180; r += 28) {
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.2; a += 0.3) {
      const jitter = (Math.random() - 0.5) * 10;
      const x = cx + Math.cos(a) * (r + jitter);
      const y = cy + Math.sin(a) * (r + jitter);
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
