/*
 * Antiviotic 3D chip (Three.js). Built to js/chip.js with: npm run build
 * Exposes window.AVChip.init(canvas, initialState) -> { state, setActive(bool), renderOnce() }
 * Also bundles the particle shield (src/particles.js).
 * main.js drives `state` with GSAP ScrollTrigger.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import './particles.js';

const LOGO = 'M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2Z';
const FONT = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/* Circuit traces baked into a data texture:
   R = trace mask, G = distance from the chip (0..1). The shader uses G for the reveal and the travelling light pulses. */
// #f5f5f7, pre-converted twice: the clear colour goes through two sRGB encodes on its way to the screen
const PAGE_LIGHT = new THREE.Color().setRGB(0.8148, 0.8148, 0.8469, THREE.LinearSRGBColorSpace);
let traceCanvas = null; // drawn once, shared by every chip on the page
function makeTraceTexture() {
  if (traceCanvas) { const t = new THREE.CanvasTexture(traceCanvas); t.anisotropy = 8; return t; }
  const size = 2048, world = 18, s = size / world, c = size / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const rand = rng(11), maxLen = 7.6, edge = 1.72;
  const P = (x, z) => [c + x * s, c + z * s];
  const g = (d) => Math.round(Math.min(1, d / maxLen) * 255);
  const outs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const tans = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  for (let side = 0; side < 4; side++) {
    const n = 28, out = outs[side], tan = tans[side];
    for (let k = 0; k < n; k++) {
      if (rand() < 0.1) continue;
      const t = -1.5 + 3 * (k / (n - 1));
      let x = out[0] * edge + tan[0] * t, z = out[1] * edge + tan[1] * t;
      const pts = [[x, z]];
      const fan = Math.abs(t) > 0.2 ? Math.sign(t) : 0;
      const a = 0.12 + rand() * 0.6;
      x += out[0] * a; z += out[1] * a; pts.push([x, z]);
      if (fan) {
        const b = (0.2 + rand() * 0.9) * (Math.abs(t) / 1.5);
        x += (out[0] + tan[0] * fan) * b; z += (out[1] + tan[1] * fan) * b; pts.push([x, z]);
      }
      const cl = 0.6 + rand() * 3.8;
      x += out[0] * cl; z += out[1] * cl; pts.push([x, z]);
      if (rand() < 0.55) {
        const d2 = 0.25 + rand() * 0.9, f2 = rand() < 0.5 ? 1 : -1;
        x += (out[0] + tan[0] * f2) * d2; z += (out[1] + tan[1] * f2) * d2; pts.push([x, z]);
        const d3 = 0.3 + rand() * 1.8;
        x += out[0] * d3; z += out[1] * d3; pts.push([x, z]);
      }
      ctx.lineWidth = 2.5 + rand() * 3.5;
      let dist = 0;
      for (let i = 1; i < pts.length; i++) {
        const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const [px0, py0] = P(x0, z0), [px1, py1] = P(x1, z1);
        const grad = ctx.createLinearGradient(px0, py0, px1, py1);
        grad.addColorStop(0, `rgb(255,${g(dist)},0)`);
        grad.addColorStop(1, `rgb(255,${g(dist + len)},0)`);
        ctx.strokeStyle = grad;
        ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py1); ctx.stroke();
        dist += len;
      }
      const [ex, ey] = P(x, z);
      ctx.fillStyle = `rgb(255,${g(dist)},0)`;
      ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeLidTextures() {
  const S = 1024;
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = S; return [cv, cv.getContext('2d')]; };
  const [a, ax] = mk();
  const [b, bx] = mk();
  const logo = new Path2D(LOGO);

  const drawLogo = (ctx) => {
    const k = 10;
    ctx.save();
    ctx.translate(S / 2 - 16 * k, 330 - 16 * k);
    ctx.scale(k, k);
    ctx.lineWidth = 1.5;
    ctx.stroke(logo);
    ctx.translate(16, 16.5);
    ctx.rotate((35 * Math.PI) / 180);
    ctx.beginPath(); ctx.roundRect(-4.2, -6, 8.4, 12, 4.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4.2, 0); ctx.lineTo(4.2, 0); ctx.stroke();
    ctx.restore();
  };

  // Etched text + logo on the lid
  ax.strokeStyle = ax.fillStyle = 'rgba(24,26,30,0.92)';
  drawLogo(ax);
  ax.textAlign = 'center';
  ax.font = `600 210px ${FONT}`;
  ax.fillText('AV1', S / 2, 740);
  ax.font = `500 44px ${FONT}`;
  ax.letterSpacing = '18px';
  ax.fillText('SHIELD ENGINE', S / 2 + 9, 830);
  ax.lineWidth = 3;
  ax.strokeStyle = 'rgba(24,26,30,0.25)';
  ax.beginPath(); ax.roundRect(40, 40, S - 80, S - 80, 60); ax.stroke();

  // Glow layer: logo only
  bx.strokeStyle = '#fff';
  bx.shadowColor = '#fff';
  bx.shadowBlur = 24;
  drawLogo(bx);

  const ta = new THREE.CanvasTexture(a); ta.colorSpace = THREE.SRGBColorSpace; ta.anisotropy = 8;
  const tb = new THREE.CanvasTexture(b); tb.colorSpace = THREE.SRGBColorSpace;
  return [ta, tb];
}

function radialTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function init(canvas, initial = {}, target = null) {
  let renderer, light = false;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentRotation.set(0.5, 0.8, 0);
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 6, 5);
  scene.add(key);
  const rimA = new THREE.PointLight(0x4cf2b0, 40, 14); rimA.position.set(-4, 2, -2); scene.add(rimA);
  const rimB = new THREE.PointLight(0x3ab8ff, 40, 14); rimB.position.set(4, -2, 3); scene.add(rimB);

  const chip = new THREE.Group();
  scene.add(chip);

  // Package substrate
  const substrate = new THREE.Mesh(
    new RoundedBoxGeometry(3.2, 0.18, 3.2, 6, 0.08),
    new THREE.MeshPhysicalMaterial({ color: '#121519', metalness: 0.35, roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.3 })
  );
  chip.add(substrate);

  // Brushed metal lid
  const lid = new THREE.Mesh(
    new RoundedBoxGeometry(2.5, 0.12, 2.5, 6, 0.06),
    new THREE.MeshPhysicalMaterial({ color: '#a9adb4', metalness: 1, roughness: 0.4, anisotropy: 0.6, clearcoat: 0.15 })
  );
  lid.position.y = 0.15;
  chip.add(lid);

  const [lidTex, glowTex] = makeLidTextures();
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: lidTex, transparent: true, metalness: 0.6, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  decal.position.y = 0.212;
  chip.add(decal);

  const logoGlowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0x4cf2b0).multiplyScalar(2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const logoGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), logoGlowMat);
  logoGlow.position.y = 0.215;
  chip.add(logoGlow);

  // Small components around the lid
  const caps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 0.06, 0.08),
    new THREE.MeshStandardMaterial({ color: '#3a3d42', metalness: 0.8, roughness: 0.3 }),
    36
  );
  const dummy = new THREE.Object3D();
  let ci = 0;
  for (let side = 0; side < 4; side++) {
    for (let k = 0; k < 9; k++) {
      const t = -1.1 + (2.2 * k) / 8;
      const p = [[t, -1.43], [1.43, t], [t, 1.43], [-1.43, t]][side];
      dummy.position.set(p[0], 0.12, p[1]);
      dummy.rotation.set(0, side % 2 ? Math.PI / 2 : 0, 0);
      dummy.updateMatrix();
      caps.setMatrixAt(ci++, dummy.matrix);
    }
  }
  chip.add(caps);

  // Glowing circuit traces
  const traceMat = new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: makeTraceTexture() },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uIntensity: { value: 1 },
      uC1: { value: new THREE.Color('#4cf2b0') },
      uC2: { value: new THREE.Color('#3ab8ff') },
      uC3: { value: new THREE.Color('#8b7bff') },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D uTex; uniform float uTime, uReveal, uIntensity; uniform vec3 uC1, uC2, uC3; varying vec2 vUv;
      void main(){
        vec4 t = texture2D(uTex, vUv);
        float m = t.r;
        if (m < 0.02) discard;
        float d = clamp(t.g / m, 0.0, 1.0);
        float rev = 1.0 - smoothstep(uReveal - 0.06, uReveal, d);
        float front = smoothstep(uReveal - 0.12, uReveal - 0.01, d) * rev;
        float p = fract(d * 2.2 - uTime * 0.22);
        float band = smoothstep(0.0, 0.03, p) * (1.0 - smoothstep(0.03, 0.14, p));
        vec3 col = mix(uC1, uC2, smoothstep(0.0, 0.45, d));
        col = mix(col, uC3, smoothstep(0.45, 1.0, d));
        float fade = 1.0 - smoothstep(0.5, 1.0, d);
        float a = m * rev * (0.18 + band * 1.2 + front * 1.8) * fade * uIntensity;
        gl_FragColor = vec4(col * a, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const traces = new THREE.Mesh(new THREE.PlaneGeometry(18, 18).rotateX(-Math.PI / 2), traceMat);
  traces.position.y = -0.095;
  chip.add(traces);

  // Soft light pool under the chip
  const poolMat = new THREE.MeshBasicMaterial({ map: radialTexture(), color: 0x2fd1c4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolMat);
  pool.position.y = -0.1;
  chip.add(pool);

  // Post-processing: bloom makes the traces and logo glow
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.4, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // `target`: an object main.js already animates; the chip reads from it directly (used to start the CTA chip late)
  const defaults = { rotX: 0.32, rotY: -0.55, scale: 0.55, y: -1.25, reveal: 0, intensity: 1, logo: 0, glow: 0.25, introY: -1, introA: 0 };
  const state = Object.assign(target || {}, { ...defaults, ...initial, ...(target || {}) });

  // Adaptive sharpness: if frames run slow (weaker graphics chips), drop the resolution a step, down to 1x
  let prCap = 9, slow = 0, frames = 0, lastT = 0;
  const watch = (now) => {
    const dt = now - lastT; lastT = now;
    if (dt > 0 && dt < 250) { frames++; if (dt > 21) slow++; }
    if (frames >= 45) {
      const cur = Math.min(window.devicePixelRatio || 1, prCap);
      if (slow > 18 && cur > 1) { prCap = Math.max(1, cur - 0.25); resize(); }
      frames = slow = 0;
    }
  };

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.3 : 1.75, prCap);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!active) draw(performance.now());
  }

  function draw(now) {
    const t = now / 1000;
    chip.scale.setScalar(state.scale * Math.min(1, camera.aspect * 1.25));
    chip.position.y = state.y + state.introY;
    chip.rotation.set(state.rotX + Math.sin(t * 0.6) * 0.015, state.rotY + Math.sin(t * 0.35) * 0.05, 0);
    traceMat.uniforms.uTime.value = t;
    traceMat.uniforms.uReveal.value = state.reveal;
    traceMat.uniforms.uIntensity.value = state.intensity * state.introA;
    logoGlowMat.opacity = state.logo * state.introA;
    poolMat.opacity = state.glow * 0.14 * state.introA;
    // Dim reflections as the lid turns toward the camera so the metal never blows out
    const face = THREE.MathUtils.smoothstep(state.rotX, 0.8, 1.2);
    scene.environmentIntensity = 0.42 - 0.3 * face;
    key.intensity = 0.9 - 0.6 * face;
    renderer.toneMappingExposure = 0.35 + 0.65 * state.introA;
    composer.render();
  }

  let active = false, raf = 0;
  const loop = (now) => { if (!active) { raf = 0; lastT = 0; return; } watch(now); draw(now); raf = requestAnimationFrame(loop); };
  const setActive = (on) => { active = on; if (on && !raf) raf = requestAnimationFrame(loop); };

  new ResizeObserver(resize).observe(canvas);
  resize();

  // Light theme: page-coloured background, no glow effects
  const setTheme = (isLight) => {
    light = !!isLight;
    // Light: paint the page colour itself (#f5f5f7) with no colour grading, so it matches the page exactly
    renderer.setClearColor(light ? PAGE_LIGHT : 0x000000, 1);
    renderer.toneMapping = light ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    bloom.enabled = !light;
    traces.visible = logoGlow.visible = pool.visible = !light;
    if (!active) draw(performance.now());
  };

  return { state, setActive, setTheme, renderOnce: () => draw(performance.now()) };
}

window.AVChip = { init };
