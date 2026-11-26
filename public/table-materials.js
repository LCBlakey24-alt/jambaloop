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

// Round board-space face: number in the middle, topic on a curved band that
// stays inside the disc, so nothing is cropped on round tiles.
export function tileDisc(number, background, category, marker) {
  const ink = '#251e22';
  return canvasTexture(256, 256, (context) => {
    const tint = context.createRadialGradient(100, 90, 10, 128, 128, 128);
    tint.addColorStop(0, '#fff8ea');
    tint.addColorStop(.55, background);
    tint.addColorStop(1, background);
    context.fillStyle = tint;
    context.beginPath(); context.arc(128, 128, 126, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#32222d55'; context.lineWidth = 4;
    context.beginPath(); context.arc(128, 128, 116, 0, Math.PI * 2); context.stroke();
    context.fillStyle = ink; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = '900 92px system-ui';
    context.fillText(marker || number, 128, 112, 170);
    context.fillStyle = '#362227dc';
    context.beginPath(); context.roundRect(46, 160, 164, 40, 20); context.fill();
    context.fillStyle = '#fff4dd'; context.font = '800 24px system-ui';
    context.fillText(String(category).toUpperCase(), 128, 181, 150);
  });
}

// Square board-space face, like a printed space on a classic board: a colour
// band across the top carrying the topic, the number large underneath.
export function tileCard(number, background, category, marker) {
  return canvasTexture(256, 256, context => {
    context.fillStyle = '#fbf3df';
    context.beginPath(); context.roundRect(2, 2, 252, 252, 26); context.fill();
    context.fillStyle = background;
    context.beginPath(); context.roundRect(2, 2, 252, 84, [26, 26, 0, 0]); context.fill();
    context.fillStyle = '#1f1a1ccc'; context.fillRect(2, 84, 252, 5);
    context.strokeStyle = '#1f1a1c'; context.lineWidth = 7;
    context.beginPath(); context.roundRect(4, 4, 248, 248, 24); context.stroke();
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = '#1f1a1c'; context.font = '900 30px system-ui';
    context.fillText(String(category).toUpperCase(), 128, 46, 226);
    context.font = '900 124px system-ui';
    context.fillText(marker || number, 128, 172, 220);
  });
}

// The printed board itself: a deep felt field inside a patterned border, the
// way a boxed board game looks when it is unfolded on the table.
export function boardPrint(field, accent) {
  return canvasTexture(1024, 1024, context => {
    context.fillStyle = '#f3e6c4'; context.fillRect(0, 0, 1024, 1024);
    // Chequered border band.
    const cell = 32;
    for (let i = 0; i < 1024 / cell; i++) for (const edge of [0, 1]) {
      context.fillStyle = (i + edge) % 2 ? accent : '#1f1a1c';
      context.fillRect(i * cell, edge ? 1024 - cell : 0, cell, cell);
      context.fillRect(edge ? 1024 - cell : 0, i * cell, cell, cell);
    }
    context.fillStyle = field;
    context.beginPath(); context.roundRect(58, 58, 908, 908, 30); context.fill();
    context.strokeStyle = accent; context.lineWidth = 6;
    context.beginPath(); context.roundRect(76, 76, 872, 872, 22); context.stroke();
    context.strokeStyle = '#ffffff30'; context.lineWidth = 2;
    context.beginPath(); context.roundRect(90, 90, 844, 844, 16); context.stroke();
    // A faint sunburst from the middle, where the finish stands.
    context.save(); context.translate(512, 512);
    for (let ray = 0; ray < 24; ray++) {
      context.rotate(Math.PI / 12);
      context.fillStyle = ray % 2 ? '#ffffff0d' : '#00000012';
      context.beginPath(); context.moveTo(0, 0); context.lineTo(-58, -640); context.lineTo(58, -640); context.closePath(); context.fill();
    }
    context.restore();
    // Corner stars.
    context.fillStyle = accent;
    for (const [x, y] of [[132, 132], [892, 132], [132, 892], [892, 892]]) {
      context.beginPath();
      for (let p = 0; p < 10; p++) { const r = p % 2 ? 9 : 22, a = -Math.PI / 2 + p * Math.PI / 5; context.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      context.closePath(); context.fill();
    }
  });
}
