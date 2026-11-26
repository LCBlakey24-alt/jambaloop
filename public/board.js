import { boardPath, boardFork, boardIsCorner, boardCornerPower, boardPowers } from './board-route.js';
import { curvedLayout, TILE_TOP } from './board-layout.js';
import * as THREE from '/vendor/three.module.js';
import { boardRollDuration, categories } from './game-config.js';
import { tableSurface, towerDieScale, towerExit, towerImpacts, towerOrigin, towerPose, towerRamps, towerSettle } from './tower-motion.js';
import { boardPrint, brushedMetal, checkerFace, coated, dieFace, tileCard, tileDisc, tileFace, woodMaterial } from './table-materials.js';

const diceFaces = [
  [1, [0, 1, 0]], [6, [0, -1, 0]], [2, [0, 0, 1]],
  [5, [0, 0, -1]], [3, [1, 0, 0]], [4, [-1, 0, 0]],
];
const pipPattern = [
  [], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]],
  [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
];

const yAxis = new THREE.Vector3(0, 1, 0);
const tone = {
  club: ['#1c2150', '#293783', '#a7b9ff'],
  christmas: ['#281c2a', '#492b40', '#f4a9c7'],
  arcade: ['#191735', '#372778', '#b8afff'],
  lodge: ['#232522', '#3d4939', '#f6cc8b'],
};

function tableTone(state) {
  if (state.theme === 'club') {
    return state.mode === 'board' ? ['#203326', '#385441', '#e8c591'] : ['#3e2321', '#623932', '#ffb87c'];
  }
  return tone[state.theme] ?? tone.club;
}

// A nameplate texture drawn at the same shape as the plate it goes on, so the
// lettering is never stretched. `aspect` is the plate's width divided by height.
function label(text, background, foreground, detail, aspect = 1) {
  const canvas = document.createElement('canvas');
  const width = 1024, height = Math.max(64, Math.round(width / aspect));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const corner = height * .16;
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(0, 0, width, height, corner);
  context.fill();
  const sheen = context.createLinearGradient(0, 0, 0, height);
  sheen.addColorStop(0, '#ffffff38');
  sheen.addColorStop(.5, '#ffffff05');
  sheen.addColorStop(1, '#00000030');
  context.fillStyle = sheen;
  context.fill();
  const inset = height * .09;
  context.beginPath();
  context.roundRect(inset, inset, width - inset * 2, height - inset * 2, corner * .7);
  context.strokeStyle = foreground + '70';
  context.lineWidth = Math.max(3, height * .025);
  context.stroke();
  // Engraved screws at each end.
  context.fillStyle = foreground;
  for (const x of [inset * 2.4, width - inset * 2.4]) {
    context.beginPath();
    context.arc(x, height / 2, height * .045, 0, 2 * Math.PI);
    context.fill();
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if (detail && aspect < 1.6) {
    // A squarer plate: the name above, the detail below.
    context.fillStyle = foreground;
    context.font = `800 ${height * .26}px Georgia, 'Times New Roman', serif`;
    context.fillText(text, width / 2, height * .42, width - inset * 4);
    context.font = `700 ${height * .1}px Georgia, 'Times New Roman', serif`;
    context.fillText(detail.toUpperCase(), width / 2, height * .66, width - inset * 4);
    const square = new THREE.CanvasTexture(canvas);
    square.colorSpace = THREE.SRGBColorSpace;
    square.anisotropy = 8;
    return square;
  }
  const words = detail ? `${text} ${detail.toUpperCase()}` : text;
  // One line of lettering, sized to the plate's height and never squeezed sideways.
  let size = height * .56;
  context.font = `800 ${size}px Georgia, 'Times New Roman', serif`;
  const room = width - inset * 7;
  const measured = context.measureText(words).width;
  if (measured > room) { size *= room / measured; context.font = `800 ${size}px Georgia, 'Times New Roman', serif`; }
  context.fillStyle = '#00000055';
  context.fillText(words, width / 2 + 2, height / 2 + 3);
  context.fillStyle = foreground;
  context.fillText(words, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function roundedBox(width, height, depth, radius, segments, material) {
  const geometry = new THREE.BoxGeometry(width, height, depth, segments, segments, segments);
  const vertices = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const vertex = new THREE.Vector3();
  const minimum = new THREE.Vector3(radius - width / 2, radius - height / 2, radius - depth / 2);
  const maximum = minimum.clone().negate();
  const center = new THREE.Vector3();
  for (let index = 0; index < vertices.count; index++) {
    vertex.fromBufferAttribute(vertices, index);
    center.copy(vertex).clamp(minimum, maximum);
    vertex.sub(center).normalize();
    normals.setXYZ(index, vertex.x, vertex.y, vertex.z);
    vertex.multiplyScalar(radius).add(center);
    vertices.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  return new THREE.Mesh(geometry, material);
}

function makeDie(color, accent) {
  const cube = new THREE.Group();
  const lacquer = new THREE.MeshPhysicalMaterial({ color, roughness: .18, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, sheen: .4 });
  cube.add(roundedBox(1.32, 1.32, 1.32, .24, 18, lacquer));
  const inset = new THREE.PlaneGeometry(1.04, 1.04);
  const outward = new THREE.Vector3(0, 0, 1);
  for (const [value, direction] of diceFaces) {
    const normal = new THREE.Vector3(...direction);
    const material = new THREE.MeshBasicMaterial({ transparent: true, map: dieFace(pipPattern[value], accent), depthWrite: false });
    const face = new THREE.Mesh(inset, material);
    face.position.copy(normal).multiplyScalar(.662);
    face.quaternion.setFromUnitVectors(outward, normal);
    cube.add(face);
  }
  return cube;
}

function makePawn(color, teamId) {
  const group = new THREE.Group();
  const material = coated(color, .23, .17);
  const gold = coated('#e8bd72', .27, .48);
  const profile = [
    [.015, 0], [.18, 0], [.199, .027], [.199, .067], [.179, .089],
    [.147, .11], [.105, .153], [.079, .222], [.077, .27], [.111, .29], [.105, .318], [.06, .329],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), material);
  const crowns = [
    () => new THREE.OctahedronGeometry(.151), () => new THREE.ConeGeometry(.132, .228, 3),
    () => new THREE.SphereGeometry(.124, 24, 16), () => new THREE.BoxGeometry(.174, .174, .174),
  ];
  const head = new THREE.Mesh(crowns[teamId](), material);
  head.position.y = .416;
  head.rotation.y = Math.PI / 5;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.102, .085, .035, 22), gold);
  collar.position.y = .324;
  group.add(body, collar, head);
  for (const [radius, height] of [[.176, .079], [.09, .278]]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius, .012, 8, 32), gold);
    band.rotation.x = Math.PI / 2;
    band.position.y = height;
    group.add(band);
  }
  return group;
}

