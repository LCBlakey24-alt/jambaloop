// Quiz Race 3D circuit for the TV. Purely presentational: it draws the same
// course as the SVG track and places cars from the server's race snapshot.
// Visual positions never decide who wins.
import * as THREE from '/vendor/three.module.js';
import { circuits } from './race-course.js';

export function courseCurve(course = 'medium') {
  const { points } = circuits[course] ?? circuits.medium;
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal', .5);
}

// A small repeatable random stream, so the crowd and scenery are the same on every TV and every frame.
function seeded(seed) {
  let value = seed >>> 0;
  return () => { value = (value + 0x6D2B79F5) >>> 0; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const ROAD_HALF = 1.85;
const LANES = 6;
const themes = {
  // The default circuit: a floodlit night track. Grey tarmac on a dark infield with red and white kerbs,
  // so the road always reads against the ground (it used to be dark purple on near-black with glowing edges).
  neon:   { ground: '#16233a', verge: '#24406b', road: '#454b5c', edge: '#f4f1ea', kerb: '#e0364f', line: '#f4d35e', sky: '#1b2444' },
  desert: { ground: '#b88a52', verge: '#d2a468', road: '#3b3330', edge: '#f4f1ea', kerb: '#d6452f', line: '#f2d16b', sky: '#e9b979' },
  snow:   { ground: '#e6eef6', verge: '#cfdcea', road: '#39414f', edge: '#ffffff', kerb: '#2f7de0', line: '#ffffff', sky: '#b9d4ee' },
  jungle: { ground: '#1f4d2e', verge: '#2f6b3f', road: '#2e3331', edge: '#f4f1ea', kerb: '#e0a12f', line: '#f4f1ea', sky: '#2c5e45' },
  space:  { ground: '#0a1024', verge: '#1a2350', grid: ['#3d4a9a', '#1c2552'], road: '#3a3f58', edge: '#c9b8ff', line: '#ffd34d', sky: '#070a18' },
};

/** A vertical strip following one side of the course, from `top` down to `bottom`: the side of the slab. */
function skirt(curve, offset, top, bottom, material, samples = 320) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const x = p.x + n.x * offset; const z = p.z + n.z * offset;
    // On the ground the side runs down to the floor; on the bridge it is only the edge of the deck,
    // so the road passing underneath stays open.
    positions.push(x, p.y + top, z, x, p.y > 0.3 ? p.y + top - 0.22 : Math.min(p.y + top, bottom), z);
    if (i) { const a = (i - 1) * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

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

// A low, wide sports car: wedge nose, fastback glass cabin, big rimmed wheels,
// front splitter, raised rear wing, full-width tail light and twin exhausts.
function profile(points, depth, bevel = 0.03) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => (index ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 2, curveSegments: 4 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function carBody() {
  return profile([[-0.66, 0.07], [0.6, 0.07], [0.72, 0.1], [0.69, 0.15], [0.26, 0.215], [-0.28, 0.235], [-0.64, 0.27], [-0.7, 0.16]], 0.5);
}

const shared = {};
function sharedParts() {
  if (shared.body) return shared;
  shared.body = carBody();
  // Cabin: raked windscreen, low roof, long fastback.
  shared.glass = profile([[0.24, 0.2], [0.02, 0.345], [-0.2, 0.35], [-0.54, 0.25], [-0.5, 0.2]], 0.38, 0.02);
  shared.roof = new THREE.BoxGeometry(0.2, 0.015, 0.3);
  shared.wheel = new THREE.CylinderGeometry(0.135, 0.135, 0.11, 22).rotateX(Math.PI / 2);
  shared.rim = new THREE.CylinderGeometry(0.075, 0.075, 0.115, 10).rotateX(Math.PI / 2);
  shared.light = new THREE.BoxGeometry(0.05, 0.03, 0.13);
  shared.tailbar = new THREE.BoxGeometry(0.03, 0.035, 0.48);
  shared.splitter = new THREE.BoxGeometry(0.16, 0.02, 0.6);
  shared.skirt = new THREE.BoxGeometry(0.62, 0.035, 0.58);
  shared.spoiler = new THREE.BoxGeometry(0.17, 0.025, 0.62);
  shared.strut = new THREE.BoxGeometry(0.04, 0.13, 0.03);
  shared.intake = new THREE.BoxGeometry(0.2, 0.07, 0.56);
  shared.exhaust = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8).rotateZ(Math.PI / 2);
  shared.flame = new THREE.ConeGeometry(0.07, 0.42, 10).rotateZ(Math.PI / 2);
  shared.glow = new THREE.PlaneGeometry(1.45, 0.66).rotateX(-Math.PI / 2);
  shared.tyre = new THREE.MeshStandardMaterial({ color: '#0d0e12', roughness: 0.7 });
  shared.rimMaterial = new THREE.MeshStandardMaterial({ color: '#d7dbe3', roughness: 0.25, metalness: 0.9 });
  shared.carbon = new THREE.MeshStandardMaterial({ color: '#15171d', roughness: 0.45, metalness: 0.3 });
  shared.glassMaterial = new THREE.MeshStandardMaterial({ color: '#0a1020', roughness: 0.08, metalness: 0.75 });
  shared.head = new THREE.MeshBasicMaterial({ color: '#fff6d8' });
  shared.tail = new THREE.MeshBasicMaterial({ color: '#ff2d55' });
  return shared;
}

function makeCar(racer) {
  const parts = sharedParts();
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: racer.color, roughness: 0.22, metalness: 0.6 });
  const at = (mesh, x, y, z = 0) => { mesh.position.set(x, y, z); car.add(mesh); return mesh; };
  at(new THREE.Mesh(parts.body, paint), 0, 0);
  at(new THREE.Mesh(parts.glass, parts.glassMaterial), 0, 0);
  at(new THREE.Mesh(parts.roof, paint), -0.09, 0.355);
  at(new THREE.Mesh(parts.splitter, parts.carbon), 0.66, 0.06);
  at(new THREE.Mesh(parts.skirt, parts.carbon), 0, 0.065);
  at(new THREE.Mesh(parts.intake, parts.carbon), -0.2, 0.15);
  at(new THREE.Mesh(parts.spoiler, paint), -0.62, 0.42);
  for (const z of [0.2, -0.2]) at(new THREE.Mesh(parts.strut, parts.carbon), -0.62, 0.34, z);
  const wheels = [];
  for (const x of [0.43, -0.42]) for (const z of [0.265, -0.265]) {
    const wheel = at(new THREE.Mesh(parts.wheel, parts.tyre), x, 0.135, z);
    wheel.add(new THREE.Mesh(parts.rim, parts.rimMaterial));
    wheels.push(wheel);
  }
  for (const z of [0.17, -0.17]) at(new THREE.Mesh(parts.light, parts.head), 0.685, 0.14, z);
  at(new THREE.Mesh(parts.tailbar, parts.tail), -0.705, 0.2);
  for (const z of [0.1, -0.1]) at(new THREE.Mesh(parts.exhaust, parts.rimMaterial), -0.71, 0.11, z);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: racer.color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(parts.glow, glowMaterial);
  glow.position.y = 0.015;
  const flameMaterial = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flame = new THREE.Mesh(parts.flame, flameMaterial);
  flame.position.set(-0.94, 0.12, 0);
  flame.visible = false;
  const badgeTexture = label(racer.marker, racer.color);
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture, depthWrite: false }));
  badge.position.set(0, 0.98, 0);
  badge.scale.setScalar(0.44);
  // The outer, redder flame of a kart that is on fire.
  const fireMaterial = new THREE.MeshBasicMaterial({ color: '#ff2d16', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const fire = new THREE.Mesh(parts.flame, fireMaterial);
  fire.position.set(-1.08, 0.2, 0);
  fire.visible = false;
  car.add(glow, flame, fire, badge);
  car.userData = { wheels, flame, fire, glow, paint, glowMaterial, flameMaterial, fireMaterial, badgeTexture, badge };
  dressCar(car, racer).catch(() => { /* keep the drawn car */ });
  return car;
}

// Kenney Car Kit go-karts (CC0): five drivers shared round the grid, told apart by colour and number. The drawn car above
// stays as the fallback until a model has loaded, and for good if it fails.
const carModels = ['kart-oobi', 'kart-oodi', 'kart-ooli', 'kart-oopi', 'kart-oozi'];
const modelCache = new Map();
function loadCarModel(name) {
  if (!modelCache.has(name)) modelCache.set(name, import('/three-addons/GLTFLoader.js')
    .then(({ GLTFLoader }) => new GLTFLoader().loadAsync(`/models/cars/${name}.glb`)).then(gltf => gltf.scene));
  return modelCache.get(name);
}

// Kenney Racing Kit (CC0): grandstands, pit garages, light towers, banner towers and flags round the circuit.
// Each is loaded once and cloned; if a model fails to load, that prop is simply missing.
const propCache = new Map();
function loadProp(name) {
  if (!propCache.has(name)) propCache.set(name, import('/three-addons/GLTFLoader.js')
    .then(({ GLTFLoader }) => new GLTFLoader().loadAsync(`/models/racing/${name}.glb`)).then(gltf => gltf.scene));
  return propCache.get(name);
}

/** Swap the drawn body for a model, keeping the racer's glow, flame and number. */
async function dressCar(car, racer) {
  const source = await loadCarModel(carModels[(racer.marker - 1) % carModels.length]);
  if (!car.parent) return; // the race was torn down while loading
  const model = source.clone(true);
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  // The kit's cars point along +z; the track drives cars along +x.
  model.rotation.y = Math.PI / 2;
  // Sized to its lane: no longer than the drawn car and no wider than a lane.
  model.scale.setScalar(Math.min(1.35 / Math.max(size.z, .001), .6 / Math.max(size.x, .001)));
  const tint = new THREE.Color('#ffffff').lerp(new THREE.Color(racer.color), .45);
  const paints = [], wheels = [];
  model.traverse(node => {
    if (node.isMesh) {
      node.material = node.material.clone();
      node.material.color.copy(tint);
      paints.push(node.material);
    }
    if (/^wheel/.test(node.name)) wheels.push(node);
  });
  const { glow, flame, fire, badge } = car.userData;
  for (const child of [...car.children]) if (![glow, flame, fire, badge].includes(child)) car.remove(child);
  car.add(model);
  Object.assign(car.userData, { modelPaints: paints, modelWheels: wheels, wheels: [] });
}

function disposeCar(car) {
  for (const material of car.userData.modelPaints ?? []) material.dispose();
  const { paint, glowMaterial, flameMaterial, fireMaterial, badgeTexture, badge } = car.userData;
  paint.dispose(); glowMaterial.dispose(); flameMaterial.dispose(); fireMaterial.dispose(); badgeTexture.dispose(); badge.material.dispose();
}

/**
 * Mount a persistent 3D circuit. Call attach(container) after each render to
 * move the canvas into the fresh DOM, and update(...) each animation frame
 * with the same arguments as the SVG track view.
 */
export function mountRace3D({ key, track = 'neon', course = 'medium', reducedMotion = false }) {
  const circuit = circuits[course] ?? circuits.medium;
  const theme = themes[track] ?? themes.neon;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(theme.sky);
  const canvas = renderer.domElement;
  canvas.className = 'race-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  // Fog starts well behind the far corners so the back of the circuit does not fade into the ground.
  scene.fog = new THREE.Fog(theme.sky, 60, 150);
  // A nearer "near" plane keeps the depth buffer precise enough to separate road, kerbs and ground.
  const camera = new THREE.PerspectiveCamera(34, 2, 0.6, 190);
  scene.add(new THREE.HemisphereLight('#dfe6ff', '#2a2240', 1.6));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.position.set(-6, 14, 9);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(theme.edge, 1.2);
  rim.position.set(8, 4, -10);
  scene.add(rim);

  const owned = [];
  const keep = object => { owned.push(object); return object; };
  const ground = keep(new THREE.Mesh(new THREE.PlaneGeometry(220, 140), new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.95 })));
  ground.rotation.x = -Math.PI / 2;
  // Well below the road: at -0.02 the far side of the track flickered into the ground.
  ground.position.y = -0.3;
  scene.add(ground);
  if (theme.grid) {
    const grid = keep(new THREE.GridHelper(120, 120, theme.grid[0], theme.grid[1]));
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    grid.position.y = -0.28;
    scene.add(grid);
  }
  if (track === 'space') {
    const stars = new Float32Array(900);
    for (let i = 0; i < stars.length; i += 3) { stars[i] = (Math.random() - 0.5) * 120; stars[i + 1] = 6 + Math.random() * 30; stars[i + 2] = -20 - Math.random() * 40; }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    scene.add(keep(new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ffffff', size: 0.12 }))));
  }

  const curve = courseCurve(course);
  // Everything painted on the road is drawn in front of the layer beneath it, so kerbs, lines and the
  // chequered flag never flicker into the tarmac, and the tarmac never flickers into the verge.
  const onTop = (material, level) => Object.assign(material, { polygonOffset: true, polygonOffsetFactor: -level, polygonOffsetUnits: -level * 4 });
  // A wide verge under the road and a skirt down each side, so the track is a raised slab on the ground.
  const vergeMaterial = new THREE.MeshStandardMaterial({ color: theme.verge ?? theme.ground, roughness: 0.95 });
  scene.add(keep(ribbon(curve, -ROAD_HALF - 0.9, ROAD_HALF + 0.9, -0.05, vergeMaterial)));
  const skirtMaterial = new THREE.MeshStandardMaterial({ color: '#1c2130', roughness: 0.9, side: THREE.DoubleSide });
  for (const side of [-1, 1]) scene.add(keep(skirt(curve, side * (ROAD_HALF + 0.9), -0.05, -0.3, skirtMaterial)));
  scene.add(keep(ribbon(curve, -ROAD_HALF, ROAD_HALF, 0, onTop(new THREE.MeshStandardMaterial({ color: theme.road, roughness: 0.82 }), 1))));
  const edgeMaterial = theme.kerb
    ? new THREE.MeshBasicMaterial({ map: canvasTexture(32, (ctx, s) => { ctx.fillStyle = theme.kerb; ctx.fillRect(0, 0, s, s / 2); ctx.fillStyle = theme.edge; ctx.fillRect(0, s / 2, s, s / 2); }) })
    : new THREE.MeshBasicMaterial({ color: theme.edge });
  if (edgeMaterial.map) { edgeMaterial.map.wrapS = edgeMaterial.map.wrapT = THREE.RepeatWrapping; }
  onTop(edgeMaterial, 2);
  scene.add(keep(ribbon(curve, -ROAD_HALF - 0.26, -ROAD_HALF, 0.02, edgeMaterial)));
  scene.add(keep(ribbon(curve, ROAD_HALF, ROAD_HALF + 0.26, 0.02, edgeMaterial)));
  // Dashed centre line: short ribbons along the course.
  const lineMaterial = onTop(new THREE.MeshBasicMaterial({ color: theme.line }), 2);
  for (let u = 0.02; u < 0.985; u += 0.012) scene.add(keep(ribbon(curve, -0.04, 0.04, 0.014, lineMaterial, 4, u, u + 0.006)));
  // Start grid and chequered finish line across the road.
  const flag = chequer();
  flag.wrapS = flag.wrapT = THREE.RepeatWrapping;
  flag.repeat.set(1, 0.18);
  // One lap: the chequered start/finish line sits at u = 0 on the main straight.
  scene.add(keep(ribbon(curve, -ROAD_HALF, ROAD_HALF, 0.024, onTop(new THREE.MeshBasicMaterial({ map: flag }), 3), 4, 0.994, 1)));
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
  const raised = [];
  for (let i = 0; i < 400; i++) {
    const u = i / 400;
    const p = curve.getPointAt(u);
    if (p.y < .22) continue;
    if (raised.length && i - raised.at(-1).last === 1) { raised.at(-1).to = u; raised.at(-1).last = i; } else raised.push({ from: u, to: u, last: i });
    const t = curve.getTangentAt(u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(p.x + n.x * side * (ROAD_HALF + .2), p.y + .17, p.z + n.z * side * (ROAD_HALF + .2));
      wall.rotation.y = Math.atan2(-t.z, t.x);
      scene.add(keep(wall));
      if (i % 14 === 0 && p.y > .6 && circuit.crossing.every(([cx, cz]) => Math.hypot(p.x - cx, p.z - cz) > ROAD_HALF * 2.1)) {
        const post = new THREE.Mesh(pillar, pillarMaterial);
        post.scale.y = p.y;
        post.position.set(p.x + n.x * side * (ROAD_HALF - .3), p.y / 2, p.z + n.z * side * (ROAD_HALF - .3));
        scene.add(keep(post));
      }
    }
  }
  // Underside of the raised deck so the bridge reads as solid from the side.
  const deck = new THREE.MeshStandardMaterial({ color: '#2a2f3d', roughness: .8, side: THREE.DoubleSide });
  for (const { from, to } of raised) if (to > from) scene.add(keep(ribbon(curve, -ROAD_HALF - .3, ROAD_HALF + .3, -.18, deck, 60, from, to)));

  // Where the road is, sampled once: used to keep the crowd and the scenery off every part of the lap.
  const roadSamples = [];
  for (let i = 0; i < 480; i++) roadSamples.push(curve.getPointAt(i / 480));
  const clearOfRoad = (x, z, gap) => roadSamples.every(p => (p.x - x) ** 2 + (p.z - z) ** 2 > gap * gap);
  const bounds = roadSamples.reduce((box, p) => ({ minX: Math.min(box.minX, p.x), maxX: Math.max(box.maxX, p.x), minZ: Math.min(box.minZ, p.z), maxZ: Math.max(box.maxZ, p.z) }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  const random = seeded(course.length * 7919 + track.length * 104729);
  const GROUND = -0.3;

  // The crowd: little people (a body and a head) standing three deep along both sides of the road,
  // drawn as two instanced meshes so a thousand of them cost two draw calls. They bob in frame().
  const people = [];
  const crowdColours = ['#ff5d8f', '#ffd34d', '#4fd1c5', '#8f6bff', '#ff8f5a', '#f4f1ea', '#5aa9ff', '#7bd66a', '#e0364f'];
  const skinTones = ['#f6d3b3', '#e8b98f', '#c98f62', '#9a6642', '#6f4628'];
  for (let i = 0; i < 620; i++) {
    const u = i / 620;
    const p = curve.getPointAt(u);
    if (p.y > .12) continue;
    const t = curve.getTangentAt(u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
      // Gaps between groups, so it reads as a crowd and not a fence.
      if (Math.sin(u * 61 + side * 2.1) + Math.sin(u * 23 + row) * .5 < -.72) continue;
      const out = ROAD_HALF + 1.5 + row * .42 + random() * .12;
      const x = p.x + n.x * side * out + (random() - .5) * .16;
      const z = p.z + n.z * side * out + (random() - .5) * .16;
      if (!clearOfRoad(x, z, out - .2)) continue;
      people.push({ x, z, lift: row * .13, size: .8 + random() * .35, phase: random() * Math.PI * 2, pace: 5 + random() * 4, turn: Math.atan2(-n.x * side, -n.z * side),
        shirt: crowdColours[Math.floor(random() * crowdColours.length)], skin: skinTones[Math.floor(random() * skinTones.length)] });
    }
  }
  const bodies = keep(new THREE.InstancedMesh(new THREE.CapsuleGeometry(.11, .2, 3, 8), new THREE.MeshStandardMaterial({ roughness: .8 }), people.length));
  const heads = keep(new THREE.InstancedMesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshStandardMaterial({ roughness: .7 }), people.length));
  const colour = new THREE.Color();
  people.forEach((person, i) => { bodies.setColorAt(i, colour.set(person.shirt)); heads.setColorAt(i, colour.set(person.skin)); });
  const personMatrix = new THREE.Matrix4();
  const personScale = new THREE.Vector3();
  const personPosition = new THREE.Vector3();
  const noTurn = new THREE.Quaternion();
  function placeCrowd(time) {
    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      // A hop, not a float: people bounce off the ground and land again.
      const hop = time === undefined ? 0 : Math.abs(Math.sin(time * person.pace / 1000 + person.phase)) * .13 * person.size;
      const feet = GROUND + person.lift + hop;
      personScale.setScalar(person.size);
      bodies.setMatrixAt(i, personMatrix.compose(personPosition.set(person.x, feet + .21 * person.size, person.z), noTurn, personScale));
      heads.setMatrixAt(i, personMatrix.compose(personPosition.set(person.x, feet + .5 * person.size, person.z), noTurn, personScale));
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }
  placeCrowd();
  bodies.frustumCulled = heads.frustumCulled = false;
  if (people.length) scene.add(bodies, heads);

  // Scenery beyond the crowd, different on each track theme: trees, cacti, pines, palms or crystals,
  // with rocks, tyre stacks at the corners, floodlights and a few trackside boards.
  const flora = {
    neon:   { trunk: '#5b4636', leaf: ['#2f7d5b', '#3b9a6d', '#256b52'], shape: 'round' },
    desert: { trunk: '#3f7d4a', leaf: ['#4c9a58', '#3f8a4d'], shape: 'cactus' },
    snow:   { trunk: '#5b4636', leaf: ['#2f6e62', '#e9f2f9', '#3d8576'], shape: 'pine' },
    jungle: { trunk: '#6b4a2b', leaf: ['#2fa35a', '#49c46f', '#1f8a4a'], shape: 'palm' },
    space:  { trunk: '#3d4a9a', leaf: ['#8f6bff', '#4fe3da', '#ff7ad9'], shape: 'crystal' },
  }[track] ?? { trunk: '#5b4636', leaf: ['#2f7d5b'], shape: 'round' };
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: flora.trunk, roughness: .9 });
  const leafMaterials = flora.leaf.map(leaf => new THREE.MeshStandardMaterial({ color: leaf, roughness: .85, flatShading: true }));
  const trunkGeometry = keep(new THREE.CylinderGeometry(.09, .13, 1, 7));
  const leafGeometry = keep({ round: new THREE.IcosahedronGeometry(.62, 0), pine: new THREE.ConeGeometry(.6, 1.5, 7), palm: new THREE.ConeGeometry(.9, .4, 6),
    cactus: new THREE.CapsuleGeometry(.2, .9, 3, 8), crystal: new THREE.OctahedronGeometry(.5, 0) }[flora.shape]);
  const rockGeometry = keep(new THREE.DodecahedronGeometry(.4, 0));
  const rockMaterial = new THREE.MeshStandardMaterial({ color: track === 'snow' ? '#b9c6d6' : track === 'desert' ? '#9a6f43' : '#5a6072', roughness: .95, flatShading: true });
  const scatter = new THREE.Group();
  for (let tries = 0, placed = 0; tries < 900 && placed < 150; tries++) {
    const x = bounds.minX - 9 + random() * (bounds.maxX - bounds.minX + 18);
    const z = bounds.minZ - 10 + random() * (bounds.maxZ - bounds.minZ + 15);
    // Clear of the road and the crowd; nothing tall right in front of the camera.
    if (!clearOfRoad(x, z, ROAD_HALF + 3.6)) continue;
    const tall = z < bounds.maxZ + 1;
    placed++;
    if (!tall || random() < .22) {
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(x, GROUND + .12, z);
      rock.scale.set(.6 + random() * .9, .4 + random() * .5, .6 + random() * .9);
      rock.rotation.y = random() * 6;
      scatter.add(rock);
      continue;
    }
    const height = .8 + random() * .7;
    const tree = new THREE.Group();
    const leaf = new THREE.Mesh(leafGeometry, leafMaterials[Math.floor(random() * leafMaterials.length)]);
    if (flora.shape === 'cactus') { leaf.position.y = .6 * height; leaf.scale.setScalar(height); }
    else if (flora.shape === 'crystal') { leaf.position.y = .5 * height; leaf.scale.set(height * .7, height * 1.6, height * .7); leaf.rotation.y = random() * 3; }
    else {
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.scale.y = height; trunk.position.y = height / 2;
      tree.add(trunk);
      leaf.position.y = height + (flora.shape === 'pine' ? .5 : flora.shape === 'palm' ? .05 : .35);
      leaf.scale.setScalar(.8 + random() * .5);
    }
    tree.add(leaf);
    tree.position.set(x, GROUND, z);
    scatter.add(tree);
  }
  // Tyre stacks on the outside of the tightest corners.
  const tyreGeometry = keep(new THREE.CylinderGeometry(.2, .2, .16, 12));
  const tyreMaterials = [new THREE.MeshStandardMaterial({ color: '#1d2028', roughness: .9 }), new THREE.MeshStandardMaterial({ color: theme.kerb ?? '#e0364f', roughness: .8 }), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: .8 })];
  for (let i = 0; i < 240; i++) {
    const u = i / 240;
    const before = curve.getTangentAt(u);
    const after = curve.getTangentAt((u + .012) % 1);
    const bend = before.x * after.z - before.z * after.x;
    const p = curve.getPointAt(u);
    if (Math.abs(bend) < .085 || p.y > .1) continue;
    const n = new THREE.Vector3(-before.z, 0, before.x).normalize();
    const side = bend > 0 ? -1 : 1;
    const x = p.x + n.x * side * (ROAD_HALF + 1.05); const z = p.z + n.z * side * (ROAD_HALF + 1.05);
    if (!clearOfRoad(x, z, ROAD_HALF + .8)) continue;
    for (let level = 0; level < 3; level++) {
      const tyre = new THREE.Mesh(tyreGeometry, tyreMaterials[(i + level) % 3]);
      tyre.position.set(x, GROUND + .25 + .08 + level * .16, z);
      scatter.add(tyre);
    }
  }
  const towerMaterial = new THREE.MeshStandardMaterial({ color: '#5a6072', metalness: .5, roughness: .4 });
  const towerGeometry = keep(new THREE.CylinderGeometry(.07, .12, 5, 8));
  // Trackside buildings from the Racing Kit. `turn` is the way the prop faces (0 = towards the camera).
  let tornDown = false;
  const props = new THREE.Group();
  scene.add(props);
  const prop = (name, x, z, size, turn = 0, y = GROUND) => loadProp(name).then(source => {
    if (tornDown) return;
    const model = source.clone(true);
    model.scale.setScalar(size);
    model.rotation.y = turn;
    model.position.set(x, y, z);
    props.add(model);
  }).catch(() => { /* the circuit still works without it */ });
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  // Grandstands along the back of the lap, facing the camera, with gaps between blocks.
  const standZ = bounds.minZ - 7.4;
  for (let i = 0, count = Math.max(4, Math.round(width / 5.2)); i < count; i++) {
    const x = bounds.minX + (i + .5) / count * width;
    if (clearOfRoad(x, standZ, ROAD_HALF + 4)) prop(i % 2 ? 'grandStand' : 'grandStandCovered', x, standZ, 3.6);
  }
  // Light towers at the back corners and down the sides.
  for (const [fx, fz] of [[0, 0], [.33, 0], [.67, 0], [1, 0], [0, .55], [1, .55]]) {
    const x = bounds.minX - 5 + fx * (width + 10);
    const z = bounds.minZ - 5.2 + fz * depth;
    if (clearOfRoad(x, z, ROAD_HALF + 3)) prop('lightPostLarge', x, z, 6.5, fx < .5 ? .5 : -.5);
  }
  // The pits: a row of garages and an office beside the start straight, on whichever side has room.
  const startPoint = curve.getPointAt(.03);
  const startTangent = curve.getTangentAt(.03);
  const startNormal = new THREE.Vector3(-startTangent.z, 0, startTangent.x).normalize();
  const startTurn = Math.atan2(-startTangent.z, startTangent.x);
  for (const side of [-1, 1]) {
    const spots = [0, 1, 2, 3, 4].map(i => ({ x: startPoint.x + startTangent.x * (1.5 + i * 2.3) + startNormal.x * side * (ROAD_HALF + 4.3), z: startPoint.z + startTangent.z * (1.5 + i * 2.3) + startNormal.z * side * (ROAD_HALF + 4.3) }));
    if (!spots.every(spot => clearOfRoad(spot.x, spot.z, ROAD_HALF + 3.4))) continue;
    // Nothing tall between the camera and the start line: on the near side only the low office row is built.
    spots.forEach((spot, i) => prop(i === 4 ? 'pitsOffice' : 'pitsGarage', spot.x, spot.z, 2.2, startTurn + (side < 0 ? 0 : Math.PI)));
    break;
  }
  // Banner towers and chequered flags either side of the finish line.
  for (const side of [-1, 1]) {
    const out = ROAD_HALF + 1.15;
    prop(side < 0 ? 'bannerTowerRed' : 'bannerTowerGreen', end.x + tangent.x * -1.2 + -tangent.z * side * out, end.z + tangent.z * -1.2 + tangent.x * side * out, 2.4, startTurn);
    prop('flagCheckers', end.x + tangent.x * 1.4 + -tangent.z * side * out, end.z + tangent.z * 1.4 + tangent.x * side * out, 2.2, startTurn + Math.PI / 2);
  }
  // A few marquees among the spectators.
  for (let tries = 0, placed = 0; tries < 200 && placed < 5; tries++) {
    const x = bounds.minX - 3 + random() * (width + 6);
    const z = bounds.minZ - 3 + random() * (depth + 2);
    if (!clearOfRoad(x, z, ROAD_HALF + 4.2)) continue;
    placed++;
    prop('tentRoof', x, z, 2.6, random() * Math.PI);
  }
  // Trackside boards behind the back of the lap, facing the camera. Our own names only.
  const boardColours = ['#e0364f', '#2f7de0', '#f4d35e', '#2fa35a'];
  ['JAMBALOOP', 'QUIZ RACE', 'FULL THROTTLE', 'JAMBALOOP'].forEach((words, i, all) => {
    const x = bounds.minX + (i + .5) / all.length * (bounds.maxX - bounds.minX);
    const z = bounds.minZ - 4.4;
    if (!clearOfRoad(x, z, ROAD_HALF + 3)) return;
    const texture = canvasTexture(256, (ctx, size) => {
      ctx.fillStyle = boardColours[i % boardColours.length]; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = i % 4 === 2 ? '#1b2030' : '#ffffff'; ctx.font = `900 ${words.length > 9 ? 30 : 40}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(words, size / 2, size / 2);
    });
    texture.repeat.set(1, .25); texture.offset.set(0, .375);
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.3, .12), [towerMaterial, towerMaterial, towerMaterial, towerMaterial, new THREE.MeshBasicMaterial({ map: texture }), towerMaterial]);
    board.position.set(x, GROUND + 1.25, z);
    for (const leg of [-2.2, 2.2]) { const post = new THREE.Mesh(towerGeometry, towerMaterial); post.scale.y = .25; post.position.set(x + leg, GROUND + .6, z - .1); scatter.add(post); }
    scatter.add(board);
  });
  scatter.traverse(object => { if (object.isMesh) keep(object); });
  scene.add(scatter);

  const cars = new Map();
  let container;
  let observer;
  let lost = false;
  // The whole lap, with room for the crowd: the widest the camera ever pulls back.
  const COURSE_HALF_WIDTH = Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX)) + 1.6;
  const COURSE_HALF_DEPTH = Math.max(Math.abs(bounds.minZ), Math.abs(bounds.maxZ)) + 5.4;
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
      const { wheels, flame, flameMaterial, glowMaterial, paint } = car.userData;
      flame.visible = boosting && racer.finishedAt === undefined;
      // Power-ups: a rammed car flashes red and fishtails; a boosting car
      // glows white-hot with a long flame; the rammer lunges forward.
      const rammed = racer.power === 'rammed';
      const boosted = racer.power === 'boost';
      // A raised shield glows blue round the car.
      glowMaterial.color.set(rammed ? '#ff2a2a' : boosted ? '#ffffff' : racer.shield ? '#58b7ff' : racer.color);
      glowMaterial.opacity = rammed || boosted || racer.shield ? 0.9 : 0.2;
      paint.emissive.set(rammed ? '#ff2a2a' : '#000000');
      paint.emissiveIntensity = rammed ? 0.6 : 0;
      for (const material of car.userData.modelPaints ?? []) { material.emissive.set(rammed ? '#ff2a2a' : '#000000'); material.emissiveIntensity = rammed ? 0.6 : 0; }
      // On fire (five right in a row): flames pour out of the back for as long as the run lasts.
      const onFire = Boolean(racer.fire) && racer.finishedAt === undefined;
      if (boosted || onFire) flame.visible = true;
      flameMaterial.color.set(boosted ? '#8fdcff' : onFire ? '#ff5a1f' : '#ffb347');
      car.userData.fire.visible = onFire;
      // A boost armed for the next answer: the kart hums blue until it is used or wasted.
      if (racer.armed && !rammed && !boosted) { glowMaterial.color.set('#58d5ff'); glowMaterial.opacity = 0.75; }
      if (!reducedMotion) {
        const beat = (sim ?? performance.now()) / 45;
        if (rammed) { car.rotation.y += Math.sin(beat) * 0.32; car.position.y += Math.abs(Math.sin(beat * 1.3)) * 0.07; }
        if (racer.power === 'ram') car.position.addScaledVector(t, 0.18);
        // A wasted nudge: the kart swings out at nobody and wobbles back.
        if (racer.power === 'miss') { car.position.addScaledVector(n, Math.sin(beat * .5) * 0.22); car.rotation.y += Math.sin(beat * .5) * 0.14; }
        flame.scale.y = flame.scale.z = boosted ? 2.4 : onFire ? 1.5 : 1;
        if (onFire) { const fire = car.userData.fire; fire.scale.set(1 + Math.random() * .7, .8 + Math.random() * .5, .8 + Math.random() * .5); car.userData.fireMaterial.opacity = .55 + Math.random() * .4; }
      }
      if (!reducedMotion) {
        car.position.y += Math.abs(Math.sin((sim ?? performance.now()) / 90 + racer.marker)) * 0.02;
        flame.scale.x = (onFire || boosted ? 1.5 : 0.7) + Math.random() * 0.6;
        flameMaterial.opacity = 0.6 + Math.random() * 0.4;
        for (const wheel of wheels) wheel.rotation.z = -u * 260;
        for (const wheel of car.userData.modelWheels ?? []) wheel.rotation.x = u * 260;
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
    const overviewDistance = Math.max(COURSE_HALF_WIDTH / tanH, COURSE_HALF_DEPTH / tanV);
    let centre = (bounds.minX + bounds.maxX) / 2;
    // The overview looks a little in front of the lap, so the start straight sits above the standings strip.
    let depth = (bounds.minZ + bounds.maxZ) / 2 + 2.6;
    let distance = overviewDistance;
    if (!reducedMotion && Number.isFinite(packMin)) {
      // Fit the pack across (horizontal FOV) and into the screen (vertical FOV).
      // Tighter than before so the cars read as cars from the sofa.
      const across = (packMax - packMin) / 2 + 3.4;
      const into = (packNear - packFar) / 2 * .85 + 2.4;
      distance = THREE.MathUtils.clamp(Math.max(across / tanH, into / tanV), 5.2 / tanH, overviewDistance);
      centre = (packMin + packMax) / 2;
      depth = THREE.MathUtils.clamp((packNear + packFar) / 2, bounds.minZ + 2, bounds.maxZ - 2);
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
    if (!reducedMotion) placeCrowd(performance.now());
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
      tornDown = true;
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
