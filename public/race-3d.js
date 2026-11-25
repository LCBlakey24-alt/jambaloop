// Quiz Race 3D circuit for the TV. Purely presentational: it draws the same
// course as the SVG track and places cars from the server's race snapshot.
// Visual positions never decide who wins.
import * as THREE from '/vendor/three.module.js';
import { courseSegments } from './race-course.js';

const SCALE = 40;
const toWorld = ([x, y]) => new THREE.Vector3((x - 580) / SCALE, 0, (y - 210) / SCALE);
export function courseCurve() {
  const path = new THREE.CurvePath();
  for (const [a, b, c, d] of courseSegments()) path.add(new THREE.CubicBezierCurve3(toWorld(a), toWorld(b), toWorld(c), toWorld(d)));
  return path;
}

const ROAD_HALF = 1.5;
const themes = {
  neon:   { ground: '#07061a', grid: ['#ff3fb4', '#1dfbe0'], road: '#120d38', edge: '#1dfbe0', line: '#ff3fb4', sky: '#0b0927' },
  desert: { ground: '#b88a52', road: '#3b3330', edge: '#f4f1ea', kerb: '#d6452f', line: '#f2d16b', sky: '#e9b979' },
  snow:   { ground: '#e6eef6', road: '#39414f', edge: '#ffffff', kerb: '#2f7de0', line: '#ffffff', sky: '#b9d4ee' },
  jungle: { ground: '#1f4d2e', road: '#2e3331', edge: '#f4f1ea', kerb: '#e0a12f', line: '#f4f1ea', sky: '#2c5e45' },
  space:  { ground: '#050814', grid: ['#6f5bff', '#2b3a8f'], road: '#161a33', edge: '#8f6bff', line: '#ffd34d', sky: '#04050d' },
};

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function chequer(size = 64, cells = 8) {
  return canvasTexture(size, (ctx, s) => {
    const c = s / cells;
    for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#111' : '#fafafa';
      ctx.fillRect(x * c, y * c, c, c);
    }
  });
}

function label(text, colour) {
  return canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = colour;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#0b0920'; ctx.stroke();
    ctx.fillStyle = '#0b0920';
    ctx.font = '900 68px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(text), s / 2, s / 2 + 4);
  });
}

// A ribbon following the curve, offset sideways between two lane positions.
function ribbon(curve, from, to, y, material, samples = 320, start = 0, end = 1) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= samples; i++) {
    const u = start + (end - start) * i / samples;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    for (const [side, offset] of [[0, from], [1, to]]) {
      positions.push(p.x + n.x * offset, y, p.z + n.z * offset);
      uvs.push(side, u * 40);
    }
    if (i) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function carBody() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.56, 0.06);
  shape.lineTo(0.5, 0.06);
  shape.quadraticCurveTo(0.64, 0.08, 0.6, 0.16);
  shape.lineTo(0.3, 0.21);
  shape.lineTo(0.12, 0.33);
  shape.lineTo(-0.2, 0.34);
  shape.lineTo(-0.36, 0.22);
  shape.lineTo(-0.56, 0.22);
  shape.lineTo(-0.6, 0.12);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.46, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
  geometry.translate(0, 0, -0.23);
  return geometry;
}

const shared = {};
function sharedParts() {
  if (shared.body) return shared;
  shared.body = carBody();
  shared.glass = new THREE.BoxGeometry(0.3, 0.1, 0.44);
  shared.wheel = new THREE.CylinderGeometry(0.12, 0.12, 0.09, 18).rotateX(Math.PI / 2);
  shared.light = new THREE.BoxGeometry(0.04, 0.05, 0.1);
  shared.spoiler = new THREE.BoxGeometry(0.16, 0.03, 0.56);
  shared.flame = new THREE.ConeGeometry(0.07, 0.42, 10).rotateZ(Math.PI / 2);
  shared.glow = new THREE.PlaneGeometry(1.25, 0.75).rotateX(-Math.PI / 2);
  shared.tyre = new THREE.MeshStandardMaterial({ color: '#111216', roughness: 0.6 });
  shared.glassMaterial = new THREE.MeshStandardMaterial({ color: '#0b1222', roughness: 0.15, metalness: 0.6 });
  shared.head = new THREE.MeshBasicMaterial({ color: '#fff6d8' });
  shared.tail = new THREE.MeshBasicMaterial({ color: '#ff2d55' });
  return shared;
}