function disposeScene(scene) {
  const resources = new Set();
  scene.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) {
      resources.add(object.material);
      if (object.material.map) resources.add(object.material.map);
    }
  });
  for (const resource of resources) resource.dispose();
}

function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(48, 48, 6, 48, 48, 48);
  gradient.addColorStop(0, '#080613b8');
  gradient.addColorStop(.52, '#08061370');
  gradient.addColorStop(1, '#08061300');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  return new THREE.CanvasTexture(canvas);
}

function feltMaterial(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 192;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(canvas.width, canvas.height);
  let seed = 192;
  for (let index = 0; index < pixels.data.length; index += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const tone = 215 + (seed >>> 27);
    pixels.data.set([tone, tone, tone, 255], index);
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ color, roughness: .85, map: texture, bumpMap: texture, bumpScale: .035 });
}

function flatMesh(width, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

// A flat painted strip that follows a curve, for the printed board path.
function pathStrip(curve, half, y, material, samples = 220) {
  const positions = [];
  const indices = [];
  const step = 1 / samples;
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    // Never let the inside edge fold over itself on a tight bend: narrow it
    // to just inside the local radius of curvature.
    const a = curve.getTangentAt(Math.max(0, u - step)), b = curve.getTangentAt(Math.min(1, u + step));
    const turn = a.x * b.z - a.z * b.x;
    const radius = Math.abs(turn) > 1e-6 ? (2 * step * curve.getLength()) / Math.abs(turn) : Infinity;
    const inner = Math.min(half, radius * .85);
    const left = turn > 0 ? half : inner, right = turn > 0 ? inner : half;
    positions.push(p.x - n.x * left, y, p.z - n.z * left, p.x + n.x * right, y, p.z + n.z * right);
    if (i) { const a = (i - 1) * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function buildBoard(scene, state, shadowMap) {
  const [baseColor, tableColor, accent] = tableTone(state);
  const board = new THREE.Group();
  const wood = woodMaterial(state.theme === 'club' ? '#4d2d26' : baseColor);
  const plinth = roundedBox(6.36, .38, 6.36, .13, 14, wood);
  const rim = roundedBox(6.16, .076, 6.16, .035, 10, coated('#d9b47c', .32, .45));
  const table = roundedBox(6.04, .14, 6.04, .055, 10, feltMaterial(tableColor));
  const print = new THREE.Mesh(new THREE.PlaneGeometry(5.92, 5.92), new THREE.MeshStandardMaterial({ map: boardPrint(tableColor, accent), roughness: .82 }));
  print.rotation.x = -Math.PI / 2;
  print.position.y = .187;
  print.receiveShadow = true;
  board.add(print);
  const railMaterial = coated('#b8864e', .37, .42);
  for (const [x, z, width, depth] of [[0,-3.05,5.8,.04],[0,3.05,5.8,.04],[-3.05,0,.04,5.8],[3.05,0,.04,5.8]]) {
    const rail = roundedBox(width, .035, depth, .012, 3, railMaterial);
    rail.position.set(x, .114, z);
    board.add(rail);
  }
  const trim = roundedBox(6.22, .045, 6.22, .022, 8, coated(accent, .28, .3));
  trim.position.y = -.29;
  plinth.position.y = -.19;
  rim.position.y = .005;
  table.position.y = .115;
  board.add(plinth, rim, table, trim);
  const studs = new THREE.SphereGeometry(.043, 12, 8);
  const studMaterial = coated('#eed1a0', .3, .5);
  for (const x of [-2.91, 2.91]) for (const z of [-2.91, 2.91]) {
    const stud = new THREE.Mesh(studs, studMaterial);
    stud.position.set(x, .19, z);
    stud.scale.y = .42;
    board.add(stud);
  }
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.56, .18), new THREE.MeshBasicMaterial({
    map: label('BOARD RACE', baseColor, accent, '', 1.56 / .18), transparent: true,
  }));
  plaque.position.set(0, -.17, 3.183);
  board.add(plaque);
  scene.add(board);
  const paths = {
    power: boardPath(state.boardLength, state.includeChristmas, 'power'),
    questions: boardPath(state.boardLength, state.includeChristmas, 'questions'),
  };
  const fork = boardFork(state.boardLength);
  const layout = curvedLayout(state.boardLength, fork);
  const scale = layout.scale;
  const categoryById = new Map(categories.map(row => [row[0], row]));

  function tilePosition(index, choice = 'power') {
    const route = paths[choice] ?? paths.power;
    const { x, y, z } = layout.position(Math.max(0, Math.min(route.length - 1, index)), choice in paths ? choice : 'power');
    return new THREE.Vector3(x, y, z);
  }

  const goldLine = coated('#d6a450', .3, .45);
  // The lap ends back on the start corner, so that space is drawn once, as the start.
  const allTiles = [
    ...paths.power.filter(tile => !tile.lane && tile.index !== layout.lap),
    ...paths.power.filter(tile => tile.lane === 'power'),
    ...paths.questions.filter(tile => tile.lane === 'questions'),
  ];
  for (const tileInfo of allTiles) {
    const {index:i,category:id,finish,lane} = tileInfo;
    const original = id ? categoryById.get(id)?.[4] : '#fff0d4';
    const corner = !finish && (i === 0 || boardIsCorner(state.boardLength, i, lane === 'questions' ? 'questions' : 'power'));
    const color = corner ? '#ffd23f' : lane === 'power' ? '#f9c45d' : lane === 'questions' ? '#54dccc' : original;
    const r = (lane === 'questions' ? layout.trailRadius : layout.radius) * layout.scaleOf(i, lane === 'questions' ? 'questions' : 'power');
    // Square spaces, like a printed board. Every block sits square-on to the
    // board, exactly under its printed face, and is sized so that even two
    // diagonal neighbours on a bend cannot touch.
    const width = r * 1.4;
    const thickness = TILE_TOP + (finish ? .02 : 0) - .19;
    const choice = lane === 'questions' ? 'questions' : 'power';
    const here = tilePosition(i, choice);
    const tile = roundedBox(width, thickness, width, Math.min(.04, width * .12), 4, coated('#f3e6c4', .5));
    tile.position.copy(here);
    const top = tile.position.y;
    tile.position.y = top - thickness / 2;
    // Each corner names the power-up it gives; the start corner is also the fourth (the end of the lap).
    const cornerPower = corner ? boardPowers.find(power => power.id === (i ? boardCornerPower(state.boardLength, i, lane === 'questions' ? 'questions' : 'power') : 'leap')) : undefined;
    const labelText = corner ? (i ? cornerPower.short : 'START · ' + cornerPower.short) : lane === 'power' ? '×2 POWER' : lane === 'questions' ? 'QUIZ TRAIL' :
      id ? categoryById.get(id)?.[5] : 'Start';
    const displayNumber = lane === 'power' ? 'P'+(i-fork.start) :
      lane === 'questions' ? 'Q'+(i-fork.start) : i;
    const printed = new THREE.Mesh(new THREE.PlaneGeometry(width,width),new THREE.MeshBasicMaterial({
      map:tileCard(displayNumber,color,finish ? 'Finish' : labelText,finish ? '⚑' : corner ? '★' : undefined),
      transparent:true,
    }));
    printed.position.set(tile.position.x,top+.003,tile.position.z);
    printed.rotation.x=-Math.PI/2;
    board.add(tile,printed);
  }
  const finish = tilePosition(state.boardLength);
  const poleHeight = scale * .55;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, poleHeight, 12), coated('#e4b66c', .29, .45));
  // Planted on the finish disc itself, so it never overlaps a neighbouring space.
  pole.position.set(finish.x + scale * .12, finish.y + poleHeight / 2, finish.z - scale * .12);
  board.add(pole);
  const flag = new THREE.Group();
  flag.position.set(pole.position.x, finish.y + poleHeight * .78, pole.position.z);
  const fabric = new THREE.Mesh(new THREE.PlaneGeometry(scale * .48, scale * .30), new THREE.MeshBasicMaterial({
    map: checkerFace(), side: THREE.DoubleSide,
  }));
  fabric.position.x = -scale * .24;
  flag.add(fabric);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(scale * .05, 12, 8), studMaterial);
  finial.position.set(pole.position.x, pole.position.y + poleHeight / 2, pole.position.z);
  board.add(flag, finial);
  // The route spirals into the middle of the board, so the finish owns the centre.

  const halo = new THREE.Mesh(new THREE.RingGeometry(scale * .33, scale * .40, 40), new THREE.MeshBasicMaterial({ color: '#fff3bf' }));
  halo.rotation.x = -Math.PI / 2;
  const ripple = new THREE.Mesh(new THREE.RingGeometry(scale * .33, scale * .359, 40), new THREE.MeshBasicMaterial({
    color: '#ffe1a1', transparent: true, depthWrite: false,
  }));
  ripple.rotation.x = -Math.PI / 2;
  const sparks = new THREE.Group();
  const diamond = new THREE.OctahedronGeometry(Math.min(.04, scale * .07));
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: '#ffe5ae', transparent: true, depthWrite: false });
  for (let index = 0; index < 9; index++) sparks.add(new THREE.Mesh(diamond, sparkMaterial));
  board.add(halo, ripple, sparks);

  const trailMaterial = new THREE.MeshBasicMaterial({ color: state.teams[state.activeTeam].color });
  const trailGeometry = new THREE.RingGeometry(scale * .36, scale * .40, 32);
  const trail = Array.from({ length: 5 }, () => {
    const step = new THREE.Mesh(trailGeometry, trailMaterial);
    step.rotation.x = -Math.PI / 2;
    board.add(step);
    return step;
  });

  const pawnSize = Math.min(1.07, scale / .96);
  const pawns = state.teams.map(team => {
    const pawn = makePawn(team.color, team.id);
    pawn.scale.setScalar(pawnSize);
    const shadow = flatMesh(scale * .42, scale * .36, new THREE.MeshBasicMaterial({
      map: shadowMap, opacity: .68, transparent: true, depthWrite: false,
    }), 0, .38, 0);
    board.add(pawn, shadow);
    return { pawn, shadow };
  });
  const activeHalo = new THREE.Mesh(new THREE.RingGeometry(scale * .19, scale * .223, 32), new THREE.MeshBasicMaterial({
    color: state.teams[state.activeTeam].color, side: THREE.DoubleSide,
  }));
  activeHalo.rotation.x = -Math.PI / 2;
  board.add(activeHalo);

  function positionPawn(pawn, team, step) {
    const lower = Math.floor(step);
    const route = paths[team.pathChoice || 'power'];
    const position = tilePosition(lower,team.pathChoice).lerp(
      tilePosition(Math.min(route.length-1,lower+1),team.pathChoice),step-lower);
    position.x += (team.id % 2 ? .19 : -.19) * scale;
    position.z += (team.id >= 2 ? .19 : -.19) * scale;
    const ground = position.y + .016;
    const hop = Math.sin((step - lower) * Math.PI);
    position.y += hop * .27 * scale;
    pawn.position.copy(position);
    pawn.rotation.z = -.17 * Math.sin((step - lower) * 2 * Math.PI);
    return ground;
  }

  return ({ teams, activeTeam, motion }, progress) => {
    halo.visible = Boolean(motion && progress >= towerSettle);
    const burst = THREE.MathUtils.clamp((progress - .79) / .21, 0, 1);
    ripple.visible = sparks.visible = Boolean(motion && burst > 0 && burst < 1);
    if (halo.visible) {
      halo.position.copy(tilePosition(motion.to,motion.pathChoice));
      halo.position.y += .020;
      ripple.position.copy(halo.position);
      sparks.position.copy(halo.position);
    }
    if (ripple.visible) {
      ripple.scale.setScalar(1 + burst * .54);
      ripple.material.opacity = (1 - burst) * .82;
      sparkMaterial.opacity = 1 - burst;
      for (const [index, spark] of sparks.children.entries()) {
        const angle = index * Math.PI * 2 / sparks.children.length;
        const distance = scale * (.27 + burst * .36);
        spark.position.set(Math.cos(angle) * distance, Math.sin(burst * Math.PI) * scale * .35, Math.sin(angle) * distance);
        spark.rotation.set(angle + burst * 4, angle, burst * 2);
      }
    }
    for (const [i, team] of teams.entries()) {
      const amount = THREE.MathUtils.clamp((progress - .68) / .30, 0, 1);
      const distance = motion ? (motion.to - motion.from) * amount : 0;
      const whole = Math.floor(distance);
      const eased = THREE.MathUtils.smoothstep(distance - whole, 0, 1);
      const step = motion && i === activeTeam ? motion.from + whole + eased : team.position;
      const { pawn, shadow } = pawns[i];
      const ground = positionPawn(pawn, team, step);
      shadow.position.set(pawn.position.x, ground, pawn.position.z);
      if (i === activeTeam) {
        activeHalo.position.set(pawn.position.x, ground + .014, pawn.position.z);
        for (const [index, marker] of trail.entries()) {
          const pos = (motion?.from ?? 0) + index + 1;
          marker.visible = Boolean(motion && pos < motion.to && pos <= step);
          if (marker.visible) {
            marker.position.copy(tilePosition(pos,team.pathChoice));
            marker.position.y += .018;
          }
        }
      }
    }
  };

}

