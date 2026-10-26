/**
 * NIGHTFLASH – Section 04: ANATOMY OF A BREAKDOWN
 * Exploded-view robotic forearm — scroll-scrubbed, blueprint wireframe, 8 hotspots.
 */
import * as THREE from 'three';
import { makeRoughnessMap } from '../shared/textures.js';

const HOTSPOT_DATA = [
  { label: 'SERVO 04', text: 'Stalled 2,211 days. Still warm.', partIdx: 0 },
  { label: 'TENDON CABLE', text: 'Frayed at 63%. It still tries to close the hand.', partIdx: 1 },
  { label: 'FINGERTIP SENSOR', text: 'Last touch: a human hand, 11:42 PM.', partIdx: 2 },
  { label: 'HYDRAULIC LINE', text: 'Leak rate: 1 drop per 40 minutes.', partIdx: 3 },
  { label: 'WRIST BEARING', text: 'Grinding. Do not rotate.', partIdx: 4 },
  { label: 'MICRO CAMERA', text: 'Lens cracked. Still recording.', partIdx: 5 },
  { label: 'BATTERY CELL C', text: 'Swollen. Warning ignored.', partIdx: 6 },
  { label: 'SERIAL ETCH', text: '"MADE TO HOLD."', partIdx: 7 },
];

