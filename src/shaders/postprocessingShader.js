import * as THREE from 'three';

// Nightflash Custom CRT, Film Grain, Chromatic Aberration, Flashlight & Retinal Burn Shader
export const NightflashShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPrevFrame: { value: null },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime: { value: 0 },
    uSteppedTime: { value: 0 }, // 24fps stepped time for physical film grain
    uFlashIntensity: { value: 0 }, // 0.0 to 1.0 (flash whiteout burst)
    uAfterimageIntensity: { value: 0 }, // lingering inverted burn-in
    uCursor: { value: new THREE.Vector2(0.5, 0.5) },
    uFlashlightRadius: { value: 0.18 }, // screen-relative radius
    uReducedMotion: { value: 0.0 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tPrevFrame;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uSteppedTime;
    uniform float uFlashIntensity;
    uniform float uAfterimageIntensity;
    uniform vec2 uCursor;
    uniform float uFlashlightRadius;
    uniform float uReducedMotion;

    varying vec2 vUv;

    // Fast Pseudo-random hash
    float hash21(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    // Overlay blend mode
    vec3 blendOverlay(vec3 base, vec3 blend) {
      return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
      );
    }

    void main() {
      vec2 uv = vUv;
      vec2 screenCoords = uv * uResolution;

      // 1. Chromatic Aberration (RGB split 1-2px towards edges, spikes to ~6-8px during flash)
      vec2 distFromCenter = uv - 0.5;
      float edgeDist = length(distFromCenter);
      float aberrationDist = (edgeDist * 0.0035 + uFlashIntensity * 0.009) * (1.0 - uReducedMotion * 0.8);

      vec2 dir = normalize(distFromCenter + 0.0001);
      float rChannel = texture2D(tDiffuse, uv - dir * aberrationDist).r;
      float gChannel = texture2D(tDiffuse, uv).g;
      float bChannel = texture2D(tDiffuse, uv + dir * aberrationDist).b;

      vec3 color = vec3(rChannel, gChannel, bChannel);

      // 2. Cursor Flashlight Reveal
      vec2 aspectVec = vec2(uResolution.x / uResolution.y, 1.0);
      float cursorDist = length((uv - uCursor) * aspectVec);
      float flashlightFalloff = smoothstep(uFlashlightRadius, uFlashlightRadius * 0.25, cursorDist);
      
      // Flashlight casts an atmospheric cold-blue cone of light over the scene
      color += vec3(0.06, 0.10, 0.15) * flashlightFalloff * 0.65;

      // 3. Camera Flash Whiteout & Double-Pulse
      if (uFlashIntensity > 0.01) {
        vec3 flashColor = mix(vec3(0.95, 0.98, 1.0), vec3(1.0), uFlashIntensity);
        color = mix(color, flashColor, uFlashIntensity * 0.92);
      }

      // 4. Retinal Burn-in Afterimage (inverted ghost lingering)
      if (uAfterimageIntensity > 0.01 && uReducedMotion < 0.5) {
        vec3 invertedScene = 1.0 - color;
        color = mix(color, invertedScene, uAfterimageIntensity * 0.09);
      }

      // 5. Film Grain (stepped at 24fps, opacity ~0.18 to 0.25, overlay blend)
      float grain = hash21(uv * uResolution + vec2(uSteppedTime * 123.4, uSteppedTime * 456.7));
      float grainIntensity = 0.20 + uFlashIntensity * 0.06;
      color = blendOverlay(color, vec3(grain)) * (1.0 - grainIntensity) + color * grainIntensity;

      // 6. Coarser Vertical Worn-Film Streaks
      float streakNoise = hash21(vec2(floor(uv.x * 280.0), floor(uTime * 12.0)));
      if (streakNoise > 0.988) {
        color += vec3(0.045);
      }

      // 7. Faint Horizontal Scanlines (2px period, ~4% opacity)
      float scanline = sin(screenCoords.y * 3.14159) * 0.5 + 0.5;
      color -= scanline * 0.04;

      // 8. Slow Rolling Brighter Band (moving top to bottom every ~7s)
      float rollPos = fract(uTime / 7.0);
      float rollBand = smoothstep(0.12, 0.0, abs(uv.y - rollPos));
      color += rollBand * 0.035;

      // 9. Rare Dust & Hair Specks + 2-frame scratch
      float hairSeed = hash21(vec2(floor(uTime * 8.0), 42.0));
      if (hairSeed > 0.993) {
        float scratchX = hash21(vec2(floor(uTime * 8.0), 99.0));
        if (abs(uv.x - scratchX) < 0.0012) {
          color += vec3(0.14);
        }
      }

      // 10. Vignette (soft edge darkening, preserving center subject readability)
      float vignette = smoothstep(0.95, 0.35, edgeDist);
      color *= mix(0.70, 1.0, vignette);

      // 11. Filmic Color Grade: Lifted cold blacks, no crushed shadows
      color = max(color, vec3(0.016, 0.020, 0.026));

      gl_FragColor = vec4(color, 1.0);
    }
  `
};