function buildTower(scene, baseColor, accent) {
  const group = new THREE.Group();
  group.position.set(towerOrigin.x, 0, towerOrigin.z);
  const frame = woodMaterial('#5a3524');
  const brass = brushedMetal('#c79a55');
  const edge = brushedMetal('#e8c487', .3);
  const cabinet = feltMaterial(baseColor);
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#c7e9ea', transparent: true, opacity: .13, roughness: .22, side: THREE.DoubleSide,
    depthWrite: false, metalness: .2,
  });
  const box = (width, height, depth, material, x, y, z, round = .02) => {
    const mesh = roundedBox(width, height, depth, round, 4, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const pane = (width, height, x, y, z, angle = 0) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glass);
    mesh.position.set(x, y, z);
    mesh.rotation.y = angle;
    group.add(mesh);
  };
  for (const x of [-.62, .62]) {
    for (const z of [-.6, .6]) {
      box(.18, 3.8, .18, frame, x, 2.02, z, .04);
      box(.045, 3.54, .023, brass, x, 2.02, z + .073, .009);
      for (const y of [.36, 3.72]) box(.163, .14, .163, brass, x, y, z);
    }
  }
  pane(1.18, 3.57, .6, 2.05, 0, Math.PI / 2);
  pane(1.18, 3.57, 0, 2.05, -.59);
  pane(1.15, 2.15, 0, 2.69, .6);
  for (const z of [-.6, .6]) {
    box(1.4, .14, .14, brass, 0, 3.94, z, .032);
    box(1.53, .065, .10, edge, 0, 4.025, z, .029);
  }
  for (const x of [-.62, .62]) {
    box(.14, .14, 1.36, brass, x, 3.94, 0, .032);
    box(.1, .065, 1.48, edge, x, 4.025, 0, .029);
  }
  box(1.39, .20, 1.37, frame, 0, .08, 0, .061);
  box(1.40, .08, 1.38, brass, 0, .205, 0, .036);
  box(1.22, .035, 1.16, cabinet, 0, .264, 0, .014);
  box(1.39, .14, .11, brass, 0, 3.25, .6);
  box(1.32, .087, .13, brass, 0, 1.61, .6);
  box(1.1, .39, .077, frame, 0, 3.56, .621, .036);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .31), new THREE.MeshBasicMaterial({
    map: label('DICE', '#2a1a14', '#f3d9a4', 'Tower', 1.0 / .31), transparent: true,
  }));
  badge.position.set(0, 3.56, .662);
  group.add(badge);

  // Rivets up each front post, corner brackets, a cross-brace on the back and turned feet.
  const rivet = new THREE.SphereGeometry(.026, 10, 8);
  for (const x of [-.62, .62]) for (let y = .55; y < 3.7; y += .32) {
    const stud = new THREE.Mesh(rivet, edge);
    stud.position.set(x, y, .705);
    stud.scale.z = .5;
    group.add(stud);
  }
  for (const x of [-.62, .62]) for (const y of [.5, 3.6]) for (const z of [-.6, .6]) {
    box(.24, .05, .24, brass, x, y, z, .012);
  }
  for (const turn of [-1, 1]) {
    const brace = roundedBox(.05, 3.6, .03, .01, 3, brass);
    brace.position.set(0, 2.05, -.66);
    brace.rotation.z = turn * .33;
    group.add(brace);
  }
  for (const x of [-.72, .72]) for (const z of [-.72, .72]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), brass);
    foot.position.set(x, -.02, z);
    foot.scale.y = .6;
    group.add(foot);
  }
  // A warm lamp inside, so the die is easy to follow as it tumbles.
  const glow = new THREE.PointLight('#ffd9a0', 9, 5, 1.6);
  glow.position.set(0, 2.4, .1);
  group.add(glow);
  // A stepped crown with a finial, like a turned wooden tower.
  box(1.62, .09, 1.62, frame, 0, 4.12, 0, .04);
  box(1.3, .12, 1.3, brass, 0, 4.22, 0, .05);
  for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.09, 14, 10), edge);
    knob.position.set(x, 4.24, z);
    group.add(knob);
  }
  // A felt-lined tray at the foot, where the die comes to rest.
  box(1.7, .1, 1.7, frame, 0, .02, 0, .05);
  const bolt = new THREE.SphereGeometry(.034, 12, 8);
  for (const x of [-.60, .60]) for (const y of [.35, 1.61, 3.25, 3.78]) {
    const pin = new THREE.Mesh(bolt, edge);
    pin.position.set(x, y, .683);
    pin.scale.z = .44;
    group.add(pin);
  }
  const gates = [-1, 1].map(side => {
    const hinge = new THREE.Group();
    hinge.position.set(0, 4.079, side * .42);
    const flap = roundedBox(.83, .036, .403, .012, 4, brass);
    flap.position.z = -side * .205;
    hinge.add(flap);
    group.add(hinge);
    return { side, hinge };
  });
  const rampIndicators = towerRamps.map(({ x, y, length, angle }) => {
    const ramp = new THREE.Group();
    const slope = roundedBox(length, .072, .98, .024, 4, brass);
    const liner = roundedBox(length * .94, .025, .89, .01, 3, cabinet);
    const signal = roundedBox(length * .69, .024, .017, .006, 3, new THREE.MeshBasicMaterial({ color: '#53352d' }));
    signal.position.set(0, .048, .451);
    liner.position.y = .044;
    ramp.add(slope, liner, signal);
    ramp.position.set(x, y, 0);
    ramp.rotation.z = angle;
    group.add(ramp);
    return signal;
  });

  const lampGeometry = new THREE.SphereGeometry(.041, 10, 8);
  const lamps = [3.81, 3.40, 2.99, 2.58, 2.17, 1.79, 1.36, .95, .54].map(height => {
    const lamp = new THREE.Mesh(lampGeometry, new THREE.MeshBasicMaterial({ color: '#fac188', toneMapped: false }));
    lamp.position.set(-.62, height, .702);
    group.add(lamp);
    return lamp;
  });
  const cache = new THREE.Color();
  const amber = new THREE.Color('#ffdc8d');
  const dim = new THREE.Color('#634134');
  scene.add(group);
  return (progress, y) => {
    const open = THREE.MathUtils.smoothstep(progress, 0, .043)
      * (1 - THREE.MathUtils.smoothstep(progress, towerExit, towerSettle));
    for (const { side, hinge } of gates) hinge.rotation.x = -side * open * Math.PI / 2;
    const lampCursor = (3.81 - y) / .41;
    for (const [index, lamp] of lamps.entries()) {
      const lit = progress <= towerSettle ? Math.max(0, 1 - Math.abs(index - lampCursor) * .43) : .22;
      lamp.material.color.copy(cache.copy(dim).lerp(amber, lit));
      lamp.scale.set(1 + lit * .32, 1 + lit * .32, .55);
    }
    for (const [index, signal] of rampIndicators.entries()) {
      const sinceHit = progress - towerRamps[index].hit;
      const flash = sinceHit < 0 ? 0 : Math.max(0, 1 - sinceHit / .043);
      signal.material.color.copy(cache.copy(dim).lerp(amber, flash));
    }
  };
}

