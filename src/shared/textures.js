/**
 * NIGHTFLASH – Shared Procedural Texture Helpers
 * All canvas-based, no external images.
 */
import * as THREE from 'three';

// Reusable scratch + grime roughness map (tiled)
export function makeRoughnessMap(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#707070';
  ctx.fillRect(0, 0, size, size);
  // brushed lines
  for (let i = 0; i < 300; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  // scratches
  for (let i = 0; i < 60; i++) {
    const x1 = Math.random() * size, y1 = Math.random() * size;
    const len = 20 + Math.random() * 80;
    const a = (Math.random() - 0.5) * 1.2;
    ctx.strokeStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(a) * len, y1 + Math.sin(a) * len);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Water stain / rust blotch overlay
export function makeStainMap(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a2218';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 30 + Math.random() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(90,60,30,0.5)');
    g.addColorStop(0.5, 'rgba(60,40,20,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // drip streaks downward
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * size;
    const len = 60 + Math.random() * 120;
    const g = ctx.createLinearGradient(x, 0, x, len);
    g.addColorStop(0, 'rgba(40,25,10,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(x, Math.random() * size * 0.5);
    ctx.lineTo(x + (Math.random() - 0.5) * 10, Math.random() * size * 0.5 + len);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Film-grain photograph texture (grainy BW canvas)
export function makePhotoTexture(scene = 'chair', caption = '', size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // White border
  ctx.fillStyle = '#e8e4de';
  ctx.fillRect(0, 0, size, size);
  // Photo area (slightly inset on top and sides, large border at bottom for caption)
  const pw = size - 32;
  const ph = size - 90;
  ctx.fillStyle = '#080808';
  ctx.fillRect(16, 16, pw, ph);

  // Scene drawing per type
  drawScene(ctx, scene, 16, 16, pw, ph);

  // Heavy grain overlay
  const imgData = ctx.getImageData(16, 16, pw, ph);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 80;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(imgData, 16, 16);

  // Vignette
  const vg = ctx.createRadialGradient(16 + pw / 2, 16 + ph / 2, 0, 16 + pw / 2, 16 + ph / 2, pw * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = vg;
  ctx.fillRect(16, 16, pw, ph);

  // Caption in handwritten-style (use Rock Salt if loaded, else serif)
  ctx.fillStyle = '#1a1510';
  ctx.font = `italic ${size < 256 ? 12 : 14}px Georgia, serif`;
  ctx.fillText(caption, 20, size - 22);

  // Date stamp bottom right
  ctx.font = `${size < 256 ? 10 : 11}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#5a5040';
  ctx.textAlign = 'right';
  ctx.fillText('NIGHTFLASH ARCHIVE', size - 20, size - 8);
  ctx.textAlign = 'left';

  const t = new THREE.CanvasTexture(c);
  return t;
}

function drawScene(ctx, scene, ox, oy, w, h) {
  switch (scene) {
    case 'chair': {
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(ox, oy, w, h);
      // Floor line
      ctx.strokeStyle = '#303030'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, oy + h * 0.7); ctx.lineTo(ox + w, oy + h * 0.7); ctx.stroke();
      // Simple chair silhouette
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + w * 0.35, oy + h * 0.35, w * 0.3, h * 0.04); // seat
      ctx.fillRect(ox + w * 0.37, oy + h * 0.19, w * 0.04, h * 0.17); // back post
      ctx.fillRect(ox + w * 0.59, oy + h * 0.19, w * 0.04, h * 0.17);
      ctx.fillRect(ox + w * 0.35, oy + h * 0.19, w * 0.28, h * 0.04); // back rest
      ctx.fillRect(ox + w * 0.37, oy + h * 0.39, w * 0.03, h * 0.31); // legs
      ctx.fillRect(ox + w * 0.60, oy + h * 0.39, w * 0.03, h * 0.31);
      break;
    }
    case 'doorway': {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(ox, oy, w, h);
      // Wall
      ctx.fillStyle = '#161616';
      ctx.fillRect(ox, oy, w, h);
      // Door frame
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 8;
      ctx.strokeRect(ox + w * 0.25, oy + h * 0.08, w * 0.5, h * 0.84);
      // Opening (slight light from beyond)
      const lg = ctx.createRadialGradient(ox + w * 0.5, oy + h * 0.5, 0, ox + w * 0.5, oy + h * 0.5, w * 0.35);
      lg.addColorStop(0, 'rgba(180,190,200,0.06)');
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(ox + w * 0.27, oy + h * 0.1, w * 0.46, h * 0.8);
      break;
    }
    case 'hallway': {
      ctx.fillStyle = '#080808';
      ctx.fillRect(ox, oy, w, h);
      // One-point perspective lines
      const mx = ox + w * 0.5, my = oy + h * 0.45;
      ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        ctx.beginPath();
        ctx.moveTo(ox + w * t, oy);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox + w * t, oy + h);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }
      // Horizon glow
      const hg = ctx.createRadialGradient(mx, my, 0, mx, my, 50);
      hg.addColorStop(0, 'rgba(125,249,255,0.08)');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(ox, oy, w, h);
      break;
    }
    case 'hand': {
      ctx.fillStyle = '#080808';
      ctx.fillRect(ox, oy, w, h);
      // Robot hand silhouette on table
      ctx.fillStyle = '#1c1c1c';
      ctx.fillRect(ox + w * 0.3, oy + h * 0.55, w * 0.4, h * 0.12); // palm
      for (let f = 0; f < 4; f++) {
        const fx = ox + w * (0.32 + f * 0.1);
        ctx.fillRect(fx, oy + h * 0.35, w * 0.06, h * 0.2);
      }
      ctx.fillRect(ox + w * 0.22, oy + h * 0.5, w * 0.1, h * 0.15); // thumb
      // Table line
      ctx.strokeStyle = '#282828'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, oy + h * 0.68); ctx.lineTo(ox + w, oy + h * 0.68); ctx.stroke();
      break;
    }
    case 'window': {
      ctx.fillStyle = '#050505';
      ctx.fillRect(ox, oy, w, h);
      // Window frame
      ctx.strokeStyle = '#252525'; ctx.lineWidth = 6;
      ctx.strokeRect(ox + w * 0.15, oy + h * 0.1, w * 0.7, h * 0.65);
      ctx.beginPath(); ctx.moveTo(ox + w * 0.5, oy + h * 0.1); ctx.lineTo(ox + w * 0.5, oy + h * 0.75); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + w * 0.15, oy + h * 0.42); ctx.lineTo(ox + w * 0.85, oy + h * 0.42); ctx.stroke();
      // Rain streaks
      ctx.strokeStyle = 'rgba(100,120,140,0.3)'; ctx.lineWidth = 1;
      for (let r = 0; r < 20; r++) {
        const rx = ox + w * 0.16 + Math.random() * w * 0.68;
        const ry = oy + h * 0.12 + Math.random() * h * 0.6;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 15); ctx.stroke();
      }
      break;
    }
    case 'tapes': {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(ox, oy, w, h);
      for (let i = 0; i < 7; i++) {
        const ty = oy + h * (0.25 + i * 0.07);
        ctx.fillStyle = '#151515';
        ctx.fillRect(ox + w * 0.15, ty, w * 0.7, h * 0.05);
        ctx.strokeStyle = '#252525'; ctx.lineWidth = 1;
        ctx.strokeRect(ox + w * 0.15, ty, w * 0.7, h * 0.05);
        ctx.fillStyle = '#222222';
        ctx.fillRect(ox + w * 0.17, ty + 2, w * 0.14, h * 0.03);
        ctx.fillRect(ox + w * 0.69, ty + 2, w * 0.14, h * 0.03);
      }
      break;
    }
    case 'drawing': {
      ctx.fillStyle = '#f0ede0';
      ctx.fillRect(ox, oy, w, h);
      // Child's crayon-style robot drawing
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3;
      const rx = ox + w * 0.3, ry = oy + h * 0.2;
      ctx.strokeRect(rx, ry, w * 0.4, h * 0.3); // body
      ctx.strokeRect(rx + w * 0.1, ry - h * 0.22, w * 0.2, h * 0.22); // head
      // eyes
      ctx.beginPath(); ctx.arc(rx + w * 0.15, ry - h * 0.12, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx + w * 0.25, ry - h * 0.12, 3, 0, Math.PI * 2); ctx.stroke();
      // arms
      ctx.beginPath(); ctx.moveTo(rx, ry + h * 0.08); ctx.lineTo(rx - w * 0.15, ry + h * 0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + w * 0.4, ry + h * 0.08); ctx.lineTo(rx + w * 0.55, ry + h * 0.18); ctx.stroke();
      // legs
      ctx.beginPath(); ctx.moveTo(rx + w * 0.12, ry + h * 0.3); ctx.lineTo(rx + w * 0.1, ry + h * 0.48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + w * 0.28, ry + h * 0.3); ctx.lineTo(rx + w * 0.3, ry + h * 0.48); ctx.stroke();
      // "I ♥ UNIT 07" text
      ctx.fillStyle = '#5a4040';
      ctx.font = `bold ${Math.floor(size * 0.04)}px sans-serif`;
      ctx.fillText('I ♥ UNIT 07', ox + w * 0.22, oy + h * 0.82);
      break;
    }
    default: {
      ctx.fillStyle = '#080808';
      ctx.fillRect(ox, oy, w, h);
    }
  }
}

// Concrete wall texture
export function makeConcreteMap(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1c1f';
  ctx.fillRect(0, 0, size, size);
  // Block pattern
  const bw = size / 8, bh = size / 5;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 9; col++) {
      const off = (row % 2) * (bw / 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(col * bw - off, row * bh, bw, bh);
    }
  }
  // Noise/grime
  const id = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    id.data[i] = Math.max(0, Math.min(255, id.data[i] + n));
    id.data[i + 1] = Math.max(0, Math.min(255, id.data[i + 1] + n));
    id.data[i + 2] = Math.max(0, Math.min(255, id.data[i + 2] + n));
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Floor reflective texture (wet concrete)
export function makeFloorMap(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0e1012';
  ctx.fillRect(0, 0, size, size);
  // Tile grout lines
  const ts = size / 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(i * ts, 0); ctx.lineTo(i * ts, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * ts); ctx.lineTo(size, i * ts); ctx.stroke();
  }
  // Reflective sheen
  const rg = ctx.createLinearGradient(0, 0, size, size);
  rg.addColorStop(0, 'rgba(125,249,255,0.04)');
  rg.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
