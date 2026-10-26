import * as THREE from 'three';

export class SparkSystem {
  constructor(scene) {
    this.scene = scene;
    this.maxSparks = 180;
    this.sparks = [];
    this.burstTimer = 0;
    this.nextBurstInterval = 3.5 + Math.random() * 2.5;

    // Buffer geometry for sparks
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxSparks * 3);
    this.colors = new Float32Array(this.maxSparks * 3);
    this.sizes = new Float32Array(this.maxSparks);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Point material with bright additive blending for bloom
    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    // Initialize inactive particles
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparks.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        bounced: false
      });
      this.sizes[i] = 0;
    }
  }

  // Trigger a sudden spark burst from origin
  triggerBurst(origin, count = 28, onSparkSound = null) {
    if (onSparkSound) onSparkSound();
    let spawned = 0;
    for (let i = 0; i < this.maxSparks && spawned < count; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        s.active = true;
        s.pos.copy(origin).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        ));
        // High velocity sprayed outward and upward
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5;
        const speed = 1.4 + Math.random() * 2.8;

        s.vel.set(
          Math.sin(phi) * Math.cos(theta) * speed,
          (Math.cos(phi) * 0.8 + 0.3) * speed,
          Math.sin(phi) * Math.sin(theta) * speed
        );

        s.life = 0;
        s.maxLife = 0.25 + Math.random() * 0.45;
        s.bounced = false;
        spawned++;
      }
    }
  }

  update(delta, neckOrigin, soundCallback = null, reducedMotion = false) {
    if (reducedMotion) {
      // Clear all
      for (let i = 0; i < this.maxSparks; i++) {
        this.sizes[i] = 0;
      }
      this.geometry.attributes.size.needsUpdate = true;
      return;
    }

    // Auto spark bursts every 3 to 6 seconds
    this.burstTimer += delta;
    if (this.burstTimer >= this.nextBurstInterval) {
      this.burstTimer = 0;
      this.nextBurstInterval = 3.0 + Math.random() * 3.0;
      this.triggerBurst(neckOrigin, 20 + Math.floor(Math.random() * 15), soundCallback);
    }

    const gravity = -9.8;
    // Shoulder collision plane roughly at y = neckOrigin.y - 0.45
    const shoulderY = neckOrigin.y - 0.42;

    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (s.active) {
        s.life += delta;
        if (s.life >= s.maxLife) {
          s.active = false;
          this.sizes[i] = 0;
          continue;
        }

        // Apply physics
        s.vel.y += gravity * delta;
        s.pos.addScaledVector(s.vel, delta);

        // Shoulder bounce
        if (s.pos.y <= shoulderY && !s.bounced && Math.abs(s.pos.x - neckOrigin.x) < 0.6) {
          s.bounced = true;
          s.vel.y = -s.vel.y * 0.45; // Energy loss bounce
          s.vel.x *= 0.7;
          s.vel.z *= 0.7;
          s.pos.y = shoulderY + 0.01;
        }

        // Color transition: White -> Bright Orange -> Red
        const progress = s.life / s.maxLife;
        let r = 1.0;
        let g = 0.95 - progress * 0.65;
        let b = 0.8 - progress * 0.8;

        this.positions[i * 3] = s.pos.x;
        this.positions[i * 3 + 1] = s.pos.y;
        this.positions[i * 3 + 2] = s.pos.z;

        this.colors[i * 3] = r;
        this.colors[i * 3 + 1] = Math.max(0, g);
        this.colors[i * 3 + 2] = Math.max(0, b);

        // Spark size tapers with age
        this.sizes[i] = (1.0 - progress) * 0.12;
      } else {
        this.sizes[i] = 0;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