function buildRallyTray(scene, baseColor, tableColor, accent) {
  const tray = new THREE.Group();
  const shell = roundedBox(5.71, .34, 3.85, .14, 14, woodMaterial(baseColor));
  shell.position.y = -.17;
  const gasket = roundedBox(5.6, .035, 3.76, .016, 5, coated(accent, .35, .38));
  gasket.position.y = -.085;
  const surface = roundedBox(5.19, .08, 3.33, .035, 10, feltMaterial(tableColor));
  surface.position.y = .015;
  const bronze = coated('#ce9167', .32, .49);
  for (const [x, z, width, depth] of [[0,-1.73,5.41,.145],[0,1.73,5.41,.145],[-2.67,0,.145,3.64],[2.67,0,.145,3.64]]) {
    const rail = roundedBox(width, .23, depth, .065, 6, bronze);
    rail.position.set(x, .088, z);
    tray.add(rail);
  }
  const glyph = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .53 });
  for (const x of [-2.24, 2.24]) {
    for (const z of [-1.09, -1, 1, 1.09]) tray.add(flatMesh(.44, .025, glyph, x, .059, z));
  }
  const center = flatMesh(1.53, 1.53, new THREE.MeshBasicMaterial({
    map: label('DICE RALLY', tableColor, '#ffe0b3', 'Roll for points'), transparent: true, opacity: .86,
  }), 0, .057, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.68, .699, 64), glyph);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .059;
  tray.add(shell, gasket, surface, center, ring);
  scene.add(tray);
}

