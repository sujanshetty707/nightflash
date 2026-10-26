/**
 * NIGHTFLASH – Section 05: THE CAMERA ROLL
 * 12 floating photographs in 3D void. Flash reveals them. Drag to orbit.
 */
import * as THREE from 'three';
import { makePhotoTexture } from '../shared/textures.js';

const PHOTO_DATA = [
  { scene: 'chair',   caption: 'Day 1. It waved at me.',              pos: [-2.2, 1.1, -1.5] },
  { scene: 'doorway', caption: 'Day 40. It learned my name.',          pos: [ 2.8, 0.2, -2.2] },
  { scene: 'hallway', caption: 'Day 212. Power flickered. It hummed a song.', pos: [-0.8, -1.4, -3.0] },
  { scene: 'tapes',   caption: 'Day 900. I stopped visiting.',         pos: [ 3.5, 1.8, -4.0] },
  { scene: 'window',  caption: 'Day 2,000. The lights went out.',      pos: [-3.2, 0.5, -5.0] },
  { scene: 'hand',    caption: 'Day 4,381. Someone came back.',        pos: [ 0.5, 2.2, -6.0] },
  { scene: 'drawing', caption: 'Day 365. Birthday. No one came.',      pos: [-1.8, -0.8, -2.5] },
  { scene: 'hallway', caption: 'Day 1,460. The roof started leaking.', pos: [ 1.5, -1.6, -4.5] },
  { scene: 'chair',   caption: 'Day 3,000. It learned to count.',      pos: [-3.8, 1.5, -3.5] },
  { scene: 'doorway', caption: 'Day 730. Something moved outside.',    pos: [ 2.2, -0.5, -1.8] },
  { scene: 'tapes',   caption: 'Day 1,826. Five years of silence.',    pos: [-0.3, 1.8, -5.5] },
  { scene: 'window',  caption: 'Day 4,380. Almost time.',              pos: [ 3.8, 0.9, -6.5] },
];

