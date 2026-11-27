// Original vector scenes, one per show. The same picture is the launcher
// tile's artwork and the backdrop of that game's screens, so a tile and its
// game read as the same programme. Colours come from game-identities.js.
//
// Pure functions returning static SVG (no text, scripts, links or images).
// scripts/build-show-scenes.mjs writes them to public/scenes/<mode>.svg and a
// test keeps those files in step with this module.
import { identityOf } from './game-identities.js';

const n = value => Math.round(value * 10) / 10;
const attrs = extra => Object.entries(extra).map(([key, value]) => ` ${key}="${value}"`).join('');
const rect = (x, y, w, h, fill, extra = {}) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"${attrs(extra)}/>`;
const circle = (cx, cy, r, fill, extra = {}) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${attrs(extra)}/>`;
const path = (d, extra) => `<path d="${d}"${attrs(extra)}/>`;
const poly = (points, fill, extra = {}) => `<polygon points="${points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${fill}"${attrs(extra)}/>`;
const line = (x1, y1, x2, y2, stroke, width, extra = {}) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${width}"${attrs(extra)}/>`;
const linear = (id, stops, [x1, y1, x2, y2] = [0, 0, 0, 1]) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([at, color, opacity = 1]) => `<stop offset="${at}" stop-color="${color}" stop-opacity="${opacity}"/>`).join('')}</linearGradient>`;
const radial = (id, stops, [cx, cy, r] = [.5, .4, .75]) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([at, color, opacity = 1]) => `<stop offset="${at}" stop-color="${color}" stop-opacity="${opacity}"/>`).join('')}</radialGradient>`;
const range = count => Array.from({ length: count }, (_, i) => i);
const polar = (cx, cy, r, degrees) => [cx + r * Math.cos(degrees * Math.PI / 180), cy + r * Math.sin(degrees * Math.PI / 180)];
const wedge = (cx, cy, r, from, to, fill, extra = {}) => poly([[cx, cy], polar(cx, cy, r, from), polar(cx, cy, r, (from + to) / 2), polar(cx, cy, r, to)], fill, extra);
const star = (cx, cy, outer, inner, points, fill, extra = {}) => poly(range(points * 2).map(i => polar(cx, cy, i % 2 ? inner : outer, -90 + i * 180 / points)), fill, extra);
const sparkle = (x, y, s, fill, opacity = 1) => star(x, y, s, s * .28, 4, fill, { opacity });
const heart = (x, y, s, fill, extra = {}) => path(`M${x} ${y + s * .3}c0-${s * .45} ${-s * .6}-${s * .55} ${-s * .6}-${s * .05}c0 ${s * .45} ${s * .6} ${s * .7} ${s * .6} ${s * .8}c0-${s * .1} ${s * .6}-${s * .35} ${s * .6}-${s * .8}c0-${s * .5}-${s * .6}-${s * .4}-${s * .6} ${s * .05}z`, { fill, ...extra });

