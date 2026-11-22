import { avatarView } from './party-views.js';

const number = new Intl.NumberFormat();
const previousHold = 1250;
const rearrangeHold = 650;
const rearrangeDuration = 850;
let checkpoint;
let skippedKey;

export function scoreBreakTimeline(count) {
  const lastSingles = Math.min(count, 3);
  const lower = count - lastSingles;
  const frameLimit = count > 80 ? 12 : 7;
  const batchSize = Math.max(1, Math.ceil(lower / frameLimit));
  const groups = [];
  let start = previousHold;
  for (let first = 0; first < count;) {
    const end = first < lower ? Math.min(lower, first + batchSize) : first + 1;
    const duration = first >= lower ? 770 : end - first > 12 ? 740 : 580;
    groups.push({ start, end: start + duration, first, last: end });
    start += duration;
    first = end;
  }
  return { groups, reorder: start, move: start + rearrangeHold, settle: start + rearrangeHold + rearrangeDuration };
}

function movement(entry, shown) {
  const gain = entry.previousRank - entry.rank;
  const direction = gain > 0 ? 'up' : gain < 0 ? 'down' : 'same';
  if (!shown) return '<span class="score-break-move" hidden></span>';
  const change = Math.abs(gain);
  const summary = `Moved ${direction} ${change} ${change === 1 ? 'place' : 'places'}`;
  return `<span class="score-break-move" data-direction="${direction}">
    ${gain ? `<span aria-hidden="true">${gain > 0 ? '↑' : '↓'} ${change}</span><span class="sr-only">${summary}</span>` : 'Held'}</span>`;
}

function finding(entry, newScore, moving) {
  if (entry.position !== undefined) {
    return newScore ? `Space ${entry.position} · ${number.format(entry.previousScore)} pts before` : `Space ${entry.previousPosition}`;
  }
  if (newScore) return `${number.format(entry.previousScore)} pts before`;
  return moving ? 'Previous score' : '';
}

function rowView(entry, {
  escape, newScore = false, moving = false, animate = false, featured = false,
}) {
  const color = /^#[\da-f]{6}$/i.test(entry.color ?? '') ? entry.color : '';
  const rank = moving ? entry.rank : entry.previousRank;
  return `<li class="score-break-row" data-score-id="${escape(entry.id)}" data-score-new="${newScore}" data-spotlit="${featured}"${animate ? ' data-score-flash' : ''}${color ? ` style="--score-row-accent:${color}"` : ''}>
    <span class="score-break-rank"><span aria-hidden="true">#${rank}</span><span class="sr-only">Place ${rank}</span></span>
    <div class="score-break-player">${color ? '<span class="score-break-team" aria-hidden="true"></span>' : avatarView(entry, escape)}
      <div><strong>${escape(entry.name)}</strong><small class="score-break-history">${finding(entry, newScore, moving)}</small></div>
    </div>
    <span class="score-break-total">${number.format(newScore ? entry.score : entry.previousScore)} <small>pts</small></span>
    ${movement(entry, moving)}
  </li>`;
}

export function scoreBreakView(state, { host, canControl, escape, icons }) {
  const data = state.scoreBreak;
  const key = `${state.code}/${state.game}/${data.number}/${data.starts}`;
  const sameBreak = checkpoint?.key === key;
  if (!sameBreak) skippedKey = undefined;
  const entries = data.entries ?? [];
  const previous = [...entries].sort((a, b) => a.previousRank - b.previousRank || a.previousIndex - b.previousIndex);
  const count = data.entryCount ?? (entries.length || (state.teams?.length || state.playerCount || 1));
  checkpoint = { key, data, entries, previous, escape, host, page: sameBreak ? checkpoint.page : 0, timeline: scoreBreakTimeline(count) };
  const readyControl = canControl ? `<button class="button primary" data-action="advance">Continue quiz ${icons('arrow-right')}</button>` : '';
  return `<section class="game-panel score-break" data-score-break-key="${escape(key)}">
    <header class="score-break-head"><div>
      <div class="eyebrow">SCORE CHECKPOINT</div><h1>Standings after ${state.mode === 'board' ? 'turn' : 'question'} ${data.number}</h1>
    </div>${readyControl}</header>
    ${host ? `<div class="score-break-stage" data-score-phase="previous">
      <div class="score-break-meta">
        <p class="score-break-spotlight" role="status" tabindex="-1"></p>
        <span class="score-break-count"></span>
      </div>
      <div class="score-break-track" aria-hidden="true"></div>
      <ol class="score-break-list" aria-label="Leaderboard"></ol>
    </div>
    <div class="score-break-foot">
      <button type="button" class="button outline small" data-score-skip>Skip animation</button>
      <nav class="score-break-pages" aria-label="Leaderboard pages" hidden>
        <button type="button" class="button outline small" data-score-page="-1" aria-label="Previous standings page">${icons('chevron-left')} Previous</button>
        <span aria-live="polite"></span>
        <button type="button" class="button outline small" data-score-page="1" aria-label="Next standings page">Next ${icons('chevron-right')}</button>
      </nav>
    </div>`
    : `<div class="score-break-stage score-break-personal" data-score-phase="previous">
      <p class="score-break-spotlight" role="status" tabindex="-1"></p>
      <ol class="score-break-list" aria-label="Your standing"></ol>
    </div>${canControl ? '' : '<p class="score-break-wait">The quiz resumes when the host or captain continues.</p>'}`}
  </section>`;
}

