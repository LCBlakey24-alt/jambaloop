import assert from 'node:assert/strict';
import test from 'node:test';
import { modes } from '../public/game-config.js';
import { narration, narratorAsset, recordedIntros } from '../public/narration-scripts.js';
import { launcherPreview } from '../public/home-launcher.js';

test('every game mode offers an original spoken introduction and a preview Listen control', () => {
  const ids = modes.map(([id]) => id);
  assert.equal(ids.length, 12);
  assert.deepEqual(Object.keys(narration).sort(), [...ids].sort());
  for(const [id, name] of modes) {
    assert.ok(narration[id].length > 80 && narration[id].length < 400, 'Intro length invalid for ' + id);
    const html=launcherPreview(id);
    assert.match(html,new RegExp('data-action="narrator-toggle" data-mode="'+id+'"'));
    assert.match(html,/data-narrator-label>Listen to intro</);
    assert.match(html,/Read spoken introduction/);
    assert.ok(html.includes(narration[id]),name+' transcript missing');
    assert.match(html,/data-action="host"/,'Setup must remain accessible');
  }
});

test('only committed professional recordings are advertised as recorded and credited', () => {
  assert.deepEqual([...recordedIntros].sort(), ['board','classic','quizrace']);
  for (const [id] of modes) {
    const url=narratorAsset(id),html=launcherPreview(id);
    if (recordedIntros.has(id)) {
      assert.equal(url,'/audio/narrator/'+id+'.mp3');
      assert.match(html,/Voice generated with ElevenLabs/);
      assert.match(html,/Recorded announcer/);
    } else {
      assert.equal(url,null);
      assert.doesNotMatch(html,/Voice generated with ElevenLabs/);
      assert.match(html,/Device read-aloud/);
    }
  }
});
