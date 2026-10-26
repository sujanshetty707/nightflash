/**
 * NIGHTFLASH – Section 03: THE CORRIDOR
 * First-person walk through abandoned maintenance corridor.
 * Camera on a rail, scroll-scrubbed, with fluorescent tube flicker.
 */
import * as THREE from 'three';
import { makeConcreteMap, makeRoughnessMap, makeFloorMap, makeStainMap } from '../shared/textures.js';

const CORRIDOR_LENGTH = 80;
const TUBE_COUNT = 8;
const CORRIDOR_W = 3.5;
const CORRIDOR_H = 3.2;

export class CorridorScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);
    this.scene.fog = new THREE.Fog(0x050505, 8, 22);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 60);
    this.camera.position.set(0, 1.62, 0); // eye height

    this.scrollProgress = 0; // 0.0 → 1.0
    this.bobTime = 0;
    this.flashLightIntensity = 0; // from shared flash system
    this.tubes = []; // { light, emissive, mesh, flicker }
    this.scrollText = 0; // which text is shown

    // Manual flash charge
    this.flashCharges = 5;
    this.maxCharges = 5;
    this.chargeRegenTimer = 0;
    this.REGEN_TIME = 6.0;
    this.isChargingFlash = false;
    this.chargeLevel = 0;

    // Silhouette object (appears in one flash, gone next)
    this.silhouetteVisible = true;
    this.silhouetteFlashSeen = false;
    this.silhouetteZ = -CORRIDOR_LENGTH + 8;

    this._buildCorridor();
    this._buildTubeLights();
    this._buildProps();
    this._buildSilhouette();
    this._bindInput();
  }

  _buildCorridor() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: makeConcreteMap(512),
      roughnessMap: makeRoughnessMap(512),
      roughness: 0.88, metalness: 0.05, color: 0x1a1c1f
    });
    wallMat.map.repeat.set(6, 2);
    wallMat.roughnessMap.repeat.set(6, 2);

    const floorMat = new THREE.MeshStandardMaterial({
      map: makeFloorMap(512), roughness: 0.4, metalness: 0.25,
      color: 0x0e1012
    });
    floorMat.map.repeat.set(8, 40);

    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.92 });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LENGTH);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -CORRIDOR_LENGTH / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LENGTH), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, CORRIDOR_H, -CORRIDOR_LENGTH / 2);
    this.scene.add(ceil);

    // Left + Right walls
    for (const side of [-1, 1]) {
      const wallMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CORRIDOR_LENGTH, CORRIDOR_H),
        wallMat.clone()
      );
      wallMesh.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
      wallMesh.position.set(side * CORRIDOR_W / 2, CORRIDOR_H / 2, -CORRIDOR_LENGTH / 2);
      this.scene.add(wallMesh);
    }

    // Water stain decals on wall
    const stainMat = new THREE.MeshStandardMaterial({
      map: makeStainMap(256), transparent: true, opacity: 0.55,
      roughness: 0.9, depthWrite: false
    });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), stainMat);
      s.position.set(-CORRIDOR_W / 2 + 0.02, 0.8 + Math.random() * 1.2, -4 - i * 10);
      s.rotation.y = Math.PI / 2;
      this.scene.add(s);
    }

    // Floor warning stripes (half peeled)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf5c100, roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.4), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = Math.PI / 6;
      stripe.position.set(-0.8 + Math.random() * 0.3, 0.002, -8 - i * 12);
      this.scene.add(stripe);
    }

    // Numbered doors every 10m
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.85, metalness: 0.2 });
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.7, metalness: 0.4 });
    for (let i = 0; i < 6; i++) {
      const z = -5 - i * 11;
      const side = i % 2 === 0 ? 1 : -1;
      // Door panel
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.2), doorMat);
      door.position.set(side * CORRIDOR_W / 2 + side * 0.04, 1.2, z);
      this.scene.add(door);
      // Door frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 1.38), doorFrameMat);
      frame.position.set(side * CORRIDOR_W / 2 + side * 0.06, 1.3, z);
      this.scene.add(frame);
      // Door number plate
      this._addDoorNumber(side * CORRIDOR_W / 2 + side * 0.1, 1.6, z, `0${i + 2}`);
    }

    // Pipes along ceiling
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.6, metalness: 0.7 });
    const rustPipeMat = new THREE.MeshStandardMaterial({ color: 0x3a2518, roughness: 0.9, metalness: 0.4 });
    for (let p = 0; p < 4; p++) {
      const pipeGeo = new THREE.CylinderGeometry(0.045, 0.045, CORRIDOR_LENGTH, 6);
      const pipe = new THREE.Mesh(pipeGeo, p < 2 ? pipeMat : rustPipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(-0.6 + p * 0.4, CORRIDOR_H - 0.15, -CORRIDOR_LENGTH / 2);
      this.scene.add(pipe);
    }

    // Hanging cable bundles
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });
    for (let i = 0; i < 8; i++) {
      const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6 + Math.random() * 0.8, 4);
      const cable = new THREE.Mesh(cableGeo, cableMat);
      cable.position.set(
        (Math.random() - 0.5) * CORRIDOR_W * 0.7,
        CORRIDOR_H - 0.3 - Math.random() * 0.2,
        -5 - Math.random() * (CORRIDOR_LENGTH - 10)
      );
      this.scene.add(cable);
    }

    // Floor drains
    const drainMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.5, metalness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), drainMat);
      drain.position.set(0, 0.001, -10 - i * 15);
      this.scene.add(drain);
    }
  }

  _addDoorNumber(x, y, z, num) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0c0d0e';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#6a7080';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(num, 24, 48);
    const tex = new THREE.CanvasTexture(canvas);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.14),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    plate.position.set(x, y, z);
    plate.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(plate);
  }

  _buildTubeLights() {
    const spacing = CORRIDOR_LENGTH / TUBE_COUNT;
    const tubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, emissive: 0x000000, roughness: 0.9 });

    for (let i = 0; i < TUBE_COUNT; i++) {
      const z = -2 - i * spacing;
      const alive = i === 3; // Only one buzzes and strobes by default

      const emissiveMat = new THREE.MeshStandardMaterial({
        color: 0xd8e4f0, emissive: new THREE.Color(0xd8e4f0),
        emissiveIntensity: alive ? 1.2 : 0, roughness: 0.3
      });

      const tube = new THREE.Mesh(tubeGeo, alive ? emissiveMat : deadMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, CORRIDOR_H - 0.06, z);
      this.scene.add(tube);

      // Light fixture housing
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.08, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8, metalness: 0.5 })
      );
      housing.position.set(0, CORRIDOR_H - 0.01, z);
      this.scene.add(housing);

      const light = alive
        ? new THREE.PointLight(0xd0e8ff, 2.5, 6.0)
        : new THREE.PointLight(0xd0e8ff, 0, 0);
      light.position.set(0, CORRIDOR_H - 0.15, z);
      this.scene.add(light);

      this.tubes.push({
        light, emissiveMat: alive ? emissiveMat : null, alive,
        z, phase: Math.random() * Math.PI * 2,
        flickerTimer: 0, flickerInterval: 0.12 + Math.random() * 0.18,
        strobeState: false, strobeTimer: 0
      });
    }
  }

  _buildProps() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.6, metalness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.85 });

    // Wheelchair silhouette at z = -18
    const wBase = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 1.1), metalMat);
    wBase.position.set(-0.6, 0.55, -18);
    this.scene.add(wBase);
    const wBack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.04), metalMat);
    wBack.position.set(-0.6, 0.95, -18.55);
    this.scene.add(wBack);
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 16), metalMat);
      wheel.position.set(-0.6 + side * 0.36, 0.3, -18);
      wheel.rotation.y = Math.PI / 2;
      this.scene.add(wheel);
    }

    // Toppled cart at z = -32
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8), metalMat);
    cart.position.set(0.7, 0.22, -32);
    cart.rotation.z = 0.4;
    this.scene.add(cart);
    // Scattered contents
    for (let i = 0; i < 6; i++) {
      const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.12),
        darkMat
      );
      item.position.set(0.4 + Math.random() * 0.8, 0.04, -31.5 + Math.random() * 1.5);
      item.rotation.y = Math.random() * Math.PI;
      this.scene.add(item);
    }

    // Oil trail (dark dots)
    const oilMat = new THREE.MeshStandardMaterial({ color: 0x03050a, metalness: 0.9, roughness: 0.1 });
    for (let i = 0; i < 20; i++) {
      const drop = new THREE.Mesh(new THREE.CircleGeometry(0.04 + Math.random() * 0.03, 6), oilMat);
      drop.rotation.x = -Math.PI / 2;
      drop.position.set(-0.1 + Math.random() * 0.2, 0.002, -12 - i * 1.6);
      this.scene.add(drop);
    }

    // Handprints on wall (canvas texture)
    const handCanvas = document.createElement('canvas');
    handCanvas.width = 256; handCanvas.height = 256;
    const hCtx = handCanvas.getContext('2d');
    hCtx.fillStyle = 'rgba(0,0,0,0)';
    hCtx.clearRect(0, 0, 256, 256);
    // Draw a rough handprint
    hCtx.fillStyle = 'rgba(180,140,100,0.4)';
    hCtx.beginPath(); hCtx.arc(128, 160, 35, 0, Math.PI * 2); hCtx.fill(); // palm
    for (let f = 0; f < 4; f++) {
      hCtx.beginPath();
      hCtx.ellipse(80 + f * 26, 110, 10, 22, (f - 1.5) * 0.15, 0, Math.PI * 2);
      hCtx.fill();
    }
    const handTex = new THREE.CanvasTexture(handCanvas);
    const handMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.45),
      new THREE.MeshBasicMaterial({ map: handTex, transparent: true, depthWrite: false })
    );
    handMesh.position.set(-CORRIDOR_W / 2 + 0.01, 1.4, -24);
    handMesh.rotation.y = Math.PI / 2;
    this.scene.add(handMesh);
  }

  _buildSilhouette() {
    // Simple cross-shaped silhouette — standing figure at corridor end
    const mat = new THREE.MeshBasicMaterial({ color: 0x080c10, transparent: true, opacity: 0.0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.08), mat);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.08), mat);
    head.position.y = 0.72;
    const group = new THREE.Group();
    group.add(body);
    group.add(head);
    group.position.set(0, 0.9, this.silhouetteZ);
    this.scene.add(group);
    this.silhouetteGroup = group;
    this.silhouetteMat = mat;
  }

  _bindInput() {
    this._mousedownHandler = () => { this.isChargingFlash = true; };
    this._mouseupHandler = () => {
      if (this.isChargingFlash && this.chargeLevel > 0.1 && this.flashCharges > 0) {
        this.flashCharges = Math.max(0, this.flashCharges - 1);
        this.chargeLevel = 0;
        // Fire manual flash in the corridor (exposed via callback)
        if (this._onManualFlash) this._onManualFlash(0.95);
      }
      this.isChargingFlash = false;
    };
    window.addEventListener('mousedown', this._mousedownHandler);
    window.addEventListener('mouseup', this._mouseupHandler);
    window.addEventListener('touchstart', this._mousedownHandler, { passive: true });
    window.addEventListener('touchend', this._mouseupHandler, { passive: true });
  }

  dispose() {
    window.removeEventListener('mousedown', this._mousedownHandler);
    window.removeEventListener('mouseup', this._mouseupHandler);
    window.removeEventListener('touchstart', this._mousedownHandler);
    window.removeEventListener('touchend', this._mouseupHandler);
  }

  update(time, delta, scrollProgress, flashIntensity, sceneAudio) {
    this.scrollProgress = scrollProgress;

    // Camera walking forward along Z
    const walkZ = -scrollProgress * (CORRIDOR_LENGTH - 4);
    // Handheld bob
    this.bobTime += delta * 2.8;
    const bob = Math.sin(this.bobTime) * 0.028 * (1 + scrollProgress * 0.3);
    const sway = Math.cos(this.bobTime * 0.5) * 0.012;
    this.camera.position.set(sway, 1.62 + bob, walkZ);

    // Footstep trigger
    if (scrollProgress > 0.05 && Math.abs(Math.sin(this.bobTime)) < 0.04 && sceneAudio) {
      sceneAudio.playFootstep();
    }

    // Camera drift / head turn
    const headDrift = Math.sin(time * 0.18) * 0.05;
    this.camera.rotation.y = headDrift;
    this.camera.rotation.z = Math.sin(time * 0.4) * 0.006;

    // Flash charge recharge
    if (!this.isChargingFlash && this.flashCharges < this.maxCharges) {
      this.chargeRegenTimer += delta;
      if (this.chargeRegenTimer >= this.REGEN_TIME) {
        this.chargeRegenTimer = 0;
        this.flashCharges = Math.min(this.maxCharges, this.flashCharges + 1);
      }
    }
    if (this.isChargingFlash && this.flashCharges > 0) {
      this.chargeLevel = Math.min(1.0, this.chargeLevel + delta * 1.4);
    }

    // Tube light flickering
    for (const tube of this.tubes) {
      if (!tube.alive) continue;
      tube.flickerTimer += delta;
      if (tube.flickerTimer >= tube.flickerInterval) {
        tube.flickerTimer = 0;
        tube.flickerInterval = 0.06 + Math.random() * 0.22;
        tube.strobeState = !tube.strobeState;
        const on = tube.strobeState;
        tube.light.intensity = on ? (1.8 + Math.random() * 1.2) : (Math.random() < 0.15 ? 0.3 : 0.0);
        if (tube.emissiveMat) {
          tube.emissiveMat.emissiveIntensity = tube.light.intensity * 0.7;
        }
      }
      // The working tube also brightens when a flash fires
      tube.light.intensity = Math.max(tube.light.intensity, flashIntensity * 3.0);
    }

    // Silhouette: visible briefly during one flash, disappears after
    if (flashIntensity > 0.5 && this.silhouetteVisible && !this.silhouetteFlashSeen) {
      this.silhouetteFlashSeen = true;
      this.silhouetteMat.opacity = 1.0;
      this.silhouetteGroup.visible = true;
      setTimeout(() => {
        this.silhouetteMat.opacity = 0.0;
        this.silhouetteGroup.visible = false;
        // Move to different position
        this.silhouetteGroup.position.z = -CORRIDOR_LENGTH + 5 + Math.random() * 20;
        this.silhouetteVisible = false;
      }, 450);
    }
    if (flashIntensity < 0.1 && this.silhouetteFlashSeen) {
      // Ready for next flash reveal at a new position
      this.silhouetteFlashSeen = false;
    }

    // General flash illumination of all lights
    const allLight = flashIntensity * 5.0;
    for (const tube of this.tubes) {
      if (!tube.alive) {
        tube.light.intensity = allLight * 0.8;
      }
    }
  }

  getScrollTextIndex(progress) {
    if (progress < 0.25) return 0;
    if (progress < 0.5) return 1;
    if (progress < 0.75) return 2;
    return 3;
  }

  onResize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