function stageSize() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  const compact = document.documentElement.classList.contains('mobile-deck');
  if (compact) return height < 410 ? 2 : height < 530 ? 3 : 5;
  return height < 780 ? 7 : 9;
}

function featuredRows(current, previous, limit) {
  const selected = new Set([
    ...current.slice(0, Math.ceil(limit / 2)).map(row => row.id),
    ...previous.slice(0, Math.floor(limit / 2)).map(row => row.id),
  ]);
  for (const entry of current) {
    if (selected.size >= limit) break;
    selected.add(entry.id);
  }
  return { current: current.filter(row => selected.has(row.id)), previous: previous.filter(row => selected.has(row.id)) };
}

function updateRows(list, rows, getOptions, flip) {
  const oldOrder = Array.from(list.children);
  const byID = new Map(oldOrder.map(element => [element.dataset.scoreId, element]));
  const oldBounds = flip ? new Map(oldOrder.map(element => [element.dataset.scoreId, element.getBoundingClientRect()])) : null;
  const next = rows.map(entry => {
    const options = getOptions(entry);
    const flags = [options.newScore, options.moving, options.animate, options.featured].map(Boolean).join('/');
    let item = byID.get(String(entry.id));
    if (!item || item.dataset.scoreFlags !== flags) {
      const template = document.createElement('template');
      template.innerHTML = rowView(entry, options);
      const fresh = template.content.firstElementChild;
      if (item) {
        item.innerHTML = fresh.innerHTML;
        item.dataset.scoreNew = fresh.dataset.scoreNew;
        item.dataset.spotlit = fresh.dataset.spotlit;
        item.toggleAttribute('data-score-flash', fresh.hasAttribute('data-score-flash'));
      } else item = fresh;
      item.dataset.scoreFlags = flags;
    }
    return item;
  });
  if (next.length !== oldOrder.length || next.some((item, index) => item !== oldOrder[index])) list.replaceChildren(...next);
  if (!flip) return;
  for (const row of next) {
    const before = oldBounds.get(row.dataset.scoreId);
    if (!before || !row.animate) continue;
    const after = row.getBoundingClientRect();
    const distance = before.top - after.top;
    if (Math.abs(distance) < 1) continue;
    row.animate([
      { transform: `translateY(${distance}px)` },
      { transform: 'translateY(0)' },
    ], { duration: 670, easing: 'cubic-bezier(.23,.89,.24,1)' });
  }
}

const attached = new WeakMap();

function scoreMoment(timeline, elapsed, skip) {
  if (skip || elapsed >= timeline.settle) return { phase: 'settled', step: 'settled' };
  if (elapsed >= timeline.move) return { phase: 'reorder', step: 'moving' };
  if (elapsed >= timeline.reorder) return { phase: 'reorder', step: 'ready' };
  const group = timeline.groups.find(candidate => elapsed >= candidate.start && elapsed < candidate.end);
  return group ? { phase: 'reveal', step: group.first, group } : { phase: 'previous', step: 'previous' };
}

function setText(parent, selector, value) {
  const element = parent.querySelector(selector);
  if (element && element.textContent !== value) element.textContent = value;
}

function updatePersonal(element, context, settled) {
  const { data, escape } = context;
  setText(element, '.score-break-spotlight', settled ? (data.own ? 'Your standing' : 'Standings updated') : 'Watch the TV for the score reveal');
  updateRows(element.querySelector('.score-break-list'), data.own ? [data.own] : [],
    () => ({ escape, newScore: settled, moving: settled }), false);
}

