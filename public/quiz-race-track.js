/* Lightweight arc-length SVG race track. Visual coordinates never decide who wins. */
const ns = 'http://www.w3.org/2000/svg';
const pathData = 'M80 280 C130 80 300 90 365 225 S555 350 635 210 S815 65 897 205 S1035 345 1080 180';
const createSvg = (tag, attrs = {}) => {
  const node = document.createElementNS(ns, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
};
const escapeText = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));

export function raceTrackMarkup() {
  return `<div class="quiz-race-scene"><div class="race-track-stage">
    <svg class="quiz-race-svg" viewBox="0 0 1160 420" role="img" aria-label="Winding course with racers and coloured progress trails">
      <path class="race-road-outline" d="${pathData}"/><path class="race-road" d="${pathData}"/>
      <path class="race-road-centre" d="${pathData}"/>
      <path class="race-centerline" id="race-curve" d="${pathData}" fill="none" stroke="transparent" stroke-width="1"/>
      <g id="race-path-layers"></g><g id="race-racers"></g>
      <g class="race-finish" transform="translate(1080 180)"><rect x="-11" y="-56" width="22" height="112" fill="#fff" stroke="#172139" stroke-width="3"/><path d="M-11 -56 h11 v14 h11 v14 h-11 v14 h11 v14 h-11 v14 h11 v14 h-11 v14 h11 v14 h-22 v-14 h11 v-14 h-11 v-14 h11 v-14 h-11 v-14 h11 v-14 h-11z" fill="#16223e"/><text x="0" y="-75" text-anchor="middle" fill="#fff" font-size="20" font-weight="800">FINISH</text></g>
      <text x="75" y="358" fill="#d9e6fa" font-size="18" font-weight="700">START</text>
    </svg></div></div>`;
}

export function mountQuizRaceTrack(root) {
  const svg = root.querySelector('.quiz-race-svg');
  if (!svg) return { update() {}, dispose() {} };
  const guide = svg.querySelector('#race-curve');
  const trailLayer = svg.querySelector('#race-path-layers');
  const racersLayer = svg.querySelector('#race-racers');
  const length = guide.getTotalLength();
  const objects = new Map();
  const clamp = v => Math.max(0, Math.min(1, v));
  const offsetPoint = (ratio, lane) => {
    const p = guide.getPointAtLength(clamp(ratio) * length);
    const early = guide.getPointAtLength(clamp(ratio - .002) * length);
    const late = guide.getPointAtLength(clamp(ratio + .002) * length);
    const dx = late.x - early.x, dy = late.y - early.y;
    const normal = Math.hypot(dx, dy) || 1;
    return [p.x - dy / normal * lane, p.y + dx / normal * lane];
  };
  const pathPart = (start, end, lane, samples = 26) => {
    const items = [];
    for (let i = 0; i <= samples; i++) {
      const [x, y] = offsetPoint(start + (end - start) * i / samples, lane);
      items.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return items.join(' ');
  };
  function add(racer) {
    const line = createSvg('path', {class:'race-progress-path',stroke:racer.color,fill:'none'});
    const wake = createSvg('path', {class:'race-wake-path',stroke:racer.color,fill:'none'});
    trailLayer.append(line, wake);
    const group = createSvg('g', {class:'race-racer'});
    const outer = createSvg('circle', {r:22,fill:'#101626',stroke:racer.color,'stroke-width':5});
    const center = createSvg('circle', {r:14,fill:racer.color});
    const numeral = createSvg('text', {'text-anchor':'middle',dy:'5','font-size':16,'font-weight':900,fill:'#101626'});
    numeral.textContent = racer.marker;
    group.append(outer,center,numeral);
    racersLayer.append(group);
    const item = {line,wake,group};
    objects.set(racer.id,item);
    return item;
  }
  return {
    update(players, trackLength, msAhead = 0, reduced = false) {
      const count = players.length;
      players.forEach((racer, index) => {
        const item = objects.get(racer.id) ?? add(racer);
        const lane = (racer.marker - 1 - (count - 1) / 2) * 12;
        const progress = clamp((racer.distance + (racer.finishedAt !== undefined ? 0 : racer.speed * msAhead / 1000)) / trackLength);
        const [x,y] = offsetPoint(progress,lane);
        item.group.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        const distance = reduced ? .045 : racer.speed > 1.02 ? .085 : .06;
        item.line.setAttribute('d',pathPart(0,progress,lane,Math.max(3,Math.ceil(38*progress))));
        item.wake.setAttribute('d',pathPart(Math.max(0,progress-distance),progress,lane,12));
        item.wake.setAttribute('opacity',racer.speed>1.02?'1':racer.speed<.9?'.34':'.65');
      });
    },
    dispose(){objects.clear();}
  };
}
