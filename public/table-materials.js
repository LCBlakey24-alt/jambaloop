import * as THREE from '/vendor/three.module.js';

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export const coated = (color, roughness = .32, metalness = 0) => new THREE.MeshPhysicalMaterial({
  color, roughness, metalness, clearcoat: .55, clearcoatRoughness: .24,
});

export function woodMaterial(color) {
  const texture = canvasTexture(256, 128, (context, width, height) => {
    context.fillStyle = '#e9d6bd';
    context.fillRect(0, 0, width, height);
    for (let i = 0; i < 160; i++) {
      const y = (i * 37.19) % height;
      context.beginPath();
      context.moveTo(-10, y);
      context.bezierCurveTo(63, y + Math.sin(i) * 7, 142, y - Math.cos(i) * 8, width + 10, y + Math.sin(i * .31) * 4);
      context.lineWidth = i % 13 ? .48 : 1.2;
      context.strokeStyle = i % 4 ? '#81655029' : '#fff5dc74';
      context.stroke();
    }
  });
  const material = coated(color, .47);
  material.map = texture;
  material.bumpMap = texture;
  material.bumpScale = .018;
  return material;
}

export function tileFace(number, background, category, marker) {
  const ink = '#251e22';
  return canvasTexture(256, 256, (context) => {
    context.scale(.5, .5);
    const tint = context.createLinearGradient(0, 0, 512, 512);
    tint.addColorStop(0, '#fff7e6');
    tint.addColorStop(.43, background);
    tint.addColorStop(1, background);
    context.fillStyle = tint;
    context.beginPath();
    context.roundRect(0, 0, 512, 512, 41);
    context.fill();
    context.strokeStyle = '#32222d50';
    context.beginPath();
    context.roundRect(17, 17, 478, 478, 30);
    context.lineWidth = 6;
    context.stroke();
    context.fillStyle = ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 204px system-ui';
    context.fillText(marker || number, 256, 208, 365);
    context.fillStyle = '#362227dc';
    context.beginPath();
    context.roundRect(40, 349, 432, 106, 25);
    context.fill();
    context.fillStyle = '#fff4dd';
    context.font = '800 58px system-ui';
    context.fillText(category.toUpperCase(), 256, 407, 401);
  });
}

export function dieFace(pips, accent) {
  return canvasTexture(256, 256, context => {
    context.beginPath();
    context.roundRect(13, 13, 230, 230, 23);
    context.strokeStyle = '#553b4960';
    context.lineWidth = 3;
    context.stroke();
    context.beginPath();
    context.roundRect(18, 18, 220, 220, 19);
    context.strokeStyle = '#fffcf47c';
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = accent;
    for (const x of [31, 225]) for (const y of [31, 225]) {
      context.beginPath();
      context.arc(x, y, 2.7, 0, Math.PI * 2);
      context.fill();
    }
    for (const [column, row] of pips) {
      const x = 128 + column * 63;
      const y = 128 + row * 63;
      const recess = context.createLinearGradient(x, y - 21, x, y + 21);
      recess.addColorStop(0, '#6d4539');
      recess.addColorStop(.18, '#241526');
      recess.addColorStop(.72, '#282231');
      recess.addColorStop(.86, '#603c48');
      recess.addColorStop(1, '#fff1d2');
      context.fillStyle = recess;
      context.beginPath();
      context.arc(x, y, 21, 0, Math.PI * 2);
      context.fill();
    }
  });
}

export function checkerFace() {
  return canvasTexture(128, 96, context => {
    for (let row = 0; row < 3; row++) for (let column = 0; column < 4; column++) {
      context.fillStyle = (row + column) % 2 ? '#202132' : '#ffedc9';
      context.fillRect(column * 32, row * 32, 32, 32);
    }
  });
}