const zAxis = new THREE.Vector3(0, 0, 1);
const dieRotation = new THREE.Matrix4();

function positionTowerDie(mesh, result, progress, hasRoll) {
  const pose = towerPose(hasRoll ? progress : 0);
  mesh.quaternion.setFromAxisAngle(zAxis, pose.angle);
  if (pose.blend) mesh.quaternion.slerp(result, pose.blend);
  let height = pose.y;
  if (pose.lift !== undefined) {
    const basis = dieRotation.makeRotationFromQuaternion(mesh.quaternion).elements;
    const half = .66 * towerDieScale;
    height = tableSurface + half * (Math.abs(basis[1]) + Math.abs(basis[5]) + Math.abs(basis[9])) + pose.lift;
  }
  mesh.position.set(towerOrigin.x + pose.x, height, towerOrigin.z + pose.z);
}

function positionRallyDie(mesh, result, index, progress) {
  const direction = index ? 1 : -1;
  const travel = THREE.MathUtils.smoothstep(progress, 0, .94);
  const bounces = [[0, .41, 1.32], [.41, .65, .55], [.65, .82, .21], [.82, 1, .08]];
  const bounce = bounces.find(([, end]) => progress <= end);
  const t = (progress - bounce[0]) / (bounce[1] - bounce[0]);
  const lift = 4 * t * (1 - t) * bounce[2];
  mesh.position.set(direction * THREE.MathUtils.lerp(2.02, 1.15, travel),
    .717 + lift + .49 * (1 - THREE.MathUtils.smoothstep(progress, 0, .36)),
    direction * THREE.MathUtils.lerp(.85, .22, travel));
  if (progress === 1) mesh.quaternion.copy(result);
  else {
    mesh.rotation.set(progress * 15.8, direction * progress * 12.3, progress * 10.2);
    if (progress > .68) mesh.quaternion.slerp(result, THREE.MathUtils.smoothstep(progress, .68, 1));
  }
}

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