function makeCar(racer) {
  const parts = sharedParts();
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: racer.color, roughness: 0.32, metalness: 0.45 });
  const body = new THREE.Mesh(parts.body, paint);
  const glass = new THREE.Mesh(parts.glass, parts.glassMaterial);
  glass.position.set(-0.04, 0.3, 0);
  const spoiler = new THREE.Mesh(parts.spoiler, paint);
  spoiler.position.set(-0.55, 0.33, 0);
  car.add(body, glass, spoiler);
  const wheels = [];
  for (const x of [0.36, -0.36]) for (const z of [0.25, -0.25]) {
    const wheel = new THREE.Mesh(parts.wheel, parts.tyre);
    wheel.position.set(x, 0.12, z);
    wheels.push(wheel);
    car.add(wheel);
  }
  for (const z of [0.15, -0.15]) {
    const head = new THREE.Mesh(parts.light, parts.head); head.position.set(0.61, 0.13, z);
    const tail = new THREE.Mesh(parts.light, parts.tail); tail.position.set(-0.61, 0.16, z);
    car.add(head, tail);
  }
  const glowMaterial = new THREE.MeshBasicMaterial({ color: racer.color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(parts.glow, glowMaterial);
  glow.position.y = 0.015;
  const flameMaterial = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flame = new THREE.Mesh(parts.flame, flameMaterial);
  flame.position.set(-0.82, 0.14, 0);
  flame.visible = false;
  const badgeTexture = label(racer.marker, racer.color);
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture, depthWrite: false }));
  badge.position.set(0, 0.95, 0);
  badge.scale.setScalar(0.44);
  car.add(glow, flame, badge);
  car.userData = { wheels, flame, paint, glowMaterial, flameMaterial, badgeTexture, badge };
  return car;
}

function disposeCar(car) {
  const { paint, glowMaterial, flameMaterial, badgeTexture, badge } = car.userData;
  paint.dispose(); glowMaterial.dispose(); flameMaterial.dispose(); badgeTexture.dispose(); badge.material.dispose();
}

/**
 * Mount a persistent 3D circuit. Call attach(container) after each render to
 * move the canvas into the fresh DOM, and update(...) each animation frame
 * with the same arguments as the SVG track view.
 */
