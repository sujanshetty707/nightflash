import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BrokenRobot } from './robotModel.js';
import { SparkSystem } from './sparkSystem.js';
import { DustSystem } from './dustSystem.js';
import { NightflashShader } from '../shaders/postprocessingShader.js';

// ============================================================
// LIGHTING CONSTANTS — tune these for look development
// ============================================================
const BASE_KEY_INTENSITY   = 35;   // SpotLight candela baseline (always on)
const FLASH_KEY_MULT       = 8;    // x baseline during flash peak
const BASE_RIM_A_INTENSITY = 2.5;  // Cyan rim from behind-right
const BASE_RIM_B_INTENSITY = 0.9;  // Cold white rim from behind-left
const BASE_FILL_INTENSITY  = 0.28; // HemisphereLight fill
const BASE_EYE_INTENSITY   = 1.8;  // Eye point light (always on, flickers)
const BASE_BOUNCE_INTENSITY= 0.4;  // Ground bounce
const BASE_EXPOSURE        = 1.1;  // Tone mapping exposure
const FLASH_EXPOSURE_BOOST = 0.7;  // Added during flash peak

export class SceneManager {
  constructor(canvasContainer, soundManager) {
    this.container = canvasContainer;
    this.soundManager = soundManager;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.reducedMotion = false;
    this.reducedFlashing = false;

    // Camera move targets for scroll scrubbing
    this.cameraProgress = 0;
    this.baseCamPos = new THREE.Vector3(0, 0, 5.0);
    this.eyeCloseUpPos = new THREE.Vector3(2.1, 0.15, 1.4);
    this.camShake = new THREE.Vector3();

    // Flash state
    this.flashIntensity = 0.0;
    this.afterimageIntensity = 0.0;
    this.randomFlashTimer = 0;
    this.nextRandomFlash = 6.0 + Math.random() * 5.0;
    this._lastFlashTime = 0;

    // Raycaster for clicking robot
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2(-999, -999);
    this.onRobotClickCallback = null;

    // Debug state
    this.debugLights = false;
    this.debugBrightBoost = false;
    this._lightHelpers = [];

    this.initThree();
    this.initPostProcessing();
    this.initLights();
    this.initFloor();
    this.initBackground();
    this.initSceneObjects();
    this.bindEvents();
    this.onResize(); // apply responsive layout immediately
  }

  // ──────────────────────────────────────────
  // THREE.JS INIT
  // ──────────────────────────────────────────
  initThree() {
    this.scene = new THREE.Scene();

    // Dark blue-gray gradient background (not pure black so robot silhouette reads)
    this.scene.background = new THREE.Color(0x08090d);

    // Camera: cinematic FOV 38
    this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.05, 120);
    this.camera.position.copy(this.baseCamPos);

    // Renderer with correct color management
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    // !! Critical: correct sRGB output !!
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = BASE_EXPOSURE;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Image-based lighting with PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const room = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.35;

    new RGBELoader().load(
      '/hdri/night.hdr',
      (hdrTexture) => {
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
        this.scene.environment = envMap;
        this.scene.environmentIntensity = 0.35;
        hdrTexture.dispose();
      },
      undefined,
      (err) => {
        console.warn('Fallback to procedural room environment:', err);
      }
    );

