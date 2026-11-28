// A live 3D backdrop: game pieces (dice, stars, hearts, gems, rings, pawns)
// drifting in depth behind the landing page and the lobby carousel, lit in
// the colours of the game in front. Purely decorative. It loads three.js on
// demand, only on screens that can afford it, pauses when the tab is hidden
// and never runs when the viewer prefers reduced motion.
let stage;
let loading;

const allowed = () => typeof matchMedia === 'function'
  && !matchMedia('(prefers-reduced-motion: reduce)').matches
  && matchMedia('(min-width: 900px)').matches
  && !navigator.connection?.saveData
  && !document.documentElement.classList.contains('tv-lite');

function heartShape(THREE) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.55);
  shape.bezierCurveTo(-1.1, 0.2, -0.55, 0.95, 0, 0.42);
  shape.bezierCurveTo(0.55, 0.95, 1.1, 0.2, 0, -0.55);
  return shape;
}

function starShape(THREE) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? 0.42 : 1;
    const angle = Math.PI / 2 + i * Math.PI / 5;
    shape[i ? 'lineTo' : 'moveTo'](Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  return shape;
}

function build(THREE) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-3d';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 80);
  camera.position.set(0, 0, 16);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 8, 10);
  const accentLight = new THREE.PointLight('#ffc93c', 60, 60);
  accentLight.position.set(-9, 3, 6);
  const secondLight = new THREE.PointLight('#ff6b5a', 50, 60);
  secondLight.position.set(9, -4, 5);
  scene.add(new THREE.AmbientLight('#8fa2ff', 0.7), key, accentLight, secondLight);

  const extrude = { depth: 0.36, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3 };
  const pawn = new THREE.LatheGeometry([[0, 0], [0.55, 0], [0.5, 0.12], [0.22, 0.3], [0.2, 0.8], [0.34, 0.95], [0.36, 1.15], [0.22, 1.38], [0, 1.45]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  pawn.translate(0, -0.7, 0);
  const shapes = [
    new THREE.BoxGeometry(1.15, 1.15, 1.15, 2, 2, 2),                  // die
    new THREE.ExtrudeGeometry(starShape(THREE), extrude).center(),       // star
    new THREE.ExtrudeGeometry(heartShape(THREE), extrude).center(),      // heart
    new THREE.OctahedronGeometry(0.85),                                  // gem
    new THREE.TorusGeometry(0.7, 0.2, 14, 36),                           // ring
    pawn,                                                                // board pawn
    new THREE.IcosahedronGeometry(0.75, 0),                              // puzzle crystal
  ];
  const paints = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.35 }));
  const pieces = [];
  // A few pieces around the edges only: decoration, never behind the text.
  const count = 14;
  for (let i = 0; i < count; i++) {
    // A deterministic scatter: wide, deep, and kept clear of the centre.
    const a = i * 2.399963;
    const radius = 12.5 + (i * 37 % 100) / 100 * 5;
    const mesh = new THREE.Mesh(shapes[i % shapes.length], paints[i % paints.length]);
    mesh.position.set(Math.cos(a) * radius * 1.6, Math.sin(a) * radius * 0.78, -3 - (i * 53 % 100) / 100 * 9);
    mesh.scale.setScalar(0.6 + (i * 29 % 100) / 100 * 0.9);
    mesh.rotation.set(i, i * 1.7, i * 0.4);
    mesh.userData = { home: mesh.position.clone(), spin: 0.12 + (i * 17 % 100) / 100 * 0.3, phase: i * 1.3, bob: 0.25 + (i * 11 % 100) / 100 * 0.5 };
    scene.add(mesh);
    pieces.push(mesh);
  }

  const target = { accent: new THREE.Color('#ffc93c'), accent2: new THREE.Color('#ff6b5a'), ink: new THREE.Color('#ffffff') };
  let pointerX = 0;
  let pointerY = 0;
  let frame;
  let host;
  let last = performance.now();
  const onPointer = event => { pointerX = event.clientX / innerWidth - 0.5; pointerY = event.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const width = host?.clientWidth || innerWidth;
    const height = host?.clientHeight || innerHeight;
    if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (document.hidden || !canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();
    const t = now / 1000;
    // Ease the colours towards the game in front.
    paints[0].color.lerp(target.accent, 0.04);
    paints[1].color.lerp(target.accent2, 0.04);
    paints[2].color.lerp(target.ink, 0.04);
    accentLight.color.lerp(target.accent, 0.04);
    secondLight.color.lerp(target.accent2, 0.04);
    for (const piece of pieces) {
      const { home, spin, phase, bob } = piece.userData;
      piece.rotation.x += spin * dt;
      piece.rotation.y += spin * 0.8 * dt;
      piece.position.y = home.y + Math.sin(t * 0.5 + phase) * bob;
      piece.position.x = home.x + Math.cos(t * 0.3 + phase) * bob * 0.6;
    }
    // A little parallax from the pointer or remote.
    camera.position.x += (pointerX * 2.4 - camera.position.x) * 0.04;
    camera.position.y += (-pointerY * 1.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -6);
    renderer.render(scene, camera);
  }

  return {
    canvas,
    mount(element) {
      host = element;
      if (canvas.parentElement !== element) element.append(canvas);
      if (!frame) frame = requestAnimationFrame(tick);
    },
    colours({ accent, accent2, ink }) {
      if (accent) target.accent.set(accent);
      if (accent2) target.accent2.set(accent2);
      if (ink) target.ink.set(ink);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = undefined;
      canvas.remove();
    },
  };
}

/** Show the backdrop inside `element`, tinted for a game's identity. */
export function showStage(element, colours) {
  if (!element || !allowed()) return;
  if (stage) { stage.mount(element); if (colours) stage.colours(colours); return; }
  loading ??= import('/vendor/three.module.js').then(THREE => {
    try { stage = build(THREE); } catch { stage = null; }   // no WebGL: stay 2D
  }).catch(() => { stage = null; });
  loading.then(() => { if (stage && element.isConnected) { stage.mount(element); if (colours) stage.colours(colours); } });
}

export function tintStage(colours) { stage?.colours(colours); }
export function hideStage() { stage?.stop(); }