const scenes = {
  classic: c => [
    `<defs>${radial('bg', [[0, c.bg[0]], [1, c.bg[1]]], [.5, .25, .9])}${linear('beam', [[0, c.accent, .55], [1, c.accent, 0]])}${linear('floor', [[0, c.surface2], [1, c.bg[1]]])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    poly([[30, -10], [110, -10], [270, 400], [120, 400]], 'url(#beam)', { opacity: .45 }),
    poly([[290, -10], [370, -10], [280, 400], [130, 400]], 'url(#beam)', { opacity: .45 }),
    `<ellipse cx="200" cy="430" rx="280" ry="120" fill="url(#floor)" stroke="${c.accent}" stroke-width="3"/>`,
    ...range(11).map(i => circle(40 + i * 32, 322 + Math.abs(5 - i) * 2.2, 4.5, c.accent, { opacity: .9 })),
    rect(14, 14, 372, 372, 'none', { stroke: c.accent, 'stroke-width': 5, rx: 8 }),
    rect(26, 26, 348, 348, 'none', { stroke: c.accent, 'stroke-width': 1.5, rx: 4, opacity: .55 }),
    ...[[14, 14, 0], [386, 14, 90], [386, 386, 180], [14, 386, 270]].map(([x, y, turn]) => path(`M${x} ${y}m0 34a34 34 0 0 1 34-34`, { fill: 'none', stroke: c.accent, 'stroke-width': 3, transform: `rotate(${turn} ${x} ${y})` })),
    ...[[70, 70, 9], [330, 64, 7], [96, 250, 5], [318, 236, 6], [200, 52, 5], [52, 170, 4], [352, 160, 4]].map(([x, y, s]) => sparkle(x, y, s, c.ink, .85)),
  ],
  wheel: c => [
    rect(0, 0, 400, 400, c.bg[1]),
    ...range(24).map(i => wedge(200, 470, 700, i * 15, i * 15 + 15, i % 2 ? c.bg[0] : c.surface2)),
    ...range(8).map(i => poly([[i * 50, 18], [i * 50 + 50, 18], [i * 50 + 25, 54]], [c.accent, c.accent2, c.ink][i % 3])),
    path('M0 18Q200 34 400 18', { fill: 'none', stroke: c.ink, 'stroke-width': 2, opacity: .7 }),
    ...range(12).map(i => wedge(200, 440, 190, i * 30, i * 30 + 30, [c.accent, c.accent2, c.ink, c.surface][i % 4])),
    circle(200, 440, 190, 'none', { stroke: c.accent, 'stroke-width': 12 }),
    ...range(24).map(i => circle(...polar(200, 440, 190, i * 15), 5, c.ink)),
    circle(200, 440, 30, c.accent, { stroke: c.ink, 'stroke-width': 4 }),
    poly([[184, 234], [216, 234], [200, 268]], c.ink),
  ],
  board: c => {
    const tiles = [];
    const step = 380 / 9;
    for (let i = 0; i < 9; i++) for (const [x, y] of [[10 + i * step, 10], [10 + i * step, 390 - step], [10, 10 + i * step], [390 - step, 10 + i * step]])
      tiles.push(rect(x + 2, y + 2, step - 4, step - 4, [c.accent, c.ink, c.accent2, c.surface2][(Math.round(x + y) / 7 | 0) % 4], { rx: 4, stroke: c.bg[1], 'stroke-width': 2 }));
    return [
      `<defs>${radial('felt', [[0, c.bg[0]], [1, c.bg[1]]], [.5, .5, .7])}</defs>`,
      rect(0, 0, 400, 400, 'url(#felt)'),
      ...range(9).map(i => line(60 + i * 35, 60, 60 + i * 35, 340, c.ink, 1, { opacity: .05 })),
      rect(60, 60, 280, 280, 'none', { stroke: c.accent, 'stroke-width': 2, opacity: .45, rx: 6 }),
      ...tiles,
      rect(10, 10, step, step, c.accent, { rx: 6 }), rect(390 - step, 390 - step, step, step, c.accent2, { rx: 6 }),
      circle(305, 300, 11, c.ink), path('M290 330c0-14 7-22 15-22s15 8 15 22z', { fill: c.ink }),
      rect(84, 276, 38, 38, c.ink, { rx: 7, transform: 'rotate(-12 103 295)' }),
      ...[[94, 286], [103, 295], [112, 304]].map(([x, y]) => circle(x, y, 3.5, c.bg[1], { transform: 'rotate(-12 103 295)' })),
    ];
  },
  dice: c => [
    `<defs>${radial('bg', [[0, c.bg[0]], [1, c.bg[1]]], [.5, .35, .8])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    ...range(31).map(i => line(200, 430, ...polar(200, 430, 520, 180 + i * 6), c.accent, 1.5, { opacity: .3 })),
    rect(12, 12, 376, 376, 'none', { stroke: c.accent, 'stroke-width': 2.5 }),
    rect(22, 22, 356, 356, 'none', { stroke: c.accent, 'stroke-width': 1, opacity: .6 }),
    ...[[12, 12, 1, 1], [388, 12, -1, 1], [12, 388, 1, -1], [388, 388, -1, -1]].flatMap(([x, y, sx, sy]) => range(3).map(i => rect(sx > 0 ? x : x - 46 + i * 12, sy > 0 ? y : y - 10 - i * 12, 46 - i * 12, 10, c.accent, { opacity: .75 - i * .2, transform: `translate(0 ${sy > 0 ? i * 12 : 0})` }))),
    `<g transform="rotate(-14 110 320)">${rect(52, 262, 116, 116, c.ink, { rx: 16, stroke: c.accent, 'stroke-width': 3 })}${[[80, 290], [110, 320], [140, 350], [80, 350], [140, 290]].map(([x, y]) => circle(x, y, 9, c.bg[1])).join('')}</g>`,
    `<g transform="rotate(16 290 300)">${rect(236, 246, 108, 108, c.ink, { rx: 16, stroke: c.accent, 'stroke-width': 3 })}${[[262, 272], [318, 328], [262, 328], [318, 272], [262, 300], [318, 300]].map(([x, y]) => circle(x, y, 8, c.bg[1])).join('')}</g>`,
    ...[[80, 80], [320, 90], [200, 40]].map(([x, y]) => sparkle(x, y, 7, c.accent, .9)),
  ],
  knockout: c => [
    `<defs>${radial('bg', [[0, c.surface2], [1, c.bg[1]]], [.5, .6, .8])}${linear('cone', [[0, '#ffffff', .22], [1, '#ffffff', 0]])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    poly([[170, -10], [230, -10], [350, 330], [50, 330]], 'url(#cone)'),
    poly([[30, 300], [370, 300], [420, 410], [-20, 410]], c.surface2),
    line(30, 300, 370, 300, c.accent, 3),
    ...[[22], [366]].map(([x]) => rect(x, 170, 12, 150, c.muted, { rx: 3 })),
    ...[205, 240, 275].map((y, i) => path(`M28 ${y}Q200 ${y + 14 - i * 2} 372 ${y}`, { fill: 'none', stroke: c.accent, 'stroke-width': 7, 'stroke-linecap': 'round' })),
    ...[0, 1, 2].map(i => heart(160 + i * 40, 34, 26, i === 2 ? 'none' : c.accent, i === 2 ? { stroke: c.accent, 'stroke-width': 3 } : {})),
    ...range(5).map(i => line(-20 + i * 26, 400, 60 + i * 26, 330, c.accent2, 4, { opacity: .55 })),
    ...range(5).map(i => line(340 + i * 26, 400, 420 + i * 26, 330, c.accent2, 4, { opacity: .55 })),
  ],
  bluff: c => [
    `<defs>${linear('desk', [[0, c.bg[0]], [1, c.bg[1]]])}</defs>`,
    rect(0, 0, 400, 400, 'url(#desk)'),
    ...range(10).map(i => line(0, 20 + i * 42, 400, 8 + i * 42, c.ink, 1, { opacity: .04 })),
    `<g transform="rotate(-5 200 230)">${path('M48 108h104l14 18h188v236H48z', { fill: '#b9965c' })}${rect(48, 136, 306, 226, '#d6b57a', { rx: 6 })}</g>`,
    `<g transform="rotate(4 210 220)">${rect(86, 96, 236, 250, c.ink, { rx: 3 })}${range(7).map(i => rect(108, 128 + i * 26, i % 3 === 1 ? 110 : 190, 7, i % 3 === 2 ? c.bg[1] : c.muted, { opacity: i % 3 === 2 ? .85 : .6 })).join('')}</g>`,
    `<g transform="rotate(-14 296 312)">${rect(226, 288, 140, 50, 'none', { stroke: c.accent2, 'stroke-width': 6, rx: 6 })}${rect(238, 300, 116, 26, 'none', { stroke: c.accent2, 'stroke-width': 2, rx: 3 })}</g>`,
    ...range(6).map(i => path(`M${84 - i * 7} ${318}a${14 + i * 7} ${16 + i * 8} 0 0 1 ${28 + i * 14} 0`, { fill: 'none', stroke: c.muted, 'stroke-width': 2.5, opacity: .35 })),
    circle(318, 106, 44, 'none', { stroke: c.accent, 'stroke-width': 9 }), circle(318, 106, 44, c.accent, { opacity: .08 }),
    line(349, 137, 384, 172, c.accent, 13, { 'stroke-linecap': 'round' }),
  ],
  punchline: c => [
    `<defs><pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">${circle(7, 7, 2.2, c.ink, { opacity: .14 })}</pattern>${linear('bg', [[0, c.bg[0]], [1, c.bg[1]]], [0, 0, 1, 1])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'), rect(0, 0, 400, 400, 'url(#dots)'),
    ...range(18).map(i => line(200, 200, ...polar(200, 200, 320, i * 20), c.ink, 3, { opacity: .14 })),
    star(306, 92, 92, 58, 12, c.accent, { stroke: c.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    star(306, 92, 56, 36, 12, c.surface, { opacity: .95 }),
    star(82, 320, 64, 40, 10, c.accent2, { stroke: c.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    rect(10, 10, 380, 380, 'none', { stroke: c.ink, 'stroke-width': 8 }),
  ],
  cards: c => {
    const card = (turn, mark) => `<g transform="rotate(${turn} 200 470)">${rect(128, 214, 144, 200, c.surface, { rx: 14, stroke: c.accent, 'stroke-width': 3 })}${rect(138, 224, 124, 180, 'none', { rx: 9, stroke: c.accent, 'stroke-width': 1, opacity: .5 })}${mark}</g>`;
    return [
      `<defs><pattern id="weave" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">${rect(0, 0, 2, 12, c.ink, { opacity: .05 })}</pattern>${linear('bg', [[0, c.bg[0]], [1, c.bg[1]]], [0, 0, 1, 1])}</defs>`,
      rect(0, 0, 400, 400, 'url(#bg)'), rect(0, 0, 400, 400, 'url(#weave)'),
      card(-24, heart(164, 246, 22, c.accent)),
      card(24, poly([[236, 236], [250, 256], [236, 276], [222, 256]], c.accent2)),
      card(0, star(200, 300, 34, 14, 5, c.accent) + rect(160, 360, 80, 6, c.ink, { opacity: .5 })),
      ...[[60, 70, c.accent], [340, 64, c.accent2], [52, 200, c.accent2], [348, 190, c.accent]].map(([x, y, fill]) => heart(x, y, 14, fill, { opacity: .35 })),
      rect(10, 10, 380, 380, 'none', { stroke: c.accent, 'stroke-width': 2, rx: 14, opacity: .6 }),
    ];
  },
  tracks: c => [
    `<defs>${linear('bg', [[0, c.bg[0]], [1, c.bg[1]]])}<pattern id="hazard" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">${rect(0, 0, 14, 28, c.accent)}${rect(14, 0, 14, 28, c.bg[1])}</pattern></defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    ...range(9).map(i => { const y = 400 - i * i * 4.2; const w = 120 - i * 9; return rect(200 - w, y - 4, w * 2, 7, '#6b5233', { opacity: .9 - i * .05 }); }),
    path('M160 400L188 240L110 120M240 400L212 240L290 120', { fill: 'none', stroke: c.muted, 'stroke-width': 7, 'stroke-linecap': 'round' }),
    path('M176 400L196 250L138 118M224 400L204 250L262 118', { fill: 'none', stroke: c.muted, 'stroke-width': 3, opacity: .6 }),
    circle(200, 245, 9, c.accent),
    rect(328, 80, 10, 220, c.muted), rect(312, 62, 42, 96, c.surface, { rx: 10, stroke: c.muted, 'stroke-width': 3 }),
    circle(333, 88, 13, c.accent), circle(333, 88, 26, c.accent, { opacity: .2 }), circle(333, 130, 13, c.accent2), circle(333, 130, 26, c.accent2, { opacity: .2 }),
    rect(0, 0, 400, 26, 'url(#hazard)'), rect(0, 374, 400, 26, 'url(#hazard)'),
  ],
  potato: c => [
    `<defs>${radial('bg', [[0, c.bg[0]], [1, c.bg[1]]], [.5, .3, .85])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    ...range(4).map(i => circle(200, 170, 70 + i * 46, 'none', { stroke: c.accent, 'stroke-width': 2, opacity: .32 - i * .06 })),
    path('M0 400V300c30 10 30-60 60-50s20 70 50 40 10-90 50-80 20 70 40 60 30-100 60-80 10 80 40 70 20-60 50-40 20 50 50 40V400z', { fill: '#ff8a1f' }),
    path('M0 400V330c30 10 40-40 70-30s20 50 50 30 30-60 60-50 20 60 50 40 20-50 50-30 30 40 60 20 40-20 60 0V400z', { fill: c.accent }),
    path('M0 400V362c40 6 60-26 100-16s50 26 90 6 60-14 100 0 70 0 110-10V400z', { fill: c.accent2, opacity: .9 }),
    ...[[60, 220, 4], [120, 160, 3], [300, 200, 4], [340, 140, 3], [250, 110, 2.5], [150, 90, 2.5], [90, 120, 2]].map(([x, y, r]) => circle(x, y, r, c.accent, { opacity: .9 })),
    // The potato itself, too hot to hold.
    `<g transform="rotate(-12 300 286)">${path('M246 290c-6-30 18-52 52-52 36 0 60 18 57 44-3 28-30 46-62 44-22-2-42-14-47-36z', { fill: '#c98a4a', stroke: c.surface, 'stroke-width': 4 })}${[[278, 272, 3.5], [318, 292, 3.5], [300, 260, 3], [334, 268, 2.5]].map(([x, y, r]) => circle(x, y, r, '#8a5524')).join('')}</g>`,
    ...[0, 1, 2].map(i => path(`M${276 + i * 22} 226c-8-10 6-16 0-28`, { fill: 'none', stroke: c.accent2, 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: .85 })),
  ],
  showdown: c => [
    `<defs>${linear('red', [[0, c.accent], [1, '#a73a00']], [0, 0, 1, 1])}${linear('blue', [[0, c.bg[0]], [1, c.bg[1]]], [0, 0, 1, 1])}${linear('lamp', [[0, '#ffffff', .25], [1, '#ffffff', 0]])}</defs>`,
    poly([[0, 0], [250, 0], [150, 400], [0, 400]], 'url(#blue)'),
    poly([[250, 0], [400, 0], [400, 400], [150, 400]], 'url(#red)'),
    poly([[60, 30], [110, 30], [190, 400], [-10, 400]], 'url(#lamp)', { opacity: .7 }),
    poly([[290, 30], [340, 30], [410, 400], [210, 400]], 'url(#lamp)', { opacity: .7 }),
    ...[[50, 14], [280, 14]].flatMap(([x, y]) => range(8).map(i => circle(x + (i % 4) * 22 + 8, y + (i / 4 | 0) * 18 + 8, 7, c.ink))),
    poly([[232, 70], [176, 214], [214, 214], [166, 340], [252, 176], [212, 176], [262, 70]], c.accent2, { stroke: c.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    ...range(14).map(i => circle(i * 30 + 10, 400, 22, c.bg[1], { opacity: .55 })),
  ],
  samepage: c => [
    `<defs>${linear('bg', [[0, c.bg[0]], [1, c.bg[1]]])}<clipPath id="left">${circle(150, 170, 112, '#000')}</clipPath></defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    ...range(6).map(i => `<ellipse cx="200" cy="340" rx="${60 + i * 50}" ry="${16 + i * 13}" fill="none" stroke="${c.ink}" stroke-width="2" opacity="${.3 - i * .04}"/>`),
    circle(150, 170, 112, c.accent, { opacity: .92 }), poly([[96, 262], [70, 330], [140, 276]], c.accent, { opacity: .92 }),
    circle(252, 196, 112, c.accent2, { opacity: .9 }), poly([[306, 290], [336, 352], [262, 300]], c.accent2, { opacity: .9 }),
    `<g clip-path="url(#left)">${circle(252, 196, 112, c.ink)}</g>`,
    ...[[50, 60], [350, 56], [360, 330], [40, 300]].map(([x, y]) => sparkle(x, y, 7, c.ink, .7)),
  ],
  spotlight: c => {
    const curtain = (x0, flip) => range(6).map(i => { const x = x0 + (flip ? -1 : 1) * i * 18; return path(`M${x} 40C${x + (flip ? -8 : 8)} 160 ${x - (flip ? -12 : 12)} 280 ${x + (flip ? -26 : 26) * (i / 3)} 400H${x + (flip ? -18 : 18)}C${x + (flip ? -10 : 10)} 280 ${x + (flip ? -26 : 26)} 160 ${x + (flip ? -18 : 18)} 40z`, { fill: i % 2 ? c.bg[0] : c.surface2 }); }).join('');
    return [
      `<defs>${radial('bg', [[0, c.surface2], [1, c.bg[1]]], [.5, .7, .7])}${linear('cone', [[0, c.accent, .45], [1, c.accent, .05]])}</defs>`,
      rect(0, 0, 400, 400, 'url(#bg)'),
      poly([[186, 40], [214, 40], [300, 352], [100, 352]], 'url(#cone)'),
      `<ellipse cx="200" cy="352" rx="110" ry="24" fill="${c.accent}" opacity=".45"/>`,
      star(200, 330, 26, 11, 5, c.accent),
      curtain(0, false), curtain(400, true),
      rect(0, 0, 400, 44, c.bg[0]),
      ...range(9).map(i => circle(22 + i * 45, 44, 24, c.bg[0])),
      path('M0 44' + range(9).map(i => `A24 24 0 0 0 ${45 + i * 45} 44`).join(''), { fill: 'none', stroke: c.accent, 'stroke-width': 4 }),
      rect(0, 0, 400, 8, c.accent),
    ];
  },
  brain: c => [
    `<defs>${radial('bg', [[0, c.bg[0]], [1, c.bg[1]]], [.4, .4, .8])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    ...range(17).map(i => line(i * 25, 0, i * 25, 400, c.accent, 1, { opacity: .07 })),
    ...range(17).map(i => line(0, i * 25, 400, i * 25, c.accent, 1, { opacity: .07 })),
    ...['M0 80H90V150H170', 'M400 120H300V60H220', 'M0 300H70V240H140', 'M260 400V330H330V270H400', 'M120 0V50H200'].flatMap(d => [
      path(d, { fill: 'none', stroke: c.accent, 'stroke-width': 9, opacity: .15 }),
      path(d, { fill: 'none', stroke: c.accent, 'stroke-width': 3, opacity: .75 })]),
    ...[[170, 150], [220, 60], [140, 240], [330, 270], [200, 50], [90, 80]].map(([x, y]) => circle(x, y, 7, c.accent)),
    path('M292 400L352 20M346 400L406 20', { stroke: c.accent2, 'stroke-width': 6, fill: 'none' }),
    // Rungs sit between the two rails at each height.
    ...range(8).map(i => { const y = 380 - i * 47; const x = 292 + (400 - y) * 60 / 380; return line(x, y, x + 54, y, c.accent2, 4); }),
  ],
  topanswers: c => [
    rect(0, 0, 400, 400, c.bg[1]),
    ...[[380, c.bg[0]], [330, c.accent2], [280, c.accent], [230, '#ff8a3d'], [180, c.ink], [130, c.bg[0]]].map(([r, fill]) => circle(200, 420, r, fill)),
    ...[[56, 150], [132, 220], [208, 120], [284, 180]].map(([x, h], i) => rect(x, 400 - h, 60, h + 10, i === 1 ? c.accent : c.surface, { rx: 10, stroke: c.ink, 'stroke-width': 4 })),
    poly([[136, 162], [146, 140], [162, 156], [172, 132], [182, 156], [198, 140], [208, 162]], c.accent, { stroke: c.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    ...range(3).map(i => rect(0, 30 + i * 22, 400, 10, [c.accent, '#ff8a3d', c.accent2][i], { opacity: .85 })),
  ],
  rare: c => [
    `<defs>${radial('bg', [[0, c.bg[0]], [1, c.bg[1]]], [.5, .5, .8])}${linear('gem', [[0, c.accent2], [1, '#2a8fb0']], [0, 0, 1, 1])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    circle(200, 200, 178, c.surface2, { stroke: c.accent, 'stroke-width': 7 }),
    circle(200, 200, 140, 'none', { stroke: c.accent, 'stroke-width': 2, opacity: .55 }),
    ...range(16).map(i => circle(...polar(200, 200, 160, i * 22.5), 6.5, c.accent)),
    ...range(3).map(i => line(...polar(200, 200, 60, i * 60), ...polar(200, 200, 60, i * 60 + 180), c.accent, 5, { opacity: .5 })),
    circle(200, 200, 18, c.accent),
    `<g transform="translate(300 300)">${poly([[-34, -18], [34, -18], [50, 4], [0, 52], [-50, 4]], 'url(#gem)', { stroke: c.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' })}${path('M-50 4H50M-18-18L-26 4 0 52 26 4 18-18', { fill: 'none', stroke: c.ink, 'stroke-width': 2, opacity: .7 })}</g>`,
    ...[[60, 70, 10], [340, 70, 8], [70, 330, 7], [352, 230, 6]].map(([x, y, s]) => sparkle(x, y, s, c.accent2, .9)),
  ],
  bloodmoon: c => [
    `<defs>${linear('sky', [[0, c.bg[0]], [1, c.bg[1]]])}${radial('moon', [[0, '#ffb3a0'], [.6, '#d5413f'], [1, '#7a1626']], [.4, .38, .7])}</defs>`,
    rect(0, 0, 400, 400, 'url(#sky)'),
    circle(288, 104, 92, c.accent, { opacity: .12 }),
    circle(288, 104, 64, 'url(#moon)'),
    circle(268, 92, 11, '#7a1626', { opacity: .35 }), circle(306, 122, 7, '#7a1626', { opacity: .35 }), circle(292, 76, 5, '#7a1626', { opacity: .3 }),
    ...[[60, 60, 5], [130, 36, 4], [176, 112, 3], [44, 150, 4], [364, 210, 4], [110, 190, 3]].map(([x, y, s]) => sparkle(x, y, s, c.accent2, .7)),
    ...[[96, 96, 1], [196, 62, .7], [150, 150, .55]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 0c-8-12-22-12-30-2 6-2 10 0 12 6 4-4 8-4 12 0 2-4 4-6 6-6s4 2 6 6c4-4 8-4 12 0 2-6 6-8 12-6-8-10-22-10-30 2z', { fill: c.bg[1] })}</g>`),
    path('M0 318l34-30 34 30v-26l20-34 20 34v26l30-28 30 28v-44l14-40 14 40v44l34-30 34 30v-22l24-30 24 30v22l22-18 26 22v98H0z', { fill: c.bg[1] }),
    ...[[30, 330], [98, 300], [136, 332], [208, 300], [262, 334], [322, 316], [372, 344]].map(([x, y], i) => rect(x, y, 9, 13, c.accent2, { opacity: i % 2 ? .75 : .45, rx: 1.5 })),
    path('M0 372c60-14 120-14 200 0s140 14 200 0v28H0z', { fill: c.muted, opacity: .1 }),
  ],
  wayoff: c => [
    `<defs>${radial('bg', [[0, c.bg[0]], [1, c.bg[1]]], [.4, .5, .8])}</defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'),
    ...range(5).map(i => circle(150, 210, 150 - i * 30, i % 2 ? c.bg[1] : c.accent, { opacity: i % 2 ? .55 : .5 })),
    circle(150, 210, 12, c.accent2),
    ...range(8).map(i => line(...polar(150, 210, 150, i * 45), ...polar(150, 210, 158, i * 45), c.ink, 3, { opacity: .5 })),
    // One dart in the bullseye region, one miles away.
    `<g transform="rotate(-35 180 190)">${rect(176, 150, 8, 44, c.accent2)}${poly([[170, 150], [190, 150], [180, 128]], c.ink)}</g>`,
    `<g transform="rotate(28 342 70)">${rect(338, 40, 8, 44, c.ink)}${poly([[332, 40], [352, 40], [342, 18]], c.accent)}</g>`,
    path('M318 108c-30 24-60 50-96 70', { fill: 'none', stroke: c.ink, 'stroke-width': 3, 'stroke-dasharray': '6 9', opacity: .5 }),
    ...[[340, 300, 9], [60, 60, 7], [300, 360, 6]].map(([x, y, s]) => sparkle(x, y, s, c.accent, .8)),
  ],
  shade: c => [
    `<defs>${linear('wall', [[0, c.bg[0]], [1, c.bg[1]]])}</defs>`,
    rect(0, 0, 400, 400, 'url(#wall)'),
    // A wall of paint swatches fanning through the spectrum, one ringed as the target.
    ...range(8).flatMap(col => range(6).map(row => rect(40 + col * 40, 70 + row * 40, 34, 34, `hsl(${col * 45} ${70 + row * 4}% ${78 - row * 10}%)`, { rx: 6, opacity: .9 }))),
    rect(196, 186, 42, 42, 'none', { rx: 9, stroke: c.ink, 'stroke-width': 5 }),
    ...[[60, 40, 8], [350, 350, 9], [330, 40, 6]].map(([x, y, s]) => sparkle(x, y, s, c.accent, .8)),
  ],
  catchup: c => [
    `<defs>${linear('sky', [[0, c.bg[0]], [1, c.bg[1]]])}</defs>`,
    rect(0, 0, 400, 400, 'url(#sky)'),
    // Floodlights and a running track curving away.
    ...[[60, 40], [340, 40]].map(([x, y]) => `${poly([[x - 26, y], [x + 26, y], [x + 120, 400], [x - 120, 400]], c.ink, { opacity: .06 })}${rect(x - 22, y - 14, 44, 16, c.accent, { rx: 4 })}`),
    ...range(4).map(i => path(`M-20 ${250 + i * 34}C120 ${210 + i * 30} 280 ${210 + i * 30} 420 ${250 + i * 34}`, { fill: 'none', stroke: i % 2 ? c.accent2 : c.ink, 'stroke-width': 4, opacity: .5 })),
    // The runner's flag ahead, the chaser's arrow closing in.
    path('M300 250V196l34 12-34 12', { fill: c.accent, stroke: c.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    path('M70 286h120M168 266l26 20-26 20', { fill: 'none', stroke: c.accent2, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    circle(200, 120, 46, c.bg[1], { stroke: c.accent, 'stroke-width': 6 }), path('M200 120V92M200 120l18 14', { fill: 'none', stroke: c.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }),
    rect(190, 62, 20, 14, c.accent, { rx: 3 }),
  ],
  sketch: c => [
    rect(0, 0, 400, 400, c.bg[0]),
    ...range(14).map(i => line(0, 40 + i * 28, 400, 40 + i * 28, c.accent2, 1.5, { opacity: .2 })),
    line(56, 0, 56, 400, c.accent, 2, { opacity: .55 }),
    ...range(3).map(i => circle(24, 90 + i * 110, 9, c.bg[1], { stroke: c.muted, 'stroke-width': 1.5, opacity: .8 })),
    star(110, 92, 30, 13, 5, 'none', { stroke: c.accent2, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }),
    path('M320 70c-20 0-20 30 0 30s30-40 0-44-46 30-40 52 50 26 62 0', { fill: 'none', stroke: c.accent2, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
    path('M86 330l34-30 34 30v40H86zM110 370v-22h20v22', { fill: 'none', stroke: c.accent2, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }),
    circle(330, 320, 28, 'none', { stroke: c.accent, 'stroke-width': 3.5 }), path('M318 316h1M342 316h1M316 330c8 10 20 10 28 0', { stroke: c.accent, 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }),
    `<g transform="rotate(38 300 180)">${rect(230, 168, 150, 26, '#f5c542', { stroke: c.ink, 'stroke-width': 2.5 })}${rect(380, 168, 22, 26, '#ef8fa8', { stroke: c.ink, 'stroke-width': 2.5 })}${poly([[230, 168], [230, 194], [204, 181]], '#f2d7b0', { stroke: c.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' })}${poly([[212, 177], [212, 185], [204, 181]], c.ink)}</g>`,
    circle(84, 214, 38, 'none', { stroke: '#a8764a', 'stroke-width': 5, opacity: .14 }),
  ],
  quizrace: c => [
    `<defs>${linear('sky', [[0, c.bg[0]], [1, c.bg[1]]])}${linear('sun', [[0, '#ffd35c'], [1, c.accent]])}</defs>`,
    rect(0, 0, 400, 400, 'url(#sky)'),
    circle(200, 210, 96, 'url(#sun)'),
    ...range(5).map(i => rect(100, 170 + i * 14, 200, 3 + i * 1.5, c.bg[0])),
    rect(0, 226, 400, 174, c.bg[1]),
    ...range(15).map(i => line(200, 226, -500 + i * 100, 400, c.accent2, 1.5, { opacity: .55 })),
    ...range(7).map(i => line(0, 232 + i * i * 4, 400, 232 + i * i * 4, c.accent2, 1.5, { opacity: .5 })),
    path('M188 226L60 400M212 226L340 400', { stroke: c.accent, 'stroke-width': 5, fill: 'none' }),
    path('M188 226L60 400M212 226L340 400', { stroke: c.accent, 'stroke-width': 14, fill: 'none', opacity: .25 }),
    ...range(20).flatMap(i => [rect(i * 20, 380, 10, 10, c.ink), rect(i * 20 + 10, 390, 10, 10, c.ink)]),
  ],
  soclose: c => [
    `<defs>${linear('bg', [[0, c.bg[0]], [1, c.bg[1]]])}<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">${path('M20 0H0V20', { fill: 'none', stroke: c.accent2, 'stroke-width': 1, opacity: .14 })}</pattern></defs>`,
    rect(0, 0, 400, 400, 'url(#bg)'), rect(0, 0, 400, 400, 'url(#grid)'),
    `<g transform="rotate(-16 200 300)">${rect(-40, 270, 520, 64, c.accent, { stroke: c.bg[1], 'stroke-width': 3 })}${range(53).map(i => line(-40 + i * 10, 270, -40 + i * 10, 270 + (i % 10 === 0 ? 30 : i % 5 === 0 ? 20 : 11), c.bg[1], i % 5 === 0 ? 3 : 1.6)).join('')}</g>`,
    rect(-30, 300, 120, 120, c.accent2, { rx: 26, stroke: c.bg[1], 'stroke-width': 4 }), circle(30, 360, 24, c.bg[1]), circle(30, 360, 9, c.accent2),
    line(250, 36, 250, 250, c.ink, 3, { 'stroke-dasharray': '8 8' }),
    poly([[236, 30], [264, 30], [250, 52]], c.accent2),
    ...[[70, 90], [340, 80], [110, 190]].map(([x, y]) => sparkle(x, y, 6, c.accent2, .8)),
  ],
};

export const sceneModes = Object.keys(scenes);

/** The scene for a show as a standalone SVG document. */
export function sceneSvg(mode) {
  const draw = scenes[mode];
  if (!draw) return '';
  const body = draw(identityOf(mode)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">${body}</svg>\n`;
}