    this.container.appendChild(this.renderer.domElement);
  }

  // ──────────────────────────────────────────
  // POST-PROCESSING
  // ──────────────────────────────────────────
  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom: high threshold so only the eye, sparks, and tube lights bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.55,  // strength
      0.4,   // radius
      0.78   // threshold
    );
    this.composer.addPass(this.bloomPass);

    // Custom Nightflash CRT+grain+aberration+flashlight pass
    this.nightflashPass = new ShaderPass(NightflashShader);
    this.nightflashPass.renderToScreen = true;
    this.composer.addPass(this.nightflashPass);
  }

  // ──────────────────────────────────────────
  // PHYSICALLY-BASED LIGHT RIG
  // ──────────────────────────────────────────
  initLights() {
    // ── 1. HEMISPHERE fill (sky cold-blue, ground near-black) ──
    this.hemi = new THREE.HemisphereLight(0x1a2733, 0x060608, BASE_FILL_INTENSITY);
    this.scene.add(this.hemi);

    // ── 2. KEY LIGHT: cold-blue SpotLight, front-left high ──
    this.keyLight = new THREE.SpotLight(
      0x9fd8ff,
      BASE_KEY_INTENSITY,
      40,          // distance (m)
      0.5,         // angle (radians)
      0.9,         // penumbra
      1.2          // decay
    );
    this.keyLight.position.set(-3.5, 5.5, 5.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width  = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.bias   = -0.0005;
    this.keyLight.shadow.radius = 2;
    this.scene.add(this.keyLight);

    this.lightTarget = new THREE.Object3D();
    this.lightTarget.position.set(1.9, 0.4, 0.0);
    this.scene.add(this.lightTarget);
    this.keyLight.target = this.lightTarget;

    // Subtle flicker driver
    this._keyFlickerPhase = Math.random() * 100;

    // ── 3. RIM A: cyan from behind-right (edge separation) ──
    this.rimA = new THREE.DirectionalLight(0x7df9ff, BASE_RIM_A_INTENSITY);
    this.rimA.position.set(4.5, 2.0, -4.0);
    this.scene.add(this.rimA);

    // ── 4. RIM B: cold white from behind-left ──
    this.rimB = new THREE.DirectionalLight(0xd0dde8, BASE_RIM_B_INTENSITY);
    this.rimB.position.set(-5.0, 1.5, -3.5);
    this.scene.add(this.rimB);

    // ── 5. FLASHLIGHT 3D cursor point light ──
    this.flashlight3D = new THREE.PointLight(0x9fd8ff, 1.2, 5.5, 1.5);
    this.flashlight3D.position.set(0, 0, 3.5);
    this.scene.add(this.flashlight3D);

    // ── 6. GROUND BOUNCE: very dim warm-gray from below ──
    this.groundBounce = new THREE.PointLight(0x303540, BASE_BOUNCE_INTENSITY, 6.0, 2.0);
    this.groundBounce.position.set(1.8, -2.2, 0.5);
    this.scene.add(this.groundBounce);

    // ── 7. EYE LIGHT: set here as a baseline; robotModel owns its own
    //    eye PointLight (liveEyeLight) which is added to the head.
    //    This second light fills the chest & face even without flash.
    this.eyeFillLight = new THREE.PointLight(0x7df9ff, 0.6, 3.5, 2.0);
    this.eyeFillLight.position.set(2.1, 0.8, 1.8);
    this.scene.add(this.eyeFillLight);

    // ── 8. FLASH FILL: large point for the whiteout burst ──
    this.flashFillLight = new THREE.PointLight(0xd8eeff, 0.0, 30, 1.0);
    this.flashFillLight.position.set(0, 3, 3);
    this.scene.add(this.flashFillLight);
  }

  // ──────────────────────────────────────────
  // WET CONCRETE FLOOR
  // ──────────────────────────────────────────
  initFloor() {
    // Generate roughness + normal maps procedurally
    const sz = 512;
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = roughCanvas.height = sz;
    const rCtx = roughCanvas.getContext('2d');
    rCtx.fillStyle = '#606060';
    rCtx.fillRect(0, 0, sz, sz);
    for (let i = 0; i < 200; i++) {
      rCtx.strokeStyle = `rgba(${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},0.04)`;
      rCtx.lineWidth = 1 + Math.random();
      rCtx.beginPath();
      rCtx.moveTo(Math.random()*sz, Math.random()*sz);
      rCtx.lineTo(Math.random()*sz, Math.random()*sz);
      rCtx.stroke();
    }
    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.repeat.set(6, 6);

    // Tile crack normal map
    const normCanvas = document.createElement('canvas');
    normCanvas.width = normCanvas.height = sz;
    const nCtx = normCanvas.getContext('2d');
    nCtx.fillStyle = '#8080ff'; // flat normal
    nCtx.fillRect(0, 0, sz, sz);
    for (let i = 0; i < 12; i++) {
      const x1 = Math.random()*sz, y1 = Math.random()*sz;
      const x2 = x1+(Math.random()-0.5)*200, y2 = y1+(Math.random()-0.5)*200;
      nCtx.strokeStyle = 'rgba(40,40,200,0.6)';
      nCtx.lineWidth = 2;
      nCtx.beginPath(); nCtx.moveTo(x1,y1); nCtx.lineTo(x2,y2); nCtx.stroke();
    }
    const normTex = new THREE.CanvasTexture(normCanvas);
    normTex.wrapS = normTex.wrapT = THREE.RepeatWrapping;
    normTex.repeat.set(6, 6);

    // Albedo: very dark concrete
    const albCanvas = document.createElement('canvas');
    albCanvas.width = albCanvas.height = sz;
    const aCtx = albCanvas.getContext('2d');
    aCtx.fillStyle = '#0e1014';
    aCtx.fillRect(0, 0, sz, sz);
    for (let i = 0; i < 2000; i++) {
      const v = Math.random() * 12;
      aCtx.fillStyle = `rgb(${v},${v},${v+2})`;
      aCtx.fillRect(Math.random()*sz, Math.random()*sz, 2, 2);
    }
    // Tile grout lines
    aCtx.strokeStyle = 'rgba(0,0,0,0.55)'; aCtx.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      aCtx.beginPath(); aCtx.moveTo(i*sz/8,0); aCtx.lineTo(i*sz/8,sz); aCtx.stroke();
      aCtx.beginPath(); aCtx.moveTo(0,i*sz/8); aCtx.lineTo(sz,i*sz/8); aCtx.stroke();
    }
    // Wet puddle patches
    const pg = aCtx.createRadialGradient(sz*0.5,sz*0.6,0,sz*0.5,sz*0.6,sz*0.3);
    pg.addColorStop(0,'rgba(125,249,255,0.05)'); pg.addColorStop(1,'rgba(0,0,0,0)');
    aCtx.fillStyle = pg; aCtx.fillRect(0,0,sz,sz);
    const albTex = new THREE.CanvasTexture(albCanvas);
    albTex.wrapS = albTex.wrapT = THREE.RepeatWrapping;
    albTex.repeat.set(6, 6);

    const floorMat = new THREE.MeshStandardMaterial({
      map: albTex,
      normalMap: normTex,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: roughTex,
      roughness: 0.25,
      metalness: 0.35,
      color: 0x12141a,
      envMapIntensity: 0.4,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(1.0, -1.6, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floorMesh = floor;

    // Contact shadow disc under robot
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    const sg = sCtx.createRadialGradient(128,128,0,128,128,128);
    sg.addColorStop(0,'rgba(0,0,0,0.85)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    sCtx.fillStyle = sg; sCtx.fillRect(0,0,256,256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 3.5),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.65 })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(1.9, -1.595, 0.0);
    this.scene.add(contactShadow);
    this.contactShadow = contactShadow;
  }

  // ──────────────────────────────────────────
  // SCENE BACKGROUND — faint volumetric haze plane
  // ──────────────────────────────────────────
  initBackground() {
    // A large dark-gradient back wall so the robot reads off background
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 4; bgCanvas.height = 512;
    const bCtx = bgCanvas.getContext('2d');
    const bgGrad = bCtx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0,   '#0d1018');
    bgGrad.addColorStop(0.5, '#080b10');
    bgGrad.addColorStop(1,   '#050508');
    bCtx.fillStyle = bgGrad; bCtx.fillRect(0, 0, 4, 512);
    const bgTex = new THREE.CanvasTexture(bgCanvas);
    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 20),
      new THREE.MeshBasicMaterial({ map: bgTex, depthWrite: false })
    );
    bgPlane.position.set(0, 3, -12);
    this.scene.add(bgPlane);

    // Very faint dust-haze: large sphere with inside-facing additive material
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0x0a1520,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const haze = new THREE.Mesh(new THREE.SphereGeometry(55, 16, 8), hazeMat);
    this.scene.add(haze);
  }

  // ──────────────────────────────────────────
  // SCENE OBJECTS
  // ──────────────────────────────────────────
  initSceneObjects() {
    this.robot = new BrokenRobot();
    this.scene.add(this.robot.group);

    this.sparks = new SparkSystem(this.scene);
    this.dust   = new DustSystem(this.scene);
  }

  // ──────────────────────────────────────────
  // EVENTS
  // ──────────────────────────────────────────
  bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Click robot
    window.addEventListener('click', (e) => {
      this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.robot.group.children, true);
      if (hits.length > 0) {
        this.triggerFlash(1.0, true);
        this.robot.triggerRobotClick();
        const neckWorld = new THREE.Vector3();
        this.robot.neckGroup.getWorldPosition(neckWorld);
        this.sparks.triggerBurst(neckWorld, 45, () => {
          if (this.soundManager) this.soundManager.playSpark();
        });
        if (this.onRobotClickCallback) this.onRobotClickCallback();
      }
    });

    // Debug key: L = toggle light helpers, B = brightness boost
    window.addEventListener('keydown', (e) => {
      if (e.key === 'l' || e.key === 'L') {
        this.debugLights = !this.debugLights;
        this._toggleLightHelpers();
      }
      if (e.key === 'b' || e.key === 'B') {
        this.debugBrightBoost = !this.debugBrightBoost;
        console.log('[NIGHTFLASH] Brightness boost:', this.debugBrightBoost);
      }
    });

    document.addEventListener('visibilitychange', () => {
      this.isTabHidden = document.hidden;
    });
  }

  _toggleLightHelpers() {
    if (this._lightHelpers.length > 0) {
      this._lightHelpers.forEach(h => this.scene.remove(h));
      this._lightHelpers = [];
    } else {
      [this.keyLight, this.rimA, this.rimB, this.groundBounce].forEach(l => {
        const h = l.isDirectionalLight
          ? new THREE.DirectionalLightHelper(l, 0.8)
          : new THREE.SpotLightHelper(l);
        this.scene.add(h);
        this._lightHelpers.push(h);
      });
    }
  }

  // ──────────────────────────────────────────
  // RESIZE
  // ──────────────────────────────────────────
  onResize() {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);

    if (this.nightflashPass) {
      this.nightflashPass.uniforms.uResolution.value.set(this.width, this.height);
    }

    // Responsive robot placement
    if (this.width < 768) {
      this.robot.group.position.set(0.6, -1.2, -0.6);
      this.robot.group.scale.set(0.9, 0.9, 0.9);
      this.eyeCloseUpPos.set(0.8, -0.7, 1.2);
      this.contactShadow?.position.set(0.6, -1.595, -0.6);
    } else if (this.width < 1100) {
      this.robot.group.position.set(1.4, -0.35, -0.3);
      this.robot.group.scale.set(1.0, 1.0, 1.0);
      this.eyeCloseUpPos.set(1.6, 0.1, 1.3);
      this.contactShadow?.position.set(1.4, -1.595, -0.3);
    } else {
      this.robot.group.position.set(1.9, -0.3, -0.2);
      this.robot.group.scale.set(1.15, 1.15, 1.15);
      this.eyeCloseUpPos.set(2.1, 0.15, 1.4);
      this.contactShadow?.position.set(1.9, -1.595, -0.2);
    }
  }

  // ──────────────────────────────────────────
  // FLASH
  // ──────────────────────────────────────────
  triggerFlash(intensity = 1.0, isBig = false) {
    // Rate limit: max 3/s
    const now = performance.now();
    if (now - this._lastFlashTime < 333) return;
    this._lastFlashTime = now;

    if (this.reducedFlashing) {
      this.flashIntensity = 0.18;
      this.afterimageIntensity = 0.0;
    } else {
      this.flashIntensity = Math.min(1.0, intensity * 0.92);
      this.afterimageIntensity = 0.85;
      setTimeout(() => {
        if (!this.reducedFlashing) {
          this.flashIntensity = Math.max(this.flashIntensity, 0.45 * intensity);
        }
      }, 120);
    }

    if (this.soundManager) this.soundManager.playFlash(intensity);
  }

  setScrollProgress(p) { this.cameraProgress = p; }

  // ──────────────────────────────────────────
  // MAIN UPDATE LOOP
  // ──────────────────────────────────────────
  update(time, delta, cursorState) {
    if (this.isTabHidden) return;

    // ── Random ambient flashes ──
    this.randomFlashTimer += delta;
    if (this.randomFlashTimer >= this.nextRandomFlash) {
      this.randomFlashTimer = 0;
      this.nextRandomFlash = 5.0 + Math.random() * 6.0;
      this.triggerFlash(0.65 + Math.random() * 0.25);
    }

    // ── Decay flash ──
    if (this.flashIntensity > 0) this.flashIntensity = Math.max(0, this.flashIntensity - delta * 2.8);
    if (this.afterimageIntensity > 0) this.afterimageIntensity = Math.max(0, this.afterimageIntensity - delta * 1.2);

    // ── Debug brightness boost ──
    const boostMult = this.debugBrightBoost ? 2.0 : 1.0;

    // ── KEY LIGHT: baseline always on + subtle flicker + flash spike ──
    this._keyFlickerPhase += delta * 3.2;
    const keyFlicker = 1.0 + Math.sin(this._keyFlickerPhase * 7.3) * 0.04 + Math.sin(this._keyFlickerPhase * 21.7) * 0.03;
    const keyFlashBoost = this.flashIntensity * BASE_KEY_INTENSITY * (FLASH_KEY_MULT - 1);
    this.keyLight.intensity = (BASE_KEY_INTENSITY * keyFlicker + keyFlashBoost) * boostMult;

    // ── FLASH FILL LIGHT spikes ──
    this.flashFillLight.intensity = this.flashIntensity * 18.0;

    // ── EXPOSURE bumps slightly during flash ──
    this.renderer.toneMappingExposure = BASE_EXPOSURE + this.flashIntensity * FLASH_EXPOSURE_BOOST;

    // ── Flashlight 3D cursor tracking ──
    if (cursorState) {
      const vec = new THREE.Vector3(
        (cursorState.screenX / this.width) * 2 - 1,
        -(cursorState.screenY / this.height) * 2 + 1,
        0.5
      );
      vec.unproject(this.camera);
      const dir = vec.sub(this.camera.position).normalize();
      const targetPos = this.camera.position.clone().add(dir.multiplyScalar(4.0));
      this.flashlight3D.position.lerp(targetPos, 0.12);
    }

    // ── Camera: handheld shake + scroll dolly ──
    if (!this.reducedMotion) {
      const st = time * 2.4;
      this.camShake.set(
        (Math.sin(st * 1.7) + Math.cos(st * 3.1)) * 0.012,
        (Math.cos(st * 2.1) + Math.sin(st * 4.3)) * 0.012,
        Math.sin(st * 1.3) * 0.008
      );
    } else {
      this.camShake.set(0, 0, 0);
    }

    const targetCam = this.baseCamPos.clone().lerp(this.eyeCloseUpPos, this.cameraProgress);
    this.camera.position.copy(targetCam).add(this.camShake);

    const heroLookAt = new THREE.Vector3(0.8, -0.1, 0);
    const eyeLookAt  = new THREE.Vector3(
      this.robot.group.position.x + 0.22,
      this.robot.group.position.y + 0.74,
      this.robot.group.position.z + 0.54
    );
    const lookAt = heroLookAt.clone().lerp(eyeLookAt, Math.pow(this.cameraProgress, 1.4));
    this.camera.lookAt(lookAt);

    if (!this.reducedMotion) {
      this.camera.rotation.z = Math.sin(time * 0.8) * 0.01 + this.cameraProgress * 0.04;
    }

    // ── Update sub-systems ──
    const normX = cursorState ? (cursorState.screenX / this.width)  * 2 - 1 : 0;
    const normY = cursorState ? -(cursorState.screenY / this.height) * 2 + 1 : 0;
    this.robot.update(time, delta, normX, normY, this.reducedMotion);

    const neckWorldPos = new THREE.Vector3();
    this.robot.neckGroup.getWorldPosition(neckWorldPos);
    this.sparks.update(delta, neckWorldPos, () => {
      if (this.soundManager) this.soundManager.playSpark();
    }, this.reducedMotion);

    this.dust.update(delta, time, this.flashIntensity, this.flashlight3D.position);

    // ── Post-processing uniforms ──
    if (this.nightflashPass) {
      const u = this.nightflashPass.uniforms;
      u.uTime.value = time;
      u.uSteppedTime.value = Math.floor(time * 24.0) / 24.0;
      u.uFlashIntensity.value = this.flashIntensity;
      u.uAfterimageIntensity.value = this.afterimageIntensity;
      u.uReducedMotion.value = this.reducedMotion ? 1.0 : 0.0;
      if (cursorState) {
        u.uCursor.value.set(cursorState.normX, cursorState.normY);
        u.uFlashlightRadius.value = cursorState.radiusNorm;
      }
    }

    this.composer.render();
  }
}