export class CameraRollScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);
    this.scene.fog = new THREE.FogExp2(0x050505, 0.09);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 30);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -3);

    this.photos = [];
    this.selectedPhoto = -1;
    this.selectedOriginalPos = null;
    this.selectedOriginalRot = null;

    // Orbit state
    this.orbit = { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0 };
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    // Flash state: SPACE or button press
    this.flashCallback = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this._buildPhotos();
    this._buildWires();
    this._buildLighting();
    this._bindInput();
  }

  _buildPhotos() {
    const swaySeed = Math.random() * 100;
    PHOTO_DATA.forEach((data, idx) => {
      const tex = makePhotoTexture(data.scene, data.caption, 512);
      // Slightly curled border - use a PlaneGeometry with slight bend
      const geo = new THREE.PlaneGeometry(1.4, 1.4, 4, 4);
      // Curl the photo corners slightly
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const curl = (x * x + y * y) * 0.012;
        pos.setZ(i, curl);
      }
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.75, metalness: 0.0,
        // Almost black silhouette between flashes — controlled via emissiveIntensity
        emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.0
      });

      const mesh = new THREE.Mesh(geo, mat);
      const [x, y, z] = data.pos;
      mesh.position.set(x, y, z);
      mesh.rotation.y = (Math.random() - 0.5) * 0.6;
      mesh.rotation.z = (Math.random() - 0.5) * 0.15;
      mesh.userData = { idx, swaySeed: swaySeed + idx * 13.7, swayAmp: 0.015 + Math.random() * 0.02 };
      this.scene.add(mesh);
      this.photos.push({ mesh, data });
    });
  }

  _buildWires() {
    const wireMat = new THREE.LineBasicMaterial({ color: 0x303840, transparent: true, opacity: 0.5 });
    for (let i = 0; i < this.photos.length; i++) {
      const p = this.photos[i].mesh.position;
      const pts = [
        new THREE.Vector3(p.x + (Math.random() - 0.5) * 0.3, p.y + 1.4, p.z),
        new THREE.Vector3(p.x + (Math.random() - 0.5) * 0.5, p.y + 2.5 + Math.random(), p.z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const wire = new THREE.Line(geo, wireMat);
      this.scene.add(wire);
    }
  }

  _buildLighting() {
    // Ambient: near zero between flashes
    this.ambient = new THREE.AmbientLight(0x050810, 0.08);
    this.scene.add(this.ambient);

    // Flash key light
    this.flashLight = new THREE.PointLight(0xd8eeff, 0, 12);
    this.flashLight.position.set(0, 1, 1.5);
    this.scene.add(this.flashLight);
  }

  _bindInput() {
    this._kbHandler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.flashCallback) this.flashCallback(0.9);
      }
    };
    this._mdHandler = (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    };
    this._mmHandler = (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.orbit.targetYaw -= dx * 0.004;
        this.orbit.targetPitch = Math.max(-0.5, Math.min(0.5, this.orbit.targetPitch - dy * 0.003));
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    this._muHandler = () => { this.isDragging = false; };
    this._clickHandler = (e) => {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.photos.map(p => p.mesh);
      const hits = this.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.idx;
        if (this.selectedPhoto === idx) {
          // Deselect
          this.selectedPhoto = -1;
        } else {
          this.selectedPhoto = idx;
          if (this.flashCallback) this.flashCallback(0.85);
        }
      } else {
        this.selectedPhoto = -1;
      }
    };
    // Touch support
    this._touchStartHandler = (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    this._touchMoveHandler = (e) => {
      if (this.isDragging && e.touches.length > 0) {
        const dx = e.touches[0].clientX - this.lastMouse.x;
        const dy = e.touches[0].clientY - this.lastMouse.y;
        this.orbit.targetYaw -= dx * 0.004;
        this.orbit.targetPitch = Math.max(-0.5, Math.min(0.5, this.orbit.targetPitch - dy * 0.003));
        this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    this._touchEndHandler = () => { this.isDragging = false; };

    window.addEventListener('keydown', this._kbHandler);
    window.addEventListener('mousedown', this._mdHandler);
    window.addEventListener('mousemove', this._mmHandler);
    window.addEventListener('mouseup', this._muHandler);
    window.addEventListener('click', this._clickHandler);
    window.addEventListener('touchstart', this._touchStartHandler, { passive: true });
    window.addEventListener('touchmove', this._touchMoveHandler, { passive: true });
    window.addEventListener('touchend', this._touchEndHandler, { passive: true });
  }

  dispose() {
    window.removeEventListener('keydown', this._kbHandler);
    window.removeEventListener('mousedown', this._mdHandler);
    window.removeEventListener('mousemove', this._mmHandler);
    window.removeEventListener('mouseup', this._muHandler);
    window.removeEventListener('click', this._clickHandler);
    window.removeEventListener('touchstart', this._touchStartHandler);
    window.removeEventListener('touchmove', this._touchMoveHandler);
    window.removeEventListener('touchend', this._touchEndHandler);
  }

  update(time, delta, scrollProgress, flashIntensity) {
    // Orbit camera smoothly
    this.orbit.yaw += (this.orbit.targetYaw - this.orbit.yaw) * 0.08;
    this.orbit.pitch += (this.orbit.targetPitch - this.orbit.pitch) * 0.08;
    this.camera.rotation.y = this.orbit.yaw;
    this.camera.rotation.x = this.orbit.pitch;

    // Update flash light
    this.flashLight.intensity = flashIntensity * 6.0;
    this.ambient.intensity = 0.08 + flashIntensity * 0.8;

    for (let i = 0; i < this.photos.length; i++) {
      const photo = this.photos[i];
      const mesh = photo.mesh;
      const ud = mesh.userData;
      const isSelected = i === this.selectedPhoto;

      if (isSelected) {
        // Pull to camera
        const targetPos = new THREE.Vector3(0, 0, -1.8);
        mesh.position.lerp(targetPos, 0.06);
        mesh.rotation.y += (0 - mesh.rotation.y) * 0.06;
        mesh.rotation.z += (0 - mesh.rotation.z) * 0.06;
        // Show fully
        mesh.material.emissiveIntensity = 0.6 + flashIntensity * 0.4;
      } else {
        // Return to original position
        const [x, y, z] = PHOTO_DATA[i].pos;
        const targetPos = new THREE.Vector3(x, y, z);
        mesh.position.lerp(targetPos, 0.05);
        // Sway
        mesh.position.y += Math.sin(time * 0.4 + ud.swaySeed) * ud.swayAmp;
        // Only visible during flash or cursor flashlight proximity (handled by shader)
        // Emissive = near 0 between flashes (silhouette), brightens when flash hits
        mesh.material.emissiveIntensity = flashIntensity * 0.7;
      }
    }
  }

  onResize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
