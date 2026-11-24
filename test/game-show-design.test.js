import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modes} from '../public/game-config.js';
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

test('all 18 registered games keep usable shared style tokens',()=>{
  assert.equal(modes.length,18);
  for(const [id] of modes){
    const vars=modeVariables(id);
    assert.match(vars,/--game-accent:#[0-9a-f]{6}/i);
    assert.match(vars,/--mode-panel:#[0-9a-f]{6}/i);
    assert.match(vars,/--mode-type:/);
  }
});
