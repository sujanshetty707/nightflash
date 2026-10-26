# NIGHTFLASH // RECOVERED FOOTAGE

An interactive 3D cinematic website inspired by found-footage horror title sequences crossed with an old maintenance terminal.

## Features
- **Strict Anti-"AI Look" Aesthetic**: Sharp 0px corners, hairline borders, asymmetric editorial grid, and physical human imperfections (registration marks, corner timestamps, dead pixel, faint film scratch).
- **Physical CRT & Film Texture Pipeline**: Full-screen post-processing shader with 24fps stepped film grain, horizontal 2px scanlines, slow rolling bright band, chromatic aberration, vertical worn-film streaks, and vignette.
- **The "Nightflash" Effect**: Pitch-black void punctuated by sudden camera flashes with double-pulse decays, retinal burn-in ghost afterimages, and a responsive cursor flashlight.
- **Detailed 3D Broken Robot (Unit 07)**: Slumped companion unit with cracked faceplate exposing circuit board and dead camera lens, bent neck with sparking physics-based particles, breached chest with exposed ribs, pistons, and weathered serial plate, dangling limp left arm with leaking viscous oil droplets, and twitching right claw.
- **Eerie Idle Stare**: After 20 seconds of mouse inactivity, the robot's head slowly turns to stare directly into the camera lens as its eye stops flickering.
- **Web Audio API Soundscape**: Synthesized camera flash thunk, capacitor recharge whine, spark crackles, and 60Hz transformer hum (muted by default with `SOUND: OFF / ON` toggle).
- **Scroll Choreography**: Smooth Lenis scrolling and GSAP ScrollTrigger scrubbing the 3D camera from wide hero to an extreme cybernetic eye close-up with aperture dilation and hard black cut.
- **Accessibility**: Includes "FLASH: SAFE" toggle and respects `prefers-reduced-motion`.

## Technology Stack
- Vite 5
- Three.js (WebGL, EffectComposer, UnrealBloomPass, Custom Shaders)
- GSAP & ScrollTrigger
- Lenis Smooth Scroll
- Web Audio API

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## 3D Asset Attributions & Environment
- **Hero Cybernetic Helmet Model**: `DamagedHelmet.glb` by Battle Damaged Sci-Fi Helmet (Khronos Group / CC BY-NC 4.0), enhanced with physical PBR shader layers, clearcoat, and procedural wear.
- **Environment Map**: `dikhololo_night_1k.hdr` by Poly Haven (CC0 Public Domain), processed with PMREMGenerator for realistic image-based reflections and ambient edge separation.
- **Procedural Textures**: Handcrafted procedural micro-scratches, armor normal maps, weathered serial plates, and cracked optical glass textures generated dynamically via HTML5 Canvas.
