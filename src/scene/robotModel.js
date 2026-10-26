import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  createScratchedMetalRoughnessMap,
  createArmorNormalMap,
  createSerialDecalTexture,
  createCircuitBoardTexture,
  createCrackedGlassTexture
} from './proceduralTextures.js';

export class BrokenRobot {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'broken_robot_unit07';

    // Tracking & Animation state
    this.mouseTarget = { x: 0, y: 0 };
    this.currentLook = { x: 0, y: 0 };
    this.lastMouseMoveTime = performance.now();
    this.isStaringAtCamera = false;
    this.loseTrackingTimer = 0;
    this.twitchTimer = 0;
    this.oilDripTimer = 0;
    this.chestPulseTimer = 0;
    this.eyeColorState = 'cyan'; // 'cyan' or 'red'
    this.eyeFlickerTimer = 0;
    this.isRedOverride = false;

    // References to animated sub-components
    this.headGroup = null;
    this.neckGroup = null;
    this.torsoGroup = null;
    this.leftArmGroup = null;
    this.rightArmGroup = null;
    this.rightFingers = [];
    this.liveEyeMesh = null;
    this.liveIrisRing = null;
    this.liveEyeLight = null;
    this.chestLight = null;
    this.oilDrops = [];

    this.initModel();
  }

  initModel() {
    // Generate Procedural PBR Textures
    const roughnessMap = createScratchedMetalRoughnessMap();
    const normalMap = createArmorNormalMap();
    const serialTexture = createSerialDecalTexture();
    const circuitTexture = createCircuitBoardTexture();
    const crackedGlassTexture = createCrackedGlassTexture();

    // Reusable Materials - Upgraded to Physical PBR with clearcoat & transmission
    const darkChassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x141517,
      metalness: 0.92,
      roughness: 0.42,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      roughnessMap: roughnessMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      envMapIntensity: 0.8
    });

    const weatheredArmorMat = new THREE.MeshPhysicalMaterial({
      color: 0x24282c,
      metalness: 0.88,
      roughness: 0.48,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      roughnessMap: roughnessMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      envMapIntensity: 0.9
    });

    const chromePistonMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8d0d5,
      metalness: 0.98,
      roughness: 0.22,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      roughnessMap: roughnessMap,
      envMapIntensity: 1.1
    });

    const copperCoilMat = new THREE.MeshPhysicalMaterial({
      color: 0xb87333,
      metalness: 0.85,
      roughness: 0.35,
      clearcoat: 0.2,
      envMapIntensity: 0.8
    });

    const rubberCableMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      metalness: 0.1,
      roughness: 0.85
    });

    const redCableMat = new THREE.MeshStandardMaterial({
      color: 0x8a1515,
      metalness: 0.2,
      roughness: 0.7
    });

    const cyanCableMat = new THREE.MeshStandardMaterial({
      color: 0x156570,
      metalness: 0.2,
      roughness: 0.7
    });

    const circuitMat = new THREE.MeshStandardMaterial({
      map: circuitTexture,
      roughness: 0.6,
      metalness: 0.4
    });

    // Emissive Live Eye Material
    this.liveEyeMat = new THREE.MeshBasicMaterial({
      color: 0x7df9ff
    });

    // Segmented cyan aperture ring material
    this.irisMat = new THREE.MeshBasicMaterial({
      color: 0x7df9ff,
      wireframe: true
    });

    // Dead eye cracked material with transmission & IOR
    const deadEyeMat = new THREE.MeshPhysicalMaterial({
      map: crackedGlassTexture,
      color: 0x1a2024,
      transmission: 0.65,
      ior: 1.52,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 0.9
    });

    // ==========================================
    // 1. TORSO & INTERNAL SKELETON
    // ==========================================
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0, 0);

    // Spine Column (Segmented vertebrae)
    const spineGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const vertebra = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35 - i * 0.03, 0.4 - i * 0.03, 0.22, 8),
        darkChassisMat
      );
      vertebra.position.set(0, -0.6 + i * 0.32, -0.1);
      vertebra.castShadow = true;
      spineGroup.add(vertebra);

      // Vertebra joint disc
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12),
        copperCoilMat
      );
      disc.position.set(0, -0.48 + i * 0.32, -0.1);
      spineGroup.add(disc);
    }
    this.torsoGroup.add(spineGroup);

    // Heavy Lower Pelvis / Frame Mount
    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 1.1),
      weatheredArmorMat
    );
    pelvis.position.set(0, -0.85, 0);
    pelvis.castShadow = true;
    this.torsoGroup.add(pelvis);

    // Inner Torso Frame (Rib Cage)
    const ribGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      // Steel rib bars wrapping around
      const ribL = new THREE.Mesh(
        new THREE.TorusGeometry(0.7 - i * 0.04, 0.04, 6, 12, Math.PI * 0.65),
        darkChassisMat
      );
      ribL.rotation.set(0, -0.3, Math.PI * 0.7);
      ribL.position.set(-0.25, -0.3 + i * 0.25, 0.05);
      ribGroup.add(ribL);

      const ribR = new THREE.Mesh(
        new THREE.TorusGeometry(0.7 - i * 0.04, 0.04, 6, 12, Math.PI * 0.65),
        darkChassisMat
      );
      ribR.rotation.set(0, 0.3, -Math.PI * 0.7);
      ribR.position.set(0.25, -0.3 + i * 0.25, 0.05);
      ribGroup.add(ribR);
    }
    this.torsoGroup.add(ribGroup);

    // Internal Exposed Pistons & Power Core
    const centralPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12),
      chromePistonMat
    );
    centralPiston.position.set(0.1, -0.15, -0.05);
    this.torsoGroup.add(centralPiston);

    const pistonSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12),
      darkChassisMat
    );
    pistonSleeve.position.set(0.1, -0.35, -0.05);
    this.torsoGroup.add(pistonSleeve);

    // Exposed circuit board inside breached chest (left side)
    const chestCircuit = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.75),
      circuitMat
    );
    chestCircuit.position.set(-0.35, -0.05, 0.28);
    chestCircuit.rotation.set(0.1, 0.35, -0.15);
    this.torsoGroup.add(chestCircuit);

    // Right Chest Armor Plate (Intact with Serial Decal)
    const rightChestArmor = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.95, 0.14),
      weatheredArmorMat
    );
    rightChestArmor.position.set(0.42, -0.02, 0.42);
    rightChestArmor.rotation.set(-0.08, -0.15, 0.04);
    rightChestArmor.castShadow = true;
    this.torsoGroup.add(rightChestArmor);

    // Serial Decal Plate "UNIT 07 // CARE SERIES" on right chest
    const serialPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.22),
      new THREE.MeshStandardMaterial({
        map: serialTexture,
        roughness: 0.6,
        metalness: 0.3,
        transparent: true
      })
    );
    serialPlate.position.set(0.42, 0.12, 0.5);
    serialPlate.rotation.set(-0.08, -0.15, 0.04);
    this.torsoGroup.add(serialPlate);

    // Hex Bolts on right chest armor
    for (let bx = -0.32; bx <= 0.32; bx += 0.64) {
      for (let by = -0.38; by <= 0.38; by += 0.76) {
        const bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.04, 6),
          chromePistonMat
        );
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(0.42 + bx, -0.02 + by, 0.5);
        this.torsoGroup.add(bolt);
      }
    }

    // Torn / Ripped Jagged Chest Armor Edge on the left
    const jaggedArmor = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.95, 0.12),
      darkChassisMat
    );
    jaggedArmor.position.set(-0.68, -0.02, 0.36);
    jaggedArmor.rotation.set(-0.06, 0.2, -0.1);
    this.torsoGroup.add(jaggedArmor);

    // Severed Wires inside the breached chest cavity
    const wireCurves = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.2, 0.25, 0.2),
        new THREE.Vector3(-0.35, 0.05, 0.38),
        new THREE.Vector3(-0.45, -0.25, 0.35),
        new THREE.Vector3(-0.4, -0.45, 0.2)
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.1, 0.15, 0.15),
        new THREE.Vector3(-0.25, -0.1, 0.32),
        new THREE.Vector3(-0.15, -0.35, 0.3)
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.05, 0.3, 0.1),
        new THREE.Vector3(-0.15, 0.1, 0.35),
        new THREE.Vector3(-0.32, -0.15, 0.42)
      ])
    ];

    const wireMats = [redCableMat, cyanCableMat, copperCoilMat];
    wireCurves.forEach((curve, idx) => {
      const wireGeo = new THREE.TubeGeometry(curve, 20, 0.016, 6, false);
      const wireMesh = new THREE.Mesh(wireGeo, wireMats[idx]);
      this.torsoGroup.add(wireMesh);
    });

    // Deep Chest Cavity Pulsing Red Light
    this.chestLight = new THREE.PointLight(0xff2a2a, 0.0, 3.5);
    this.chestLight.position.set(-0.25, -0.05, 0.2);
    this.torsoGroup.add(this.chestLight);

    // ==========================================
    // 2. NECK (Tilted, Loose, Severed Sparking Cables)
    // ==========================================
    this.neckGroup = new THREE.Group();
    // Neck base at top of torso (y = 0.52)
    this.neckGroup.position.set(0, 0.52, -0.02);
    // Tilted ~12 degrees (0.21 rad) as if motor is failing
    this.neckGroup.rotation.set(0.05, -0.04, -0.21);

    // Cervical Collar Ring
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.08, 8, 16),
      darkChassisMat
    );
    collar.rotation.x = Math.PI / 2;
    this.neckGroup.add(collar);

    // Heavy Neck Ball-Joint
    const neckJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      chromePistonMat
    );
    neckJoint.position.set(0, 0.12, 0);
    this.neckGroup.add(neckJoint);

    // Twin Neck Actuators
    const neckActL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.32, 8),
      chromePistonMat
    );
    neckActL.position.set(-0.15, 0.12, -0.06);
    this.neckGroup.add(neckActL);

    const neckActR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8),
      chromePistonMat
    );
    neckActR.position.set(0.14, 0.1, -0.06);
    this.neckGroup.add(neckActR);

    // Hanging Severed Sparking Cables from Neck
    const neckWireCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.1, 0.08),
      new THREE.Vector3(-0.22, 0.0, 0.16),
      new THREE.Vector3(-0.28, -0.18, 0.24)
    ]);
    const neckWire1 = new THREE.Mesh(
      new THREE.TubeGeometry(neckWireCurve1, 16, 0.018, 6, false),
      redCableMat
    );
    this.neckGroup.add(neckWire1);

    const neckWireCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.12, 0.1),
      new THREE.Vector3(-0.12, -0.05, 0.22),
      new THREE.Vector3(-0.18, -0.22, 0.28)
    ]);
    const neckWire2 = new THREE.Mesh(
      new THREE.TubeGeometry(neckWireCurve2, 16, 0.015, 6, false),
      copperCoilMat
    );
    this.neckGroup.add(neckWire2);

    // Frayed copper wire brush tips (spark emitter point)
    this.sparkOrigin = new THREE.Vector3(-0.28, -0.18, 0.24);

    // ==========================================
    // 3. HEAD & FACEPLATE (Boxy-Rounded, Damaged Skull)
    // ==========================================
    this.headGroup = new THREE.Group();
    // Head positioned atop neck ball joint
    this.headGroup.position.set(0, 0.26, 0);

    // Main Skull Housing
    const skullHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.88, 0.92),
      darkChassisMat
    );
    skullHousing.position.set(0, 0.28, -0.06);
    skullHousing.castShadow = true;
    this.headGroup.add(skullHousing);

    // Right Faceplate Half (Intact, Brushed Weathered Metal)
    const rightFaceplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.84, 0.16),
      weatheredArmorMat
    );
    rightFaceplate.position.set(0.24, 0.28, 0.42);
    rightFaceplate.rotation.set(-0.04, -0.08, 0);
    rightFaceplate.castShadow = true;
    this.headGroup.add(rightFaceplate);

    // Faceplate Perimeter Bolts
    for (let by = -0.32; by <= 0.32; by += 0.32) {
      const fb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.04, 6),
        chromePistonMat
      );
      fb.rotation.x = Math.PI / 2;
      fb.position.set(0.44, 0.28 + by, 0.51);
      this.headGroup.add(fb);
    }

    // Left Skull Breach: Inner Circuit Board & Optical Array
    const skullCircuit = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.76),
      circuitMat
    );
    skullCircuit.position.set(-0.24, 0.28, 0.34);
    skullCircuit.rotation.set(0.04, 0.15, -0.06);
    this.headGroup.add(skullCircuit);

    // Left Skull Cracked Framing Edge
    const crackedRim = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.8, 0.18),
      darkChassisMat
    );
    crackedRim.position.set(-0.44, 0.28, 0.38);
    this.headGroup.add(crackedRim);

    // ------------------------------------------
    // PHOTOREALISTIC GLB CYBERNETIC HEAD / HELMET
    // ------------------------------------------
    this.glbHeadModel = null;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/robot.glb',
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const oldMat = child.material;
              const phys = new THREE.MeshPhysicalMaterial({
                map: oldMat.map || null,
                normalMap: oldMat.normalMap || null,
                normalScale: new THREE.Vector2(1.2, 1.2),
                roughnessMap: oldMat.roughnessMap || null,
                metalnessMap: oldMat.metalnessMap || null,
                aoMap: oldMat.aoMap || null,
                aoMapIntensity: 1.3,
                roughness: oldMat.roughness ?? 0.45,
                metalness: oldMat.metalness ?? 0.9,
                clearcoat: 0.3,
                clearcoatRoughness: 0.4,
                envMapIntensity: 0.8
              });
              child.material = phys;
            }
          }
        });

        // DamagedHelmet alignment atop neck joint
        model.scale.set(0.68, 0.68, 0.68);
        model.position.set(0.04, 0.28, 0.08);
        this.headGroup.add(model);
        this.glbHeadModel = model;

        // Hide primitive box geometry once GLB has loaded
        skullHousing.visible = false;
        rightFaceplate.visible = false;
        skullCircuit.visible = false;
        crackedRim.visible = false;
      },
      undefined,
      (err) => {
        console.warn('GLB load fallback to procedural skull:', err);
      }
    );

    // ------------------------------------------
    // RIGHT EYE: ALIVE (Cold Cyan, Segmented Aperture, Flickering)
    // ------------------------------------------
    const rightEyeSocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.14, 16),
      darkChassisMat
    );
    rightEyeSocket.rotation.x = Math.PI / 2;
    rightEyeSocket.position.set(0.22, 0.34, 0.48);
    this.headGroup.add(rightEyeSocket);

    // Live Eye Emissive Core
    this.liveEyeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      this.liveEyeMat
    );
    this.liveEyeMesh.position.set(0.22, 0.34, 0.54);
    this.headGroup.add(this.liveEyeMesh);

    // Segmented Cyan Aperture Ring
    this.liveIrisRing = new THREE.Mesh(
      new THREE.RingGeometry(0.095, 0.125, 12),
      this.irisMat
    );
    this.liveIrisRing.position.set(0.22, 0.34, 0.55);
    this.headGroup.add(this.liveIrisRing);

    // Cyan Eye Point Light (High intensity, casts onto face and environment)
    this.liveEyeLight = new THREE.PointLight(0x7df9ff, 1.8, 4.5);
    this.liveEyeLight.position.set(0.22, 0.34, 0.65);
    this.headGroup.add(this.liveEyeLight);

    // ------------------------------------------
    // LEFT EYE: DEAD (Cracked Glass, Darkened Socket)
    // ------------------------------------------
    const leftEyeSocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.17, 0.12, 16),
      darkChassisMat
    );
    leftEyeSocket.rotation.x = Math.PI / 2;
    leftEyeSocket.position.set(-0.22, 0.34, 0.38);
    this.headGroup.add(leftEyeSocket);

    const deadEyeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 12),
      deadEyeMat
    );
    deadEyeMesh.position.set(-0.22, 0.34, 0.42);
    this.headGroup.add(deadEyeMesh);

    // Broken Sensor Mast / Antenna on right crown
    const antennaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 0.12, 8),
      darkChassisMat
    );
    antennaBase.position.set(0.38, 0.74, -0.05);
    this.headGroup.add(antennaBase);

    const antennaMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6),
      chromePistonMat
    );
    antennaMast.position.set(0.44, 0.94, -0.08);
    antennaMast.rotation.set(-0.15, 0, -0.32); // Bent outward
    this.headGroup.add(antennaMast);

    // Ear Acoustic Transducers
    const earR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12),
      darkChassisMat
    );
    earR.rotation.z = Math.PI / 2;
    earR.position.set(0.52, 0.28, -0.06);
    this.headGroup.add(earR);

    const earL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12),
      darkChassisMat
    );
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.5, 0.28, -0.06);
    this.headGroup.add(earL);

    this.neckGroup.add(this.headGroup);
    this.torsoGroup.add(this.neckGroup);

    // ==========================================
    // 4. LEFT ARM (Slumped, Limp, Torn Hydraulic Hoses Dripping Oil)
    // ==========================================
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.95, 0.32, 0);

    // Shoulder Pauldron / Ball Mount
    const leftShoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      darkChassisMat
    );
    this.leftArmGroup.add(leftShoulder);

    // Upper Arm (Hanging limp, angled slightly outward)
    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.85, 10),
      weatheredArmorMat
    );
    leftUpperArm.position.set(-0.1, -0.45, 0.05);
    leftUpperArm.rotation.set(0.08, 0, 0.15);
    leftUpperArm.castShadow = true;
    this.leftArmGroup.add(leftUpperArm);

    // Elbow Joint
    const leftElbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 10),
      chromePistonMat
    );
    leftElbow.position.set(-0.18, -0.88, 0.1);
    this.leftArmGroup.add(leftElbow);

    // Severed Forearm Stump
    const leftForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.08, 0.55, 8),
      darkChassisMat
    );
    leftForearm.position.set(-0.22, -1.18, 0.14);
    leftForearm.rotation.set(0.12, 0, 0.08);
    this.leftArmGroup.add(leftForearm);

    // 3 Torn Hydraulic Hoses terminating in dripping nozzles
    const hosePoints = [
      new THREE.Vector3(-0.26, -1.45, 0.12),
      new THREE.Vector3(-0.2, -1.48, 0.16),
      new THREE.Vector3(-0.18, -1.44, 0.1)
    ];

    hosePoints.forEach((hp, idx) => {
      const hoseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.016, 0.18, 6),
        rubberCableMat
      );
      hoseMesh.position.copy(hp);
      hoseMesh.rotation.z = 0.1 * (idx - 1);
      this.leftArmGroup.add(hoseMesh);
    });

    // Dark Viscous Oil Droplet Pool (Falling drops)
    const oilMat = new THREE.MeshStandardMaterial({
      color: 0x050607,
      metalness: 0.9,
      roughness: 0.08
    });

    for (let i = 0; i < 4; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 6, 6),
        oilMat
      );
      drop.scale.set(0.8, 1.4, 0.8);
      drop.position.set(-0.22, -1.5 - i * 0.4, 0.14);
      drop.visible = true;
      this.leftArmGroup.add(drop);
      this.oilDrops.push({
        mesh: drop,
        originY: -1.5,
        speed: 0.025 + i * 0.008,
        y: -1.5 - i * 0.4
      });
    }

    this.torsoGroup.add(this.leftArmGroup);

    // ==========================================
    // 5. RIGHT ARM (Raised Halfway, Actuator, Twitching Fingers)
    // ==========================================
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.95, 0.32, 0);

    // Shoulder Pauldron with armor plate
    const rightShoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      darkChassisMat
    );
    this.rightArmGroup.add(rightShoulder);

    const rightShoulderPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.22, 0.4),
      weatheredArmorMat
    );
    rightShoulderPlate.position.set(0.06, 0.12, 0);
    rightShoulderPlate.rotation.z = -0.15;
    this.rightArmGroup.add(rightShoulderPlate);

    // Upper Arm angled forward-upward
    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.85, 10),
      weatheredArmorMat
    );
    rightUpperArm.position.set(0.18, -0.38, 0.25);
    rightUpperArm.rotation.set(-0.6, 0.2, -0.3);
    this.rightArmGroup.add(rightUpperArm);

    // Right Forearm Pivot (Elbow)
    this.rightForearmGroup = new THREE.Group();
    this.rightForearmGroup.position.set(0.32, -0.68, 0.55);
    this.rightForearmGroup.rotation.set(-0.4, -0.3, 0.2);

    const rightForearmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.72, 0.2),
      darkChassisMat
    );
    rightForearmMesh.position.set(0, -0.32, 0);
    this.rightForearmGroup.add(rightForearmMesh);

    // Hydraulic Forearm Cylinder
    const armCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8),
      chromePistonMat
    );
    armCylinder.position.set(0.08, -0.3, 0.12);
    this.rightForearmGroup.add(armCylinder);

    // Wrist & Hand Claw
    const wrist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8),
      chromePistonMat
    );
    wrist.position.set(0, -0.72, 0);
    this.rightForearmGroup.add(wrist);

    // 4 Jointed Fingers (Twitching unevenly)
    for (let f = 0; f < 4; f++) {
      const fingerGroup = new THREE.Group();
      const angle = (f / 3) * Math.PI * 0.7 - Math.PI * 0.35;
      fingerGroup.position.set(Math.sin(angle) * 0.07, -0.82, Math.cos(angle) * 0.07);

      const phalanx1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.14, 0.024),
        darkChassisMat
      );
      phalanx1.position.y = -0.07;
      fingerGroup.add(phalanx1);

      const phalanx2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.12, 0.02),
        chromePistonMat
      );
      phalanx2.position.set(0, -0.18, 0.02);
      phalanx2.rotation.x = 0.4;
      fingerGroup.add(phalanx2);

      this.rightForearmGroup.add(fingerGroup);
      this.rightFingers.push({
        group: fingerGroup,
        baseAngle: angle,
        twitchSpeed: 3 + f * 1.5,
        offset: f * 1.2
      });
    }

    this.rightArmGroup.add(this.rightForearmGroup);
    this.torsoGroup.add(this.rightArmGroup);

    // Add Torso to Main Group
    this.group.add(this.torsoGroup);

    // Position entire robot according to spec:
    // "Placement: right 45 to 50% of the viewport, slightly cropped by the right edge, torso at ~60% height. It must never be centered."
    this.group.position.set(1.9, -0.3, -0.2);
    // Slumped, leaning posture
    this.group.rotation.set(0.08, -0.42, 0.06);
    this.group.scale.set(1.15, 1.15, 1.15);
  }

  // Update loop called every frame
  update(time, delta, cursorX, cursorY, reducedMotion = false) {
    // 1. Mouse movement tracking for eerie 20s idle camera stare
    const distMoved = Math.hypot(cursorX - this.mouseTarget.x, cursorY - this.mouseTarget.y);
    if (distMoved > 0.005) {
      this.lastMouseMoveTime = performance.now();
      this.isStaringAtCamera = false;
      this.mouseTarget.x = cursorX;
      this.mouseTarget.y = cursorY;
    }

    const idleTime = performance.now() - this.lastMouseMoveTime;
    if (idleTime > 20000 && !this.isStaringAtCamera) {
      // After 20 seconds with no mouse movement, the robot's head slowly turns
      // to look directly at the camera and the eye stops flickering.
      this.isStaringAtCamera = true;
    }

    // 2. Head & Eye Tracking
    let targetHeadX = 0;
    let targetHeadY = 0;

    if (this.isStaringAtCamera) {
      // Look directly into camera lens (0, 0)
      targetHeadX = 0.35; // Compensate for body rotation so face directly confronts camera
      targetHeadY = 0.02;
    } else {
      // Intermittent "lose tracking" behavior
      this.loseTrackingTimer += delta;
      if (this.loseTrackingTimer > 7.0 && Math.random() < 0.04) {
        // Sudden snap away / loss of tracking
        this.currentLook.x += (Math.random() - 0.5) * 0.6;
        this.currentLook.y += (Math.random() - 0.5) * 0.4;
        this.loseTrackingTimer = 0;
      }

      // Clamped neck tracking with jitter
      const clampedX = Math.max(-0.55, Math.min(0.55, this.mouseTarget.x));
      const clampedY = Math.max(-0.4, Math.min(0.4, this.mouseTarget.y));

      const jitter = (Math.random() - 0.5) * 0.015;
      targetHeadX = clampedX * 0.65 + jitter + 0.35; // offset for body angle
      targetHeadY = -clampedY * 0.5 + jitter;
    }

    // Smooth lerp (lag)
    const lerpSpeed = reducedMotion ? 0.03 : 0.07;
    this.currentLook.x += (targetHeadX - this.currentLook.x) * lerpSpeed;
    this.currentLook.y += (targetHeadY - this.currentLook.y) * lerpSpeed;

    if (this.headGroup) {
      this.headGroup.rotation.y = this.currentLook.x;
      this.headGroup.rotation.x = this.currentLook.y;
    }

    // Body Parallax (slight rotation with cursor)
    if (this.torsoGroup && !reducedMotion) {
      this.torsoGroup.rotation.y = Math.sin(time * 0.4) * 0.02 + this.mouseTarget.x * 0.06;
      // Subtle mechanical breathing / hum vibration
      this.torsoGroup.position.y = Math.sin(time * 1.8) * 0.012;
    }

    // 3. Eye Flickering & Stuttering to Red
    if (this.isRedOverride) {
      // Overridden by click trigger
      this.liveEyeMat.color.setHex(0xff2a2a);
      this.irisMat.color.setHex(0xff2a2a);
      this.liveEyeLight.color.setHex(0xff2a2a);
      this.liveEyeLight.intensity = 2.4;
    } else if (this.isStaringAtCamera) {
      // Eye stops flickering, solid unblinking cold cyan
      this.liveEyeMat.color.setHex(0x7df9ff);
      this.irisMat.color.setHex(0x7df9ff);
      this.liveEyeLight.color.setHex(0x7df9ff);
      this.liveEyeLight.intensity = 1.9;
    } else {
      this.eyeFlickerTimer += delta;
      // Erratic flicker
      const noise = Math.sin(time * 24.0) * Math.cos(time * 43.0);
      let intensity = 1.6 + noise * 0.7;

      // Occasional brief flip to warning red with tiny stutter
      if (Math.sin(time * 0.8) > 0.94) {
        this.liveEyeMat.color.setHex(0xff2a2a);
        this.irisMat.color.setHex(0xff2a2a);
        this.liveEyeLight.color.setHex(0xff2a2a);
        intensity = 2.2;
      } else {
        this.liveEyeMat.color.setHex(0x7df9ff);
        this.irisMat.color.setHex(0x7df9ff);
        this.liveEyeLight.color.setHex(0x7df9ff);
      }

      // Random micro-dropout (1 frame dark)
      if (Math.random() < 0.03) {
        intensity = 0.1;
      }

      this.liveEyeLight.intensity = Math.max(0.1, intensity);
    }

    // Iris aperture rotation
    if (this.liveIrisRing) {
      this.liveIrisRing.rotation.z = time * 0.5 + Math.sin(time * 3) * 0.1;
    }

    // 4. Chest Cavity Red Light Occasional Pulse
    this.chestPulseTimer += delta;
    if (this.chestPulseTimer > 4.5) {
      if (Math.random() < 0.3) {
        this.chestLight.intensity = (Math.sin(time * 18) * 0.5 + 0.5) * 1.8;
      } else {
        this.chestLight.intensity = 0;
        this.chestPulseTimer = 0;
      }
    } else {
      this.chestLight.intensity = 0;
    }

    // 5. Left Arm Limp Swaying & Leaking Oil Drops
    if (this.leftArmGroup && !reducedMotion) {
      this.leftArmGroup.rotation.z = Math.sin(time * 0.9) * 0.03;
      this.leftArmGroup.rotation.x = Math.cos(time * 0.7) * 0.02;

      // Update falling oil drops
      this.oilDrops.forEach(d => {
        d.y -= d.speed;
        d.mesh.position.y = d.y;
        if (d.y < -3.2) {
          d.y = d.originY;
        }
      });
    }

    // 6. Right Arm & Fingers Twitching
    this.twitchTimer += delta;
    if (this.rightForearmGroup && !reducedMotion) {
      // Micro-twitch every 2.5 to 4 seconds
      if (Math.sin(time * 1.2) > 0.92) {
        const snap = Math.sin(time * 30.0) * 0.06;
        this.rightForearmGroup.rotation.x = -0.4 + snap;
      } else {
        this.rightForearmGroup.rotation.x = -0.4;
      }

      // Fingers moving unevenly
      this.rightFingers.forEach(f => {
        const ft = Math.sin(time * f.twitchSpeed + f.offset);
        f.group.rotation.x = ft > 0.4 ? ft * 0.35 : 0;
      });
    }
  }

  // Triggered when user clicks the robot
  triggerRobotClick() {
    this.isRedOverride = true;
    setTimeout(() => {
      this.isRedOverride = false;
    }, 450);
  }
}
