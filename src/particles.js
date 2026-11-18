/*
 * Particle shield: thousands of points start as red "threat" chaos and fly into the Antiviotic shield.
 * Exposes window.AVParticles.init(canvas) -> { state: { morph, alpha }, setActive(bool), renderOnce() }
 */
import * as THREE from 'three';

const SHIELD = 'M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2Z';

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

// Sample points from the shield logo drawn on a canvas (edges denser than the fill)
function sampleShield(n, rand) {
  const S = 256, k = S / 32;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.scale(k, k);
  const p = new Path2D(SHIELD);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill(p);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.3;
  ctx.stroke(p);
  ctx.translate(16, 16.5);
  ctx.rotate((35 * Math.PI) / 180);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(-4.2, -6, 8.4, 12, 4.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4.2, 0); ctx.lineTo(4.2, 0); ctx.stroke();
  const data = ctx.getImageData(0, 0, S, S).data;

  const out = new Float32Array(n * 3);
  let i = 0, guard = 0;
  while (i < n && guard < n * 200) {
    guard++;
    const x = rand() * S, y = rand() * S;
    const a = data[((y | 0) * S + (x | 0)) * 4 + 3] / 255;
    if (rand() < a) {
      const nx = x / S - 0.5, ny = -(y / S - 0.53);
      const r2 = nx * nx + ny * ny;
      out[i * 3] = nx * 3.4;
      out[i * 3 + 1] = ny * 3.4 + 0.55;
      out[i * 3 + 2] = (rand() - 0.5) * 0.18 + Math.max(0, 0.3 - r2) * 1.1;
      i++;
    }
  }
  const filled = Math.max(1, i);
  for (; i < n; i++) {
    const j = Math.floor(rand() * filled) * 3;
    out[i * 3] = out[j]; out[i * 3 + 1] = out[j + 1]; out[i * 3 + 2] = out[j + 2];
  }
  return out;
}

function init(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 10;

  const rand = rng(29);
  const N = innerWidth < 700 ? 5200 : 9000;
  const A = new Float32Array(N * 3), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const r = 2.6 + Math.sqrt(rand()) * 5.2;
    A[i * 3] = s * Math.cos(th) * r;
    A[i * 3 + 1] = u * r * 0.7;
    A[i * 3 + 2] = s * Math.sin(th) * r - 1.5;
    R[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sampleShield(N, rand), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 3));
  geo.setAttribute('aR', new THREE.BufferAttribute(R, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMorph: { value: 0 }, uTime: { value: 0 }, uPR: { value: 1 }, uSize: { value: 30 }, uAlpha: { value: 1 },
      uCA: { value: new THREE.Color('#ff453a') }, uCA2: { value: new THREE.Color('#ff9f0a') },
      uCB: { value: new THREE.Color('#4cf2b0') }, uCB2: { value: new THREE.Color('#3ab8ff') },
    },
    vertexShader: `
      attribute vec3 aA; attribute float aR;
      uniform float uMorph, uTime, uPR, uSize;
      varying float vE; varying float vR;
      mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      void main(){
        float t = clamp((uMorph - aR * 0.35) / 0.65, 0.0, 1.0);
        float e = t * t * (3.0 - 2.0 * t);
        vec3 a = aA;
        a.xz = rot(uTime * 0.09 + aR * 0.6) * a.xz;
        a.y += sin(uTime * 0.7 + aR * 20.0) * 0.18;
        vec3 b = position + vec3(sin(uTime * 1.3 + aR * 40.0), cos(uTime * 1.1 + aR * 30.0), 0.0) * 0.012;
        vec3 p = mix(a, b, e);
        float mid = sin(e * 3.14159);
        p.xy = rot(mid * 1.4 * (aR - 0.5)) * p.xy;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (0.55 + aR * 0.9) * (1.0 + mid * 0.6) / -mv.z;
        vE = e; vR = aR;
      }`,
    fragmentShader: `
      uniform vec3 uCA, uCA2, uCB, uCB2; uniform float uAlpha;
      varying float vE; varying float vR;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(mix(uCA, uCA2, vR), mix(uCB, uCB2, vR), vE);
        gl_FragColor = vec4(col * a * uAlpha * (0.8 + 0.2 * vE), 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const state = { morph: 0, alpha: 1 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; });

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    mat.uniforms.uPR.value = pr;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    points.scale.setScalar(Math.min(1, camera.aspect * 1.6));
    if (!active) draw(performance.now());
  }

  function draw(now) {
    const t = now / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uMorph.value = state.morph;
    mat.uniforms.uAlpha.value = state.alpha;
    points.rotation.y = mouse.x * 0.5 + Math.sin(t * 0.4) * 0.12 * state.morph;
    points.rotation.x = mouse.y * 0.3;
    renderer.render(scene, camera);
  }

  let active = false, raf = 0;
  const loop = (now) => { if (!active) { raf = 0; return; } draw(now); raf = requestAnimationFrame(loop); };
  const setActive = (on) => { active = on; if (on && !raf) raf = requestAnimationFrame(loop); };

  new ResizeObserver(resize).observe(canvas);
  resize();
  return { state, setActive, renderOnce: () => draw(performance.now()) };
}

window.AVParticles = { init };
