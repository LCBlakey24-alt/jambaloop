// Render 3D models (GLB) to transparent PNG sprites for screens that are not 3D.
//   node scripts/render-model-sprites.mjs <folder with .glb files> <out folder> name[:yaw[:pitch]] ...
// Used for the Kenney Graveyard and Train kits (CC0). Needs Chromium.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [source, out, ...wanted] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.html': 'text/html' };
const page = `<!doctype html><body style="margin:0;background:transparent"><canvas id="c" width="512" height="512"></canvas><script type="module">
import * as THREE from '/vendor/three.module.js';
import { GLTFLoader } from '/addons/GLTFLoader.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
window.render = async (name, yaw, pitch) => {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#5a5470', 2.2));
  const sun = new THREE.DirectionalLight('#fff3dd', 2.4); sun.position.set(3, 5, 4); scene.add(sun);
  const model = (await new GLTFLoader().loadAsync('/models/' + name + '.glb')).scene;
  model.rotation.y = yaw;
  scene.add(model);
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const reach = Math.max(size.x, size.y, size.z) * .62;
  const camera = new THREE.OrthographicCamera(-reach, reach, reach, -reach, .01, 100);
  camera.position.set(centre.x, centre.y + Math.sin(pitch) * 10, centre.z + Math.cos(pitch) * 10);
  camera.lookAt(centre);
  renderer.render(scene, camera);
  return document.querySelector('#c').toDataURL('image/png');
};
window.ready = true;
</script></body>`;
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  try {
    if (path === '/') { response.writeHead(200, { 'content-type': 'text/html' }); return response.end(page); }
    const file = path.startsWith('/addons/') ? join(root, 'public/three-addons', normalize(path.slice(8)))
      : path.startsWith('/vendor/') ? join(root, 'node_modules/three/build', normalize(path.slice(8)))
      : join(source, normalize(path.slice(8)));
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
}).listen(0);
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
try {
  const tab = await browser.newPage();
  tab.on('pageerror', error => console.error(error.message));
  await tab.goto(origin + '/');
  await tab.waitForFunction(() => window.ready, null, { timeout: 20000 });
  await mkdir(out, { recursive: true });
  for (const item of wanted) {
    const [name, yaw = '0.6', pitch = '0.45'] = item.split(':');
    const data = await tab.evaluate(([name, yaw, pitch]) => window.render(name, yaw, pitch), [name, Number(yaw), Number(pitch)]);
    await writeFile(join(out, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('rendered', name);
  }
} finally { await browser.close(); server.close(); }
