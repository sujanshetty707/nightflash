/**
 * NIGHTFLASH – Section 06: SIGNAL TOWER
 * Wireframe terrain + broken radio tower. Mouse tunes signal.
 * If sound on: procedural drone + morse. Terrain reacts to "audio".
 */
import * as THREE from 'three';

const TERRAIN_SEGS = 48;
const TERRAIN_SIZE = 28;

export class SignalTowerScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020304);
    this.scene.fog = new THREE.Fog(0x020304, 18, 40);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 80);
    this.camera.position.set(-6, 3.5, 14);
    this.camera.lookAt(-2, 0, 0);

    this.signalFreq = 0.5; // 0.0 → 1.0 (mouse X position)
    this.clearSignalFound = false;
    this.clearSignalTimer = 0;
    this.pulseTimer = 0;

    this.flashLight = null;
    this.towerTopLight = null;
    this.pulseRings = [];

    this._buildTerrain();
    this._buildTower();
    this._buildPulseRings();
    this._buildLighting();
    this._bindInput();
  }

  _buildTerrain() {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
    geo.rotateX(-Math.PI / 2);
    // Store original Y positions for displacement
    this._terrainOrigY = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      this._terrainOrigY.push(pos.getY(i));
    }

    const mat = new THREE.MeshBasicMaterial({
      color: 0x7df9ff, wireframe: true, transparent: true, opacity: 0.45
    });
    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.position.set(0, -1.5, 0);
    this.scene.add(this.terrainMesh);
    this._terrainGeo = geo;
  }

  _buildTower() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1e22, metalness: 0.8, roughness: 0.5 });

    // Main lattice: vertical struts
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-8, -1.5, -2);
    this.scene.add(towerGroup);
    this.towerGroup = towerGroup;

    const strut = (x1, z1, x2, z2, y1, y2) => {
      const pts = [new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x303840 }));
      towerGroup.add(line);
    };

    // 4-corner lattice tower 12m tall
    const base = 0.8;
    const top = 0.2;
    const H = 12;
    const levels = 8;
    for (let l = 0; l < levels; l++) {
      const t = l / (levels - 1);
      const b0 = base * (1 - t) + top * t;
      const b1 = base * (1 - (l + 1) / (levels - 1)) + top * (l + 1) / (levels - 1);
      const y0 = l * (H / levels);
      const y1 = (l + 1) * (H / levels);
      // 4 vertical corners
      strut(-b0, -b0, -b1, -b1, y0, y1);
      strut( b0, -b0,  b1, -b1, y0, y1);
      strut(-b0,  b0, -b1,  b1, y0, y1);
      strut( b0,  b0,  b1,  b1, y0, y1);
      // Cross braces
      strut(-b0, -b0,  b0,  b0, y0, y0);
      strut( b0, -b0, -b0,  b0, y0, y0);
      // Diagonals
      strut(-b0, -b0,  b1,  b1, y0, y1);
      strut( b0,  b0, -b1, -b1, y0, y1);
    }

    // Collapsed section (section 4-5 hangs by cables)
    const brokenGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.4, 5.2, -0.4),
      new THREE.Vector3( 0.8, 4.6,  0.6),
    ]);
    const brokenPiece = new THREE.Line(brokenGeo,
      new THREE.LineBasicMaterial({ color: 0x303840 })
    );
    towerGroup.add(brokenPiece);

    // Cable hanging from break
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 5.5, 0),
      new THREE.Vector3(0.5, 4.8, 0.2),
      new THREE.Vector3(0.4, 4.0, 0.3),
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 12, 0.012, 4, false);
    towerGroup.add(new THREE.Mesh(cableGeo, metalMat));

    // Blinking red light at top
    const topLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a })
    );
    topLight.position.set(0, H + 0.1, 0);
    towerGroup.add(topLight);
    this.towerTopLight = new THREE.PointLight(0xff2a2a, 1.2, 3);
    this.towerTopLight.position.set(-8, H - 1.5, -2);
    this.scene.add(this.towerTopLight);
    this.towerTopMesh = topLight;
  }

  _buildPulseRings() {
    // Expanding rings from tower base along terrain
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7df9ff, wireframe: true, transparent: true, opacity: 0
    });
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.02, 6, 32),
        ringMat.clone()
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-8, -1.4, -2);
      this.scene.add(ring);
      this.pulseRings.push({ mesh: ring, active: false, scale: 1, delay: r * 1.8 });
    }
  }

  _buildLighting() {
    this.scene.add(new THREE.AmbientLight(0x020408, 0.4));
    this.flashLight = new THREE.DirectionalLight(0x9fd8ff, 0);
    this.flashLight.position.set(2, 8, 5);
    this.scene.add(this.flashLight);
  }

  _bindInput() {
    this._mouseMoveHandler = (e) => {
      this.signalFreq = e.clientX / window.innerWidth;
    };
    this._touchMoveHandler = (e) => {
      if (e.touches.length > 0) {
        this.signalFreq = e.touches[0].clientX / window.innerWidth;
      }
    };
    window.addEventListener('mousemove', this._mouseMoveHandler);
    window.addEventListener('touchmove', this._touchMoveHandler, { passive: true });
  }

  dispose() {
    window.removeEventListener('mousemove', this._mouseMoveHandler);
    window.removeEventListener('touchmove', this._touchMoveHandler);
  }

  update(time, delta, flashIntensity, sceneAudio) {
    // Terrain displacement: seismograph ripple driven by mouse X (signal frequency)
    const noiseFreq = 0.5 + this.signalFreq * 4.0;
    const pos = this._terrainGeo.attributes.position;
    const CLEAR_FREQ = 0.475; // Hidden sweet-spot

    let isNearClear = Math.abs(this.signalFreq - CLEAR_FREQ) < 0.012;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let wave;
      if (isNearClear) {
        // Signal clears: terrain flattens
        const flatFactor = Math.max(0, 1 - Math.abs(this.signalFreq - CLEAR_FREQ) / 0.012);
        wave = Math.sin(x * 0.6 + time * 1.2) * 0.04 * (1 - flatFactor);
      } else {
        wave = (
          Math.sin(x * noiseFreq * 0.8 + time * 1.2) * 0.45 +
          Math.sin(z * noiseFreq * 0.5 + time * 0.9) * 0.28 +
          Math.sin((x + z) * noiseFreq * 0.3 + time * 1.6) * 0.18
        );
      }
      pos.setY(i, this._terrainOrigY[i] + wave);
    }
    pos.needsUpdate = true;
    this._terrainGeo.computeVertexNormals();

    // Clear signal event
    if (isNearClear && !this.clearSignalFound) {
      this.clearSignalFound = true;
      this.clearSignalTimer = 4.0;
      if (this._onClearSignal) this._onClearSignal();
    }
    if (this.clearSignalTimer > 0) {
      this.clearSignalTimer -= delta;
      if (this.clearSignalTimer <= 0) this.clearSignalFound = false;
    }

    // Tower top blink
    const blink = Math.sin(time * 4.5) > 0.5;
    this.towerTopLight.intensity = blink ? 1.5 : 0.0;
    this.towerTopMesh.material.color.setHex(blink ? 0xff2a2a : 0x3a0505);

    // Pulse rings expanding from base
    this.pulseTimer += delta;
    for (let r = 0; r < this.pulseRings.length; r++) {
      const ring = this.pulseRings[r];
      const offset = (this.pulseTimer + ring.delay) % 5.0;
      const scale = 1 + offset * 4.0;
      const opacity = Math.max(0, 0.5 - offset * 0.1);
      ring.mesh.scale.set(scale, scale, 1);
      ring.mesh.material.opacity = opacity;
    }

    // Flash light
    this.flashLight.intensity = flashIntensity * 4.0;

    // Terrain opacity reacts to flash
    this.terrainMesh.material.opacity = 0.35 + flashIntensity * 0.4 +
      (this.clearSignalFound ? 0.3 : 0);

    // Morse-code audio if sound is on
    if (sceneAudio && !sceneAudio.muted) {
      // Roughly every 11 seconds — short pattern
      const morsePhase = (time % 11.0);
      if (morsePhase < 0.08 && morsePhase > 0.0 && Math.random() < 0.5) {
        sceneAudio.playMorseBeep(0.08);
      }
      if (morsePhase > 0.15 && morsePhase < 0.22 && Math.random() < 0.5) {
        sceneAudio.playMorseBeep(0.15);
      }
    }
  }

  onResize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