export function mountRace3D({ key, track = 'neon', reducedMotion = false }) {
  const theme = themes[track] ?? themes.neon;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(theme.sky);
  const canvas = renderer.domElement;
  canvas.className = 'race-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(theme.sky, 26, 60);
  const camera = new THREE.PerspectiveCamera(34, 2, 0.1, 120);
  scene.add(new THREE.HemisphereLight('#dfe6ff', '#2a2240', 1.6));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.position.set(-6, 14, 9);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(theme.edge, 1.2);
  rim.position.set(8, 4, -10);
  scene.add(rim);

  const owned = [];
  const keep = object => { owned.push(object); return object; };
  const ground = keep(new THREE.Mesh(new THREE.PlaneGeometry(140, 80), new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.95 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);
  if (theme.grid) {
    const grid = keep(new THREE.GridHelper(120, 120, theme.grid[0], theme.grid[1]));
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.position.y = -0.01;
    scene.add(grid);
  }
  if (track === 'space') {
    const stars = new Float32Array(900);
    for (let i = 0; i < stars.length; i += 3) { stars[i] = (Math.random() - 0.5) * 120; stars[i + 1] = 6 + Math.random() * 30; stars[i + 2] = -20 - Math.random() * 40; }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    scene.add(keep(new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ffffff', size: 0.12 }))));
  }

  const curve = courseCurve();
  scene.add(keep(ribbon(curve, -ROAD_HALF, ROAD_HALF, 0, new THREE.MeshStandardMaterial({ color: theme.road, roughness: 0.75 }))));
  const edgeMaterial = theme.kerb
    ? new THREE.MeshBasicMaterial({ map: canvasTexture(32, (ctx, s) => { ctx.fillStyle = theme.kerb; ctx.fillRect(0, 0, s, s / 2); ctx.fillStyle = theme.edge; ctx.fillRect(0, s / 2, s, s / 2); }) })
    : new THREE.MeshBasicMaterial({ color: theme.edge });
  if (edgeMaterial.map) { edgeMaterial.map.wrapS = edgeMaterial.map.wrapT = THREE.RepeatWrapping; }
  scene.add(keep(ribbon(curve, -ROAD_HALF - 0.14, -ROAD_HALF, 0.012, edgeMaterial)));
  scene.add(keep(ribbon(curve, ROAD_HALF, ROAD_HALF + 0.14, 0.012, edgeMaterial)));
  // Dashed centre line: short ribbons along the course.
  const lineMaterial = new THREE.MeshBasicMaterial({ color: theme.line });
  for (let u = 0.03; u < 0.97; u += 0.022) scene.add(keep(ribbon(curve, -0.035, 0.035, 0.014, lineMaterial, 6, u, u + 0.011)));
  // Start grid and chequered finish line across the road.
  const flag = chequer();
  flag.wrapS = flag.wrapT = THREE.RepeatWrapping;
  flag.repeat.set(1, 0.18);
  scene.add(keep(ribbon(curve, -ROAD_HALF, ROAD_HALF, 0.016, new THREE.MeshBasicMaterial({ map: flag }), 4, 0.988, 1)));
  scene.add(keep(ribbon(curve, -ROAD_HALF, ROAD_HALF, 0.016, new THREE.MeshBasicMaterial({ color: '#f4f4f4' }), 2, 0.012, 0.016)));
  // Finish arch.
  const end = curve.getPointAt(0.994);
  const tangent = curve.getTangentAt(0.994);
  const arch = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#d9dde6', metalness: 0.6, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const post = keep(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 12), postMaterial));
    post.position.set(0, 1.05, side * (ROAD_HALF + 0.3));
    arch.add(post);
  }
  const bannerTexture = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#0b0920'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = theme.edge; ctx.fillRect(0, s * 0.36, s, s * 0.28);
    ctx.fillStyle = '#0b0920'; ctx.font = '900 54px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FINISH', s / 2, s / 2 + 2);
  });
  const banner = keep(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, (ROAD_HALF + 0.3) * 2), [
    postMaterial, postMaterial, postMaterial, postMaterial,
    new THREE.MeshBasicMaterial({ map: bannerTexture }), new THREE.MeshBasicMaterial({ map: bannerTexture }),
  ]));
  banner.position.y = 2.05;
  arch.add(banner);
  arch.position.copy(end);
  arch.rotation.y = Math.atan2(-tangent.z, tangent.x);
  scene.add(arch);

  const cars = new Map();
  let container;
  let observer;
  let lost = false;
  const COURSE_HALF_WIDTH = 15.5;
  // Looking down at about 40 degrees from behind the start-side of the course.
  const viewDirection = new THREE.Vector3(0, 0.64, 0.77).normalize();
  const desiredTarget = new THREE.Vector3();
  const desiredPosition = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  let cameraReady = false;

  function resize() {
    if (!container) return;
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = 36;
    camera.updateProjectionMatrix();
  }

  function frame(players, trackLength, msAhead, sim) {
    const count = players.length;
    let leader;
    let packMin = Infinity;
    let packMax = -Infinity;
    players.forEach(racer => {
      let car = cars.get(racer.id);
      if (!car) { car = makeCar(racer); cars.set(racer.id, car); scene.add(car); }
      // Side-by-side lanes across the 3-unit road; cars shrink only for big fields.
      const spacing = Math.min(0.58, 2.7 / Math.max(1, count));
      const lane = (racer.marker - 1 - (count - 1) / 2) * spacing;
      car.scale.setScalar(Math.min(1, spacing / 0.58));
      const ahead = racer.finishedAt !== undefined ? 0 : racer.speed * msAhead / 1000;
      const u = THREE.MathUtils.clamp((racer.distance + ahead) / Math.max(1, trackLength), 0, 1) * 0.985 + 0.01;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
      car.position.set(p.x + n.x * lane, 0, p.z + n.z * lane);
      car.rotation.y = Math.atan2(-t.z, t.x);
      const boosting = racer.speed > 1.02;
      const { wheels, flame, flameMaterial } = car.userData;
      flame.visible = boosting && racer.finishedAt === undefined;
      if (!reducedMotion) {
        car.position.y = Math.abs(Math.sin((sim ?? performance.now()) / 90 + racer.marker)) * 0.02;
        flame.scale.x = 0.7 + Math.random() * 0.6;
        flameMaterial.opacity = 0.6 + Math.random() * 0.4;
        for (const wheel of wheels) wheel.rotation.z = -u * 260;
      }
      if (!leader || u > leader.u) leader = { u, p };
      packMin = Math.min(packMin, car.position.x);
      packMax = Math.max(packMax, car.position.x);
    });
    for (const [id, car] of cars) {
      if (players.some(racer => racer.id === id)) continue;
      scene.remove(car); disposeCar(car); cars.delete(id);
    }
    // Countdown: sweep from the start grid up to the overview; then a gentle
    // drift that leans towards the leader without losing the course.
    // Broadcast camera: frame the whole pack with a margin and pan along the
    // course at a low, dramatic angle; reduced motion keeps a static overview.
    let centre = 0.4;
    let half = COURSE_HALF_WIDTH;
    if (!reducedMotion && Number.isFinite(packMin)) {
      half = THREE.MathUtils.clamp((packMax - packMin) / 2 + 5.5, 7.5, COURSE_HALF_WIDTH);
      centre = THREE.MathUtils.clamp((packMin + packMax) / 2, -COURSE_HALF_WIDTH + half, COURSE_HALF_WIDTH - half + 0.8);
    }
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const distance = half / tanHalf;
    desiredTarget.set(centre, 0, -0.35);
    desiredPosition.copy(desiredTarget).addScaledVector(viewDirection, distance);
    if (reducedMotion || !cameraReady) { cameraTarget.copy(desiredTarget); cameraPosition.copy(desiredPosition); cameraReady = true; }
    else {
      cameraTarget.lerp(desiredTarget, 0.05);
      cameraPosition.lerp(desiredPosition, 0.05);
    }
    const drift = reducedMotion ? 0 : Math.sin(performance.now() / 5200) * 0.35;
    camera.position.set(cameraPosition.x + drift, cameraPosition.y, cameraPosition.z);
    camera.lookAt(cameraTarget);
    renderer.render(scene, camera);
  }

  const onLost = event => { event.preventDefault(); lost = true; if (container) delete container.dataset.race3d; };
  canvas.addEventListener('webglcontextlost', onLost);

  return {
    key,
    get ready() { return !lost && Boolean(container?.isConnected); },
    attach(next) {
      if (!next) return;
      if (container !== next) {
        observer?.disconnect();
        container = next;
        container.append(canvas);
        observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();
      }
      if (!lost) container.dataset.race3d = 'ready';
    },
    update(players, trackLength, msAhead = 0, _reduced = false, sim) {
      if (lost || !container?.isConnected) return false;
      frame(players, trackLength, msAhead, sim);
      return true;
    },
    dispose() {
      observer?.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      for (const car of cars.values()) disposeCar(car);
      cars.clear();
      scene.traverse(object => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
        for (const material of materials) { material.map?.dispose(); material.dispose(); }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (container) delete container.dataset.race3d;
    },
  };
}
