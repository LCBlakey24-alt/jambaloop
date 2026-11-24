import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modes} from '../public/game-config.js';
import {releasedGameIds} from '../released-games.js';
import {showIdentity,showMark} from '../public/show-identity.js';
import {launcherTile,launcherPreview,launcherSetupArtwork} from '../public/home-launcher.js';
import {scoreReveal} from '../public/ceremony.js';
import {modeStyle,modeVariables} from '../public/mode-style.js';

const css=readFileSync(new URL('../public/game-show-batch-1.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('batch one styles load after the common presentation styles',()=>{
  const common=html.indexOf('href="/mode-style.css"');
  const batch=html.indexOf('href="/game-show-batch-1.css"');
  const app=html.indexOf('src="/app.js"');
  assert.ok(common>=0 && batch>common && app>batch);
});

test('each batch one show has dedicated stage and answer treatments',()=>{
  for(const id of ['classic','wheel','knockout']){
    assert.ok(css.includes('.game.host-screen[data-mode="'+id+'"]'));
    assert.ok(css.includes('.game[data-mode="'+id+'"] .question-panel .answer'));
    assert.ok(css.includes('@keyframes show-'+id+'-reveal'));
  }
  assert.ok(css.includes('@media(prefers-reduced-motion:no-preference)'));
  assert.equal(new Set(['classic','wheel','knockout'].map(id=>modeStyle(id).backdrop)).size,3);
});

test('every released game keeps usable shared style tokens',()=>{
  assert.deepEqual(modes.map(([id])=>id),[...releasedGameIds]);
  for(const [id] of modes){
    const vars=modeVariables(id);
    assert.match(vars,/--game-accent:#[0-9a-f]{6}/i);
    assert.match(vars,/--mode-panel:#[0-9a-f]{6}/i);
    assert.match(vars,/--mode-type:/);
  }
});

test('first three games have original distinct cover art and finale identity',()=>{
  const ids=['classic','wheel','knockout'];
  assert.equal(new Set(ids.map(id=>showMark(id))).size,3);
  assert.equal(new Set(ids.map(id=>showIdentity(id).finale)).size,3);
  for(const id of ids){
    const mode=modes.find(([key])=>key===id);
    const mark=showMark(id);
    assert.match(mark,/aria-hidden="true"/);
    assert.match(mark,/focusable="false"/);
    for(const view of [launcherTile(mode),launcherPreview(id),launcherSetupArtwork(id)]){
      assert.ok(view.includes(mark));
      assert.ok(view.includes('data-show="'+id+'"'));
    }
    const reveal=scoreReveal(true,{mode:id,ceremony:{starts:0}});
    assert.ok(reveal.includes(showIdentity(id).finale));
    assert.ok(reveal.includes('data-action="ceremony-skip"'));
  }
});
test('every show has its own decorative emblem on launcher, preview and setup art',()=>{
  const marks=modes.map(([id])=>showMark(id));
  assert.equal(new Set(marks).size,modes.length,'Each emblem is distinct');
  for(const [index,mode] of modes.entries()){
    const [id]=mode;
    assert.match(marks[index],/^<svg class="show-mark"[^>]*aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(marks[index],/<(script|image|foreignObject|text)\b|href=/,'Emblems are inline vector paths only');
    assert.ok(launcherTile(mode).includes(marks[index]));
    assert.ok(launcherPreview(id).includes(marks[index]));
  }
});
test('other modes retain the generic ceremony until their redesign batch lands',()=>{
  for(const [id] of modes.filter(([id])=>!['classic','wheel','knockout'].includes(id))){
    assert.equal(showIdentity(id),undefined);
    assert.ok(!scoreReveal(true,{mode:id,ceremony:{starts:0}}).includes('show-finale-identity'));
  }
  assert.equal(showMark('__proto__'),'');
});