function canvasMap(size, draw, repeat = [1, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  return texture;
}

// The game sits on a real surface instead of floating on the page: a walnut
// games table with cards, a trophy and tokens for Board Race; a velvet salon
// cloth with a brass Deco inlay for Dice Rally. Built once per mount.
function dressTable(scene, state, rally, accent) {
  const items = new THREE.Group();
  const surface = rally
    ? new THREE.MeshStandardMaterial({ roughness: .95, map: canvasMap(256, (ctx, s) => {
        const velvet = ctx.createRadialGradient(s / 2, s / 2, 20, s / 2, s / 2, s * .7);
        velvet.addColorStop(0, '#6a1f33'); velvet.addColorStop(1, '#2a0911');
        ctx.fillStyle = velvet; ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = '#e9c46a'; ctx.globalAlpha = .55; ctx.lineWidth = 2;
        for (let r = 75; r <= 115; r += 20) { ctx.beginPath(); ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = .22;
        for (let a = 0; a < 32; a++) {
          const angle = a * Math.PI / 16;
          ctx.beginPath(); ctx.moveTo(s / 2 + Math.cos(angle) * 80, s / 2 + Math.sin(angle) * 80);
          ctx.lineTo(s / 2 + Math.cos(angle) * 125, s / 2 + Math.sin(angle) * 125); ctx.stroke();
        }
      }) })
    : new THREE.MeshStandardMaterial({ roughness: .55, metalness: .05, map: canvasMap(256, (ctx, s) => {
        ctx.fillStyle = '#4a2c18'; ctx.fillRect(0, 0, s, s);
        let seed = 7;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let y = 0; y < s; y += 2) {
          const wave = Math.sin(y / 23) * 8 + Math.sin(y / 7) * 2;
          ctx.fillStyle = `rgba(${90 + rand() * 40},${52 + rand() * 24},${28 + rand() * 14},${.25 + rand() * .3})`;
          ctx.fillRect(0, y + wave * .1, s, 1 + rand() * 1.5);
        }
        ctx.globalAlpha = .18; ctx.fillStyle = '#1e0f06';
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(rand() * s, rand() * s, 5 + rand() * 9, 2 + rand() * 3, 0, 0, Math.PI * 2); ctx.fill(); }
      }, [3, 2]) });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), surface);
  top.rotation.x = -Math.PI / 2;
  top.position.y = rally ? -.05 : -.42;
  items.add(top);
  if (!rally) {
    // A stack of question cards with the Jambaloop back.
    const back = canvasMap(256, (ctx, s) => {
      ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = accent; ctx.lineWidth = 10; ctx.strokeRect(14, 14, s - 28, s - 28);
      ctx.fillStyle = '#2b2419'; ctx.font = '800 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('JAMBALOOP', s / 2, s / 2 - 16); ctx.font = '600 22px Georgia, serif'; ctx.fillText('QUESTION CARD', s / 2, s / 2 + 22);
    });
    const cardMaterial = new THREE.MeshStandardMaterial({ color: '#f4ead2', roughness: .6 });
    const cardTop = new THREE.MeshStandardMaterial({ map: back, roughness: .5 });
    for (let i = 0; i < 6; i++) {
      const card = new THREE.Mesh(new THREE.BoxGeometry(1.05, .03, 1.5), cardMaterial);
      card.position.set(-4.55 + Math.sin(i) * .03, -.4 + i * .032, 1.2 + Math.cos(i * 2) * .03);
      card.rotation.y = .18 + i * .025;
      items.add(card);
      if (i === 5) {
        // One material per mesh: disposeScene() expects single materials.
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.47), cardTop);
        face.rotation.x = -Math.PI / 2;
        face.position.y = .017;
        card.add(face);
      }
    }
    // A brass trophy: two-tier plinth, stem and knot, flared cup with a lip,
    // outward-curving handles and a lidded top with a star finial.
    const brass = new THREE.MeshStandardMaterial({ color: '#d4a24a', metalness: .6, roughness: .26, emissive: '#3a2400', emissiveIntensity: .22 });
    const darkWood = new THREE.MeshStandardMaterial({ color: '#2a170b', roughness: .45 });
    const trophy = new THREE.Group();
    const lower = new THREE.Mesh(new THREE.BoxGeometry(.86, .18, .86), darkWood);
    lower.position.y = .09;
    const band = new THREE.Mesh(new THREE.BoxGeometry(.88, .035, .88), brass);
    band.position.y = .19;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(.66, .14, .66), darkWood);
    upper.position.y = .28;
    const body = new THREE.Mesh(new THREE.LatheGeometry([
      [0, 0], [.26, 0], [.27, .035], [.12, .07], [.06, .16], [.05, .34], [.1, .39], [.06, .44],
      [.07, .5], [.2, .58], [.32, .74], [.37, .98], [.39, 1.04], [.35, 1.04], [.33, .98], [.28, .78], [.15, .64], [0, .6],
    ].map(([x, y]) => new THREE.Vector2(x, y)), 36), brass);
    body.position.y = .35;
    trophy.add(lower, band, upper, body);
    for (const side of [-1, 1]) {
      // Half-ring in the vertical plane, bulging away from the cup.
      const handle = new THREE.Mesh(new THREE.TorusGeometry(.14, .026, 10, 24, Math.PI), brass);
      handle.rotation.z = -side * Math.PI / 2;
      handle.position.set(side * .34, .35 + .82, 0);
      trophy.add(handle);
    }
    // A domed lid seats the finial, so nothing floats above an open cup.
    const lid = new THREE.Mesh(new THREE.LatheGeometry([
      [.39, 0], [.37, .04], [.3, .1], [.17, .15], [.07, .17], [.05, .2], [.08, .23], [.06, .27], [0, .28],
    ].map(([x, y]) => new THREE.Vector2(x, y)), 36), brass);
    lid.position.y = .35 + 1.04;
    trophy.add(lid);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(.075), brass);
    star.position.y = .35 + 1.04 + .28 + .09;
    star.scale.set(1, 1.3, .55);
    trophy.add(star);
    trophy.position.set(-4.4, -.42, -1.9);
    trophy.scale.setScalar(1.2);
    items.add(trophy);
    // Spare player tokens scattered by the board.
    const tokenGeometry = new THREE.CylinderGeometry(.2, .2, .07, 24);
    for (const [i, team] of (state.teams ?? []).slice(0, 4).entries()) {
      const token = new THREE.Mesh(tokenGeometry, coated(team.color, .25, .2));
      token.position.set(-3.6 + i * .5, -.385, 3.7 - (i % 2) * .35);
      items.add(token);
    }
  }
  scene.add(items);
  return items;
}

