// Quiz Race 3D circuit for the TV. Purely presentational: it draws the same
// course as the SVG track and places cars from the server's race snapshot.
// Visual positions never decide who wins.
import * as THREE from '/vendor/three.module.js';
import { circuitPoints } from './race-course.js';

export function courseCurve() {
  return new THREE.CatmullRomCurve3(circuitPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal', .5);
}

const ROAD_HALF = 1.85;
const LANES = 6;
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
      positions.push(p.x + n.x * offset, p.y + y, p.z + n.z * offset);
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
  shared.glow = new THREE.PlaneGeometry(1.25, 0.6).rotateX(-Math.PI / 2);
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
  for (let u = 0.02; u < 0.985; u += 0.012) scene.add(keep(ribbon(curve, -0.04, 0.04, 0.014, lineMaterial, 4, u, u + 0.006)));
  // Start grid and chequered finish line across the road.
  const flag = chequer();
  flag.wrapS = flag.wrapT = THREE.RepeatWrapping;
  flag.repeat.set(1, 0.18);
  // One lap: the chequered start/finish line sits at u = 0 on the main straight.
  scene.add(keep(ribbon(curve, -ROAD_HALF, ROAD_HALF, 0.016, new THREE.MeshBasicMaterial({ map: flag }), 4, 0.994, 1)));
  // Finish arch over the line.
  const end = curve.getPointAt(0.997);
  const tangent = curve.getTangentAt(0.997);
  const arch = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#4a5066', metalness: 0.55, roughness: 0.35 });
  // Start/finish gantry: a post either side of the road (clear of the kerbs)
  // carrying a deep beam with the FINISH board on both faces and a row of
  // start lights, so it reads as one square-on structure from any angle.
  const span = ROAD_HALF + .45;
  for (const side of [-1, 1]) {
    const post = keep(new THREE.Mesh(new THREE.BoxGeometry(.2, 2.5, .2), postMaterial));
    post.position.set(0, 1.25, side * span);
    arch.add(post);
    const foot = keep(new THREE.Mesh(new THREE.BoxGeometry(.42, .14, .42), postMaterial));
    foot.position.set(0, .07, side * span);
    arch.add(foot);
  }
  // The board is long and shallow (about 8:1), so its canvas is too; the
  // text faces along the road (the long sides) and the top is chequered.
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 1024; bannerCanvas.height = 128;
  const bctx = bannerCanvas.getContext('2d');
  bctx.fillStyle = '#0b0920'; bctx.fillRect(0, 0, 1024, 128);
  bctx.fillStyle = theme.edge; bctx.fillRect(0, 10, 1024, 108);
  bctx.fillStyle = '#0b0920'; bctx.font = '900 84px system-ui, sans-serif'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  bctx.fillText('FINISH', 512, 68);
  const bannerTexture = new THREE.CanvasTexture(bannerCanvas);
  bannerTexture.colorSpace = THREE.SRGBColorSpace;
  bannerTexture.anisotropy = 4;
  const bannerFace = new THREE.MeshBasicMaterial({ map: bannerTexture });
  const topChequer = chequer();
  topChequer.wrapS = topChequer.wrapT = THREE.RepeatWrapping;
  topChequer.repeat.set(.25, 3.5);
  const bannerTop = new THREE.MeshBasicMaterial({ map: topChequer });
  // BoxGeometry faces: +x, -x (the long sides facing along the road), +y, -y, +z, -z (the ends).
  const banner = keep(new THREE.Mesh(new THREE.BoxGeometry(.34, .62, span * 2 + .2), [
    bannerFace, bannerFace, bannerTop, postMaterial, postMaterial, postMaterial,
  ]));
  banner.position.y = 2.35;
  arch.add(banner);
  const lamp = keep(new THREE.SphereGeometry(.07, 12, 8));
  const lampMaterial = new THREE.MeshBasicMaterial({ color: '#ff2d55' });
  for (let k = 0; k < 5; k++) {
    const light = keep(new THREE.Mesh(lamp, lampMaterial));
    light.position.set(-.2, 2.02, (k - 2) * .34);
    arch.add(light);
  }
  arch.position.copy(end);
  arch.rotation.y = Math.atan2(-tangent.z, tangent.x);
  scene.add(arch);

  // The bridge: walls along the raised section, pillars down to the ground
  // (kept clear of the road passing underneath).
  const wallMaterial = new THREE.MeshStandardMaterial({ color: theme.kerb ? '#d9dde6' : theme.edge, roughness: .5, metalness: .2,
    emissive: theme.kerb ? '#000000' : theme.edge, emissiveIntensity: theme.kerb ? 0 : .35 });
  const pillarMaterial = new THREE.MeshStandardMaterial({ color: '#8b93a6', roughness: .6 });
  const pillar = keep(new THREE.CylinderGeometry(.16, .2, 1, 10));
  const wallGeometry = new THREE.BoxGeometry(.2, .34, .1);
  let raisedFrom = 1, raisedTo = 0;
  for (let i = 0; i < 400; i++) {
    const u = i / 400;
    const p = curve.getPointAt(u);
    if (p.y < .22) continue;
    raisedFrom = Math.min(raisedFrom, u); raisedTo = Math.max(raisedTo, u);
    const t = curve.getTangentAt(u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(p.x + n.x * side * (ROAD_HALF + .2), p.y + .17, p.z + n.z * side * (ROAD_HALF + .2));
      wall.rotation.y = Math.atan2(-t.z, t.x);
      scene.add(keep(wall));
      if (i % 14 === 0 && p.y > .6 && Math.hypot(p.x, p.z) > ROAD_HALF * 2.1) {
        const post = new THREE.Mesh(pillar, pillarMaterial);
        post.scale.y = p.y;
        post.position.set(p.x + n.x * side * (ROAD_HALF - .3), p.y / 2, p.z + n.z * side * (ROAD_HALF - .3));
        scene.add(keep(post));
      }
    }
  }
  // Underside of the raised deck so the bridge reads as solid from the side.
  const deck = new THREE.MeshStandardMaterial({ color: '#2a2f3d', roughness: .8, side: THREE.DoubleSide });
  if (raisedTo > raisedFrom) scene.add(keep(ribbon(curve, -ROAD_HALF - .3, ROAD_HALF + .3, -.18, deck, 120, raisedFrom, raisedTo)));

  // A grandstand overlooking the right-hand loop.
  const stand = new THREE.Group();
  const seatColours = ['#ff3fb4', '#1dfbe0', '#ffd34d', '#8f6bff', '#ff8f5a'];
  for (let row = 0; row < 4; row++) {
    const step = keep(new THREE.Mesh(new THREE.BoxGeometry(9, .32, .7), new THREE.MeshStandardMaterial({ color: '#30354a', roughness: .7 })));
    step.position.set(0, .16 + row * .32, -row * .62);
    stand.add(step);
    for (let seat = 0; seat < 18; seat++) {
      const fan = keep(new THREE.Mesh(new THREE.BoxGeometry(.28, .3, .22), new THREE.MeshStandardMaterial({ color: seatColours[(seat * 7 + row * 3) % seatColours.length], roughness: .6 })));
      fan.position.set(-4.2 + seat * .5, .47 + row * .32, -row * .62);
      stand.add(fan);
    }
  }
  // Behind the far side of the circuit, facing the TV camera: always in
  // shot as a backdrop and never hidden under the standings strip.
  stand.position.set(11.6, 0, -10.4);
  scene.add(stand);

  const cars = new Map();
  let container;
  let observer;
  let lost = false;
  const COURSE_HALF_WIDTH = 19.5;
  const courseLength = curve.getLength();
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
    let packNear = -Infinity;
    let packFar = Infinity;
    players.forEach(racer => {
      let car = cars.get(racer.id);
      if (!car) { car = makeCar(racer); cars.set(racer.id, car); scene.add(car); }
      // Up to six lanes across the road; bigger fields form a staggered second
      // row so all twelve cars stay clear of each other.
      const perRow = Math.min(LANES, count);
      const slot = (racer.marker - 1) % perRow;
      const row = Math.floor((racer.marker - 1) / perRow);
      // Lanes as wide as the road allows (a car is ~0.6 wide), never touching.
      const spacing = Math.min(0.95, (ROAD_HALF * 2 - .5) / perRow);
      const lane = (slot - (perRow - 1) / 2) * spacing;
      car.scale.setScalar(Math.min(1, spacing / 0.66));
      const ahead = racer.finishedAt !== undefined ? 0 : racer.speed * msAhead / 1000;
      const progress = THREE.MathUtils.clamp((racer.distance + ahead) / Math.max(1, trackLength), 0, 1);
      // The grid lines up a car-length past the start/finish arch.
      // Staggered like a real grid: alternate slots sit half a car further
      // back, and the whole grid starts clear of the start/finish gantry.
      const back = (Math.ceil(count / perRow) - 1) * 1.5 + (perRow > 1 ? .55 : 0);
      const gridStart = (back + .9) / courseLength;
      const u = THREE.MathUtils.euclideanModulo(gridStart + progress * (1 - gridStart) - (row * 1.5 + (slot % 2) * .55) / courseLength, 1);
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
      car.position.set(p.x + n.x * lane, p.y, p.z + n.z * lane);
      car.rotation.order = 'YXZ';
      car.rotation.y = Math.atan2(-t.z, t.x);
      car.rotation.z = Math.asin(THREE.MathUtils.clamp(t.y, -1, 1));
      const boosting = racer.speed > 1.02;
      const { wheels, flame, flameMaterial } = car.userData;
      flame.visible = boosting && racer.finishedAt === undefined;
      if (!reducedMotion) {
        car.position.y += Math.abs(Math.sin((sim ?? performance.now()) / 90 + racer.marker)) * 0.02;
        flame.scale.x = 0.7 + Math.random() * 0.6;
        flameMaterial.opacity = 0.6 + Math.random() * 0.4;
        for (const wheel of wheels) wheel.rotation.z = -u * 260;
      }
      if (!leader || progress > leader.progress) leader = { progress, p };
      packMin = Math.min(packMin, car.position.x);
      packMax = Math.max(packMax, car.position.x);
      packNear = Math.max(packNear, car.position.z);
      packFar = Math.min(packFar, car.position.z);
    });
    for (const [id, car] of cars) {
      if (players.some(racer => racer.id === id)) continue;
      scene.remove(car); disposeCar(car); cars.delete(id);
    }
    // Countdown: sweep from the start grid up to the overview; then a gentle
    // drift that leans towards the leader without losing the course.
    // Broadcast camera: frame the whole pack with a margin and pan along the
    // course at a low, dramatic angle; reduced motion keeps a static overview.
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    // Whole course: the overview distance, used for reduced motion and as a cap.
    const overviewDistance = Math.max(COURSE_HALF_WIDTH / tanH, 11.5 / tanV);
    let centre = -0.3;
    let depth = 0;
    let distance = overviewDistance;
    if (!reducedMotion && Number.isFinite(packMin)) {
      // Fit the pack across (horizontal FOV) and into the screen (vertical FOV).
      const across = (packMax - packMin) / 2 + 5.5;
      const into = (packNear - packFar) / 2 * .85 + 3.6;
      distance = THREE.MathUtils.clamp(Math.max(across / tanH, into / tanV), 8 / tanH, overviewDistance);
      centre = (packMin + packMax) / 2;
      depth = THREE.MathUtils.clamp((packNear + packFar) / 2, -6, 6);
    }
    desiredTarget.set(centre, 0, depth);
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
