import * as THREE from 'three';

export class DustSystem {
  constructor(scene) {
    this.scene = scene;
    this.particleCount = 300;

    // Dust particles
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const opacities = new Float32Array(this.particleCount);
    this.velocities = [];

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;

      opacities[i] = 0.15 + Math.random() * 0.4;

      this.velocities.push({
        x: (Math.random() - 0.5) * 0.08,
        y: 0.02 + Math.random() * 0.05,
        z: (Math.random() - 0.5) * 0.08
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // Custom point shader so flashlight and flash can illuminate particles
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uFlashIntensity: { value: 0.0 },
        uFlashlightPos: { value: new THREE.Vector3(0, 0, 0) },
        uFlashlightRadius: { value: 2.2 }
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        varying vec3 vWorldPos;
        void main() {
          vOpacity = opacity;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vec4 mvPosition = viewMatrix * worldPos;
          gl_PointSize = (14.0 / -mvPosition.z) * (0.8 + opacity);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uFlashIntensity;
        uniform vec3 uFlashlightPos;
        uniform float uFlashlightRadius;
        varying float vOpacity;
        varying vec3 vWorldPos;

        void main() {
          // Circular particle shape
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;

          // Illumination from flashlight
          float distToLight = length(vWorldPos - uFlashlightPos);
          float flashlightFactor = smoothstep(uFlashlightRadius, 0.2, distToLight);

          // Illumination from camera flash
          float flashFactor = uFlashIntensity;

          // Overall visibility (almost invisible between flashes unless lit by flashlight)
          float visibility = 0.04 + flashlightFactor * 0.65 + flashFactor * 0.8;
          vec3 dustColor = mix(vec3(0.5, 0.6, 0.7), vec3(0.95, 0.98, 1.0), flashFactor);

          gl_FragColor = vec4(dustColor, vOpacity * visibility);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    // Thin low smoke / haze plane near the floor
    this.createSmokePlane();
  }

  createSmokePlane() {
    const smokeGeo = new THREE.PlaneGeometry(16, 12, 16, 16);
    this.smokeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlash: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlash;
        varying vec2 vUv;

        // Simple noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          vec2 uv = vUv;
          float n = noise(uv * 4.0 + vec2(uTime * 0.04, uTime * 0.02));
          float fade = smoothstep(0.0, 0.35, uv.y) * smoothstep(1.0, 0.65, uv.y) * smoothstep(0.0, 0.35, uv.x) * smoothstep(1.0, 0.65, uv.x);
          float alpha = n * fade * (0.05 + uFlash * 0.15);
          gl_FragColor = vec4(0.55, 0.65, 0.75, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.smokeMesh = new THREE.Mesh(smokeGeo, this.smokeMat);
    this.smokeMesh.rotation.x = -Math.PI / 2;
    this.smokeMesh.position.set(0, -2.2, 0);
    this.scene.add(this.smokeMesh);
  }

  update(delta, time, flashIntensity, flashlightPos) {
    const pos = this.geometry.attributes.position.array;
    for (let i = 0; i < this.particleCount; i++) {
      const v = this.velocities[i];
      pos[i * 3] += v.x * delta;
      pos[i * 3 + 1] += v.y * delta;
      pos[i * 3 + 2] += v.z * delta;

      // Wrap around bounds
      if (pos[i * 3 + 1] > 3.0) pos[i * 3 + 1] = -3.0;
      if (pos[i * 3] > 4.0) pos[i * 3] = -4.0;
      if (pos[i * 3] < -4.0) pos[i * 3] = 4.0;
    }
    this.geometry.attributes.position.needsUpdate = true;

    this.material.uniforms.uFlashIntensity.value = flashIntensity;
    if (flashlightPos) {
      this.material.uniforms.uFlashlightPos.value.copy(flashlightPos);
    }

    if (this.smokeMat) {
      this.smokeMat.uniforms.uTime.value = time;
      this.smokeMat.uniforms.uFlash.value = flashIntensity;
    }
  }
}