function displayStage(element, context, display, pageSize, pageState) {
  const { entries, previous, escape } = context;
  const { phase, step, group } = display;
  const settled = phase === 'settled';
  const flip = step === 'moving';
  const list = element.querySelector('.score-break-list');
  const reordered = settled || flip;
  const { current: featuredCurrent, previous: featuredPrevious } = featuredRows(entries, previous, pageSize);
  const paging = element.querySelector('.score-break-pages');
  const skip = element.querySelector('[data-score-skip]');
  let currentRows = previous.slice(0, pageSize);
  let spotlight = 'Previous standings';
  let progress = 0;
  let revealIDs = new Set();
  let flashIDs = new Set();
  let flags = '';
  let dense = false;

  if (phase === 'reveal') {
    const range = previous.slice(previous.length - group.last, previous.length - group.first);
    flashIDs = new Set(range.map(row => row.id));
    revealIDs = new Set(previous.slice(previous.length - group.last).map(row => row.id));
    if (entries.length > pageSize) {
      dense = range.length > pageSize && !document.documentElement.classList.contains('mobile-deck');
      currentRows = dense ? range : range.slice(-pageSize);
    }
    spotlight = range.length === 1 ? `${range[0].name} · ${number.format(range[0].score)} pts`
      : `Revealing ${group.last - group.first} scores`;
    progress = group.last;
    flags = range.length > currentRows.length ? `${currentRows.length} shown · ${group.last}/${entries.length}`
      : `${group.last} of ${entries.length} scores`;
  } else if (phase === 'reorder') {
    currentRows = reordered ? featuredCurrent : featuredPrevious;
    spotlight = reordered ? 'The standings shift' : 'Scores locked in';
    progress = entries.length;
  } else if (settled) {
    const pages = Math.max(1, Math.ceil(entries.length / pageSize));
    pageState.page = Math.min(pageState.page, pages - 1);
    const index = pageState.page * pageSize;
    currentRows = entries.slice(index, index + pageSize);
    spotlight = 'Current standings';
    flags = entries.length > pageSize ? `${index + 1}–${index + currentRows.length} of ${entries.length}` : '';
    progress = entries.length;
    paging.hidden = pages <= 1;
    setText(paging, 'span', `${pageState.page + 1} of ${pages}`);
    paging.querySelector('[data-score-page="-1"]').disabled = pageState.page === 0;
    paging.querySelector('[data-score-page="1"]').disabled = pageState.page >= pages - 1;
  }
  list.toggleAttribute('data-score-dense', dense);
  if (!settled) paging.hidden = true;
  const wasFocused = settled && document.activeElement === skip;
  skip.hidden = settled;
  if (wasFocused) {
    const nextQuestion = element.querySelector('[data-action="advance"]');
    const focus = nextQuestion?.getClientRects().length ? nextQuestion : element.querySelector('.score-break-spotlight');
    focus?.focus({ preventScroll: true });
  }
  setText(element, '.score-break-spotlight', spotlight);
  setText(element, '.score-break-count', flags);
  const track = element.querySelector('.score-break-track');
  track.style.setProperty('--score-progress', entries.length ? progress / entries.length : 0);
  updateRows(list, currentRows, entry => ({
    escape, newScore: settled || phase === 'reorder' || revealIDs.has(entry.id), moving: reordered,
    animate: flashIDs.has(entry.id), featured: entries.length <= pageSize && flashIDs.has(entry.id),
  }), flip && pageState.step === 'ready');
  if (!entries.length) setText(element, '.score-break-spotlight', 'No scores to show at this checkpoint.');
  pageState.step = step;
}

export function updateScoreBreak(root, serverNow) {
  const node = root.querySelector('[data-score-break-key]');
  const context = checkpoint;
  if (!node || node.dataset.scoreBreakKey !== context?.key) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = node.querySelector('.score-break-stage');
  let controls = attached.get(node);
  if (!controls) {
    controls = { page: context.page, stamp: '', lastTime: serverNow };
    attached.set(node, controls);
    node.addEventListener('click', event => {
      if (event.target.closest('[data-score-skip]')) {
        skippedKey = node.dataset.scoreBreakKey;
        updateScoreBreak(root, controls.lastTime);
      }
      const pager = event.target.closest('[data-score-page]');
      if (!pager || pager.disabled) return;
      controls.page += Number(pager.dataset.scorePage);
      updateScoreBreak(root, controls.lastTime);
      if (pager.disabled) node.querySelector(`[data-score-page="${-Number(pager.dataset.scorePage)}"]`)?.focus({ preventScroll: true });
    });
  }
  controls.lastTime = Math.max(serverNow, controls.lastTime);
  const elapsed = controls.lastTime - context.data.starts;
  const skipped = reduced || skippedKey === context.key;
  const display = scoreMoment(context.timeline, elapsed, skipped);
  const phase = context.host ? display.phase : display.phase === 'settled' ? 'settled' : 'previous';
  const size = stageSize();
  const stamp = `${context.host ? display.step : phase}/${size}/${controls.page}`;
  if (controls.stamp === stamp) return;
  stage.dataset.scorePhase = phase;
  if (context.host) displayStage(node, context, display, size, controls);
  else updatePersonal(node, context, phase === 'settled');
  context.page = controls.page;
  controls.stamp = stamp;
}