export function mountTable(container, state, duration, onImpact) {
  let start = performance.now();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 70);
  const [baseColor, tableColor, accent] = tableTone(state);
  let game = state;
  let rolling;
  let rollDuration;
  let initialProgress;
  let lastProgress;
  const rally = state.mode === 'dice';
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Only the shared TV screen breathes between rolls; phones render on demand.
  const idleMotion = !reducedMotion && Boolean(container.closest('.host-screen'));
  const mountedAt = performance.now();
  const introLength = reducedMotion ? 0 : 1300;
  let lastIdleFrame = 0;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);
  let usable = true;
  let frame;

  // No environment map: prefiltering one blocked the main thread for ~1.5s
  // per mount in profiling, and the stage remounts every phase. A warm rim
  // light gives brass and lacquer their highlights for free instead.
  const fill = new THREE.HemisphereLight('#eae5ff', '#4e3c4c', 1.8);
  const rim = new THREE.DirectionalLight('#ffd9a0', 1.1);
  rim.position.set(-6, 3.5, -5);
  scene.add(rim);
  const key = new THREE.DirectionalLight('#fff2df', 2.55);
  key.position.set(-3, 8, 6);
  const edge = new THREE.DirectionalLight(accent, 1.46);
  edge.position.set(5, 4, -4);
  scene.add(fill, key, edge);
  const shadowMap = shadowTexture();
  scene.add(flatMesh(rally ? 8 : 9, rally ? 5.5 : 8, new THREE.MeshBasicMaterial({
    map: shadowMap, transparent: true, depthWrite: false, opacity: .68,
  }), .25, -.399, .25));

  const movePawns = rally ? undefined : buildBoard(scene, state, shadowMap);
  const lightTower = rally ? undefined : buildTower(scene, baseColor, accent);
  if (rally) buildRallyTray(scene, baseColor, tableColor, accent);
  dressTable(scene, state, rally, accent);
  const dice = Array.from({ length: rally ? 2 : 1 }, (_, index) => {
    const mesh = makeDie(index ? accent : '#fff0d7', '#7b4e41');
    if (!rally) mesh.scale.setScalar(towerDieScale);
    const result = new THREE.Quaternion();
    const yaw = new THREE.Quaternion().setFromAxisAngle(yAxis, index ? .26 : -.38);
    const contact = flatMesh(1.72, 1.27, new THREE.MeshBasicMaterial({
      map: shadowMap, transparent: true, depthWrite: false, opacity: .58,
    }), 0, .06, 0);
    scene.add(mesh, contact);
    return { mesh, result, yaw, contact };
  });

  const lookTarget = new THREE.Vector3();
  const orbit = new THREE.Vector3();
  function frameCamera(progress, now = performance.now()) {
    const aspect = camera.aspect;
    if (rally) {
      const push = rolling ? Math.sin(progress * Math.PI) * .12 : 0;
      const distance = Math.max(1, 1.41 / aspect);
      camera.position.set((1.5 - push) * distance, (6.55 - push) * distance, (7 - push) * distance);
      lookTarget.set(0, .36, 0);
      camera.zoom = 1.10 + push;
    } else {
      const pan = rolling ? THREE.MathUtils.smoothstep(progress, 0, .24) * (1 - THREE.MathUtils.smoothstep(progress, .43, .69)) : 0;
      // Closer than before: the board should fill the screen from the sofa.
      const distance = Math.max(.84, 1.17 / aspect);
      camera.position.set((4.42 + pan * .82) * distance, (10.55 - pan * .8) * distance, (12.25 - pan * .8) * distance);
      lookTarget.set((aspect < 1.08 ? .76 : 1.08) + pan * Math.min(1.34, aspect), 1.48 + pan * .42, -.07);
      camera.zoom = 1.14 + pan * .18;
    }
    // Intro: swing in from a wider, higher angle; then a slow idle drift.
    const intro = introLength ? 1 - easeOutCubic(Math.min(1, (now - mountedAt) / introLength)) : 0;
    const drift = idleMotion ? Math.sin(now / 5200) * .045 : 0;
    const bob = idleMotion ? Math.sin(now / 6900) * .06 : 0;
    orbit.copy(camera.position).sub(lookTarget)
      .applyAxisAngle(yAxis, intro * .42 + drift)
      .multiplyScalar(1 + intro * .28);
    camera.position.copy(lookTarget).add(orbit);
    camera.position.y += intro * 1.4 + bob;
    camera.lookAt(lookTarget);
    camera.updateProjectionMatrix();
  }

  function setRoll(next, remaining) {
    game = next;
    rolling = next.phase === 'rolling' && remaining > 0;
    rollDuration = next.motion?.duration ?? (rally ? 2600 : boardRollDuration);
    initialProgress = rolling ? THREE.MathUtils.clamp(1 - remaining / rollDuration, 0, 1) : 1;
    lastProgress = initialProgress;
    const values = rally ? next.motion?.dice ?? [1, 6] : [next.motion?.die ?? 1];
    for (const [index, { result, yaw }] of dice.entries()) {
      const direction = diceFaces.find(([value]) => value === values[index])[1];
      result.setFromUnitVectors(new THREE.Vector3(...direction), yAxis).premultiply(yaw);
    }
  }

  let beat;
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  function resize() {
    const { clientWidth: width, clientHeight: height } = container;
    camera.aspect = Math.max(1, width) / Math.max(1, height);
    renderer.setSize(width, height, false);
    if (usable) draw(performance.now());
  }

  function draw(now) {
    if (!usable) return;
    cancelAnimationFrame(frame);
    const progress = rolling ? Math.min(1, initialProgress + (now - start) / rollDuration) : 1;
    frameCamera(progress, now);
    for (const [index, { mesh, result, contact }] of dice.entries()) {
      if (rally) {
        positionRallyDie(mesh, result, index, Math.min(1, progress / (.72 + index * .095)));
        contact.position.set(mesh.position.x, .06, mesh.position.z);
        contact.material.opacity = Math.max(.14, .81 - (mesh.position.y - .72) * .58);
      } else {
        positionTowerDie(mesh, result, progress, Boolean(game.motion));
        contact.visible = progress > towerExit && Boolean(game.motion);
        contact.position.set(mesh.position.x, .20, mesh.position.z);
        contact.material.opacity = THREE.MathUtils.clamp(.75 - (mesh.position.y - .49) * .84, .10, .75);
      }
    }
    movePawns?.(game, progress);
    lightTower?.(progress, dice[0].mesh.position.y);
    if (!rally && rolling && onImpact) {
      const hit = towerImpacts.findLastIndex(time => time > lastProgress && time <= progress);
      if (hit >= 0 && (progress - towerImpacts[hit]) * rollDuration < 160) onImpact(hit);
    }
    lastProgress = progress;
    const settled = rally ? progress >= .815 : progress >= towerSettle;
    const nextBeat = !game.motion ? 'ready' : !settled ? !rally && progress >= towerExit ? 'landing' : 'rolling'
      : !rally && progress < .96 ? 'moving' : 'landed';
    if (nextBeat !== beat) {
      beat = nextBeat;
      container.dataset.beat = beat;
      if (game.motion) container.dataset.settled = String(settled);
    }
    renderer.render(scene, camera);
    if (container.dataset.rendered !== 'true') container.dataset.rendered = 'true';
    const introRunning = now - mountedAt < introLength;
    if (progress < 1 || introRunning) frame = requestAnimationFrame(draw);
    else if (idleMotion) frame = requestAnimationFrame(idle);
  }

  // Idle drift renders at about 30fps; the browser pauses it in hidden tabs.
  function idle(now) {
    if (!usable) return;
    if (now - lastIdleFrame < 32) { frame = requestAnimationFrame(idle); return; }
    lastIdleFrame = now;
    draw(now);
  }

  function lost(event) {
    event.preventDefault();
    usable = false;
    cancelAnimationFrame(frame);
    delete container.dataset.rendered;
  }

  function restored() {
    usable = true;
    draw(performance.now());
  }

  renderer.domElement.addEventListener('webglcontextlost', lost);
  renderer.domElement.addEventListener('webglcontextrestored', restored);
  setRoll(state, duration);
  resize();
  return {
    update(next, remaining) {
      start = performance.now();
      setRoll(next, remaining);
      draw(start);
    },
    dispose() {
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
