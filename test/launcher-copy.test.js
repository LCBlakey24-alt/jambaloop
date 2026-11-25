import assert from 'node:assert/strict';
import {test} from 'node:test';
import {modes} from '../public/game-config.js';
import {launcherCopy,launcherTile,launcherPreview} from '../public/home-launcher.js';
import {carouselInfo} from '../public/game-carousel.js';

test('every game has a distinct concise gameplay hook and plain-language description',()=>{
  const hooks=new Set(), descriptions=new Set();
  for(const mode of modes){
    const [id,name,description]=mode;
    const {strap,steps}=launcherCopy(id);
    assert.ok(strap.length>=10 && strap.length<=42,id+' hook must fit compact covers');
    assert.ok(description.length>=20 && description.length<=110,id+' summary must stay brief');
    assert.equal(steps.length,3,id+' needs a three-step guide');
    hooks.add(strap);
    descriptions.add(description);
    assert.ok(launcherTile(mode).includes(strap),id+' hook missing from tile');
    assert.ok(launcherPreview(id).includes(description),id+' summary missing from preview');
    assert.ok(carouselInfo(mode,false).includes(description),id+' summary missing from carousel');
    assert.ok(!launcherTile(mode).includes('.. Preview'),id+' duplicate punctuation');
  }
  assert.equal(hooks.size,modes.length);
  assert.equal(descriptions.size,modes.length);
});