export class AnatomyScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.set(0, 0, 6.5);
    this.camera.lookAt(0, 0, 0);

    this.scrollProgress = 0; // 0 = assembled, 1 = fully exploded
    this.parts = []; // { mesh, explodeDir, basePos, hotspotIdx }
    this.hotspots = []; // { mesh, data, worldPos }
    this.activeHotspot = -1;
    this.lockedPartIdx = -1; // camera locked onto this part on click
    this.rotationY = 0; // slow idle rotation

    // Raycaster for hotspot hover
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this._flashCallback = null; // set by SectionManager

    this._buildArm();
    this._buildHotspots();
    this._buildLighting();
    this._bindInput();
  }

  _buildArm() {
    const roughMap = makeRoughnessMap(256);
    const metalMat = (color = 0x1e2226) => new THREE.MeshStandardMaterial({
      color, metalness: 0.9, roughness: 0.45, roughnessMap: roughMap,
      wireframe: false
    });
    const darkMat = metalMat(0x141618);
    const chromeMat = metalMat(0xb0bcc5);
    chromeMat.roughness = 0.2;
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 });
    const redCableMat = new THREE.MeshStandardMaterial({ color: 0x6a1010, roughness: 0.8 });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x003344, roughness: 0.5, metalness: 0.6,
      emissive: new THREE.Color(0x004466), emissiveIntensity: 0.3
    });

    const addPart = (geo, mat, pos, explodeDir, hotspotIdx = -1) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.parts.push({ mesh, explodeDir: explodeDir.clone(), basePos: pos.clone(), hotspotIdx });

      // Cyan wireframe overlay (ghost edges)
      const edges = new THREE.EdgesGeometry(geo, 25);
      const wireMat = new THREE.LineBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.35 });
      const wire = new THREE.LineSegments(edges, wireMat);
      mesh.add(wire);

      return mesh;
    };

    // FOREARM BODY
    addPart(
      new THREE.CylinderGeometry(0.22, 0.28, 1.4, 10),
      darkMat.clone(), new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0) // doesn't move
    );

    // WRIST BEARING (Part 4)
    addPart(
      new THREE.CylinderGeometry(0.26, 0.26, 0.16, 12),
      chromeMat.clone(), new THREE.Vector3(0, -0.78, 0),
      new THREE.Vector3(0.6, -0.5, 0.3), 4
    );

    // SERVO 04 (Part 0) — motor housing
    addPart(
      new THREE.BoxGeometry(0.22, 0.32, 0.22),
      darkMat.clone(), new THREE.Vector3(-0.28, 0.2, 0.12),
      new THREE.Vector3(-1.2, 0.4, 0.5), 0
    );

    // HYDRAULIC LINE (Part 3) — cylinder
    addPart(
      new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8),
      cyanMat.clone(), new THREE.Vector3(0.2, 0.1, 0.15),
      new THREE.Vector3(1.0, 0.2, 0.6), 3
    );

    // TENDON CABLE (Part 1) — curve tube
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.05, 0.7, 0.1),
      new THREE.Vector3(0.0, 0.2, 0.18),
      new THREE.Vector3(0.04, -0.6, 0.14),
    ]);
    const cableGeo = new THREE.TubeGeometry(curve, 20, 0.022, 6, false);
    addPart(cableGeo, cableMat.clone(), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.8, 0, -0.6), 1);
    addPart(cableGeo, redCableMat.clone(), new THREE.Vector3(0.06, 0, 0), new THREE.Vector3(-0.6, 0, -0.8), 1);

    // PALM
    addPart(
      new THREE.BoxGeometry(0.55, 0.18, 0.5),
      darkMat.clone(), new THREE.Vector3(0, -1.05, 0),
      new THREE.Vector3(0, -1.0, 0)
    );

    // FINGERS (4) - Part 2 for fingertip, others plain
    for (let f = 0; f < 4; f++) {
      const fx = -0.2 + f * 0.14;
      // proximal
      addPart(
        new THREE.BoxGeometry(0.08, 0.28, 0.08),
        darkMat.clone(), new THREE.Vector3(fx, -1.34, 0.05),
        new THREE.Vector3(fx * 0.6, -0.6, 0.4)
      );
      // distal (fingertip sensor on index finger)
      addPart(
        new THREE.BoxGeometry(0.07, 0.22, 0.07),
        f === 1 ? cyanMat.clone() : darkMat.clone(),
        new THREE.Vector3(fx, -1.64, 0.06),
        new THREE.Vector3(fx * 0.8, -0.9, 0.5),
        f === 1 ? 2 : -1
      );
    }

    // BATTERY CELL C (Part 6) — swollen box
    addPart(
      new THREE.BoxGeometry(0.18, 0.28, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x1a2800, roughness: 0.7, metalness: 0.5,
        emissive: new THREE.Color(0x102200), emissiveIntensity: 0.2 }),
      new THREE.Vector3(0.28, 0.4, -0.15),
      new THREE.Vector3(0.8, 0.5, -0.8), 6
    );

    // MICRO CAMERA (Part 5) — small cylinder lens
    addPart(
      new THREE.CylinderGeometry(0.055, 0.055, 0.09, 8),
      cyanMat.clone(), new THREE.Vector3(-0.2, -1.0, 0.2),
      new THREE.Vector3(-0.8, -0.8, 0.8), 5
    );

    // SERIAL ETCH PLATE (Part 7)
    const serialCanvas = document.createElement('canvas');
    serialCanvas.width = 256; serialCanvas.height = 64;
    const sCtx = serialCanvas.getContext('2d');
    sCtx.fillStyle = '#141618';
    sCtx.fillRect(0, 0, 256, 64);
    sCtx.fillStyle = '#8090a0';
    sCtx.font = '18px monospace';
    sCtx.fillText('MADE TO HOLD', 12, 42);
    const serialTex = new THREE.CanvasTexture(serialCanvas);
    addPart(
      new THREE.PlaneGeometry(0.5, 0.12),
      new THREE.MeshBasicMaterial({ map: serialTex }),
      new THREE.Vector3(0, 0.6, 0.23),
      new THREE.Vector3(0, 0.6, 1.5), 7
    );
  }

  _buildHotspots() {
    const hotspotGeo = new THREE.RingGeometry(0.05, 0.07, 8);
    const hotspotMat = new THREE.MeshBasicMaterial({ color: 0x7df9ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });

    HOTSPOT_DATA.forEach((data, idx) => {
      const part = this.parts.find(p => p.hotspotIdx === data.partIdx);
      if (!part) return;
      const pos = part.basePos.clone().add(new THREE.Vector3(0, 0, 0.3));
      const mesh = new THREE.Mesh(hotspotGeo, hotspotMat.clone());
      mesh.position.copy(pos);
      mesh.userData = { hotspotIdx: idx, data };
      this.scene.add(mesh);
      this.hotspots.push({ mesh, data, worldPos: pos, idx });
    });
  }

  _buildLighting() {
    // Blueprint-style cold ambient fill
    const ambient = new THREE.AmbientLight(0x0a1020, 0.4);
    this.scene.add(ambient);

    // Key light (from front-top, cold blue)
    this.keyLight = new THREE.DirectionalLight(0x9fd8ff, 0.3);
    this.keyLight.position.set(-2, 4, 3);
    this.scene.add(this.keyLight);

    // Rim light (cyan from behind)
    const rim = new THREE.DirectionalLight(0x7df9ff, 0.15);
    rim.position.set(2, -1, -3);
    this.scene.add(rim);

    // Flash light (spikes during global flash)
    this.flashLight = new THREE.DirectionalLight(0xd8f0ff, 0);
    this.flashLight.position.set(0, 5, 5);
    this.scene.add(this.flashLight);
  }

  _bindInput() {
    this._mouseMoveHandler = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    this._clickHandler = (e) => {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hotspotMeshes = this.hotspots.map(h => h.mesh);
      const hits = this.raycaster.intersectObjects(hotspotMeshes);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.hotspotIdx;
        this.lockedPartIdx = (this.lockedPartIdx === idx) ? -1 : idx;
        if (this._onHotspotClick) this._onHotspotClick(this.lockedPartIdx >= 0 ? HOTSPOT_DATA[idx] : null);
        if (this._flashCallback) this._flashCallback(0.7);
      }
    };
    window.addEventListener('mousemove', this._mouseMoveHandler);
    window.addEventListener('click', this._clickHandler);
  }

  dispose() {
    window.removeEventListener('mousemove', this._mouseMoveHandler);
    window.removeEventListener('click', this._clickHandler);
  }

  update(time, delta, scrollProgress, flashIntensity, sceneAudio) {
    this.scrollProgress = scrollProgress;

    // Idle rotation (stops when hotspot locked)
    if (this.lockedPartIdx < 0) {
      this.rotationY += delta * 0.22;
    }

    // Flash light spike
    this.flashLight.intensity = flashIntensity * 5.0;
    this.keyLight.intensity = 0.3 + flashIntensity * 2.0;

    // Explode parts along their direction
    for (const part of this.parts) {
      const explodedPos = part.basePos.clone().add(
        part.explodeDir.clone().multiplyScalar(scrollProgress * 1.5)
      );
      part.mesh.position.lerp(explodedPos, 0.08);
      // Slow spin of individual parts when exploded
      if (scrollProgress > 0.2) {
        part.mesh.rotation.y += delta * 0.3 * scrollProgress;
      }
    }

    // Group rotation
    const groupRot = this.lockedPartIdx >= 0 ? 0 : this.rotationY;
    this.parts.forEach(p => {
      // Apply group rotation around Y
      const r = new THREE.Matrix4().makeRotationY(groupRot);
      const newPos = part_baseRotated(p.basePos, p.explodeDir, scrollProgress, groupRot);
      p.mesh.position.lerp(newPos, 0.06);
    });

    // Hotspot animation (pulse ring size)
    const t = time * 2.5;
    for (const h of this.hotspots) {
      const scale = 1.0 + Math.sin(t + h.idx) * 0.15;
      h.mesh.scale.set(scale, scale, 1);
    }

    // Hotspot hover check
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.hotspots.map(h => h.mesh));
    const hoveredIdx = hits.length > 0 ? hits[0].object.userData.hotspotIdx : -1;
    this.activeHotspot = hoveredIdx;

    for (const h of this.hotspots) {
      const active = h.idx === hoveredIdx || h.idx === this.lockedPartIdx;
      h.mesh.material.opacity = active ? 1.0 : 0.6;
      h.mesh.material.color.setHex(active ? 0xffffff : 0x7df9ff);
    }
  }

  onResize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

function part_baseRotated(basePos, explodeDir, progress, rotY) {
  const exploded = basePos.clone().add(explodeDir.clone().multiplyScalar(progress * 1.5));
  // Rotate around Y
  const cos = Math.cos(rotY), sin = Math.sin(rotY);
  return new THREE.Vector3(
    exploded.x * cos - exploded.z * sin,
    exploded.y,
    exploded.x * sin + exploded.z * cos
  );
}
