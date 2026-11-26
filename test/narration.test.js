import assert from 'node:assert/strict';
import test from 'node:test';
import { modes } from '../public/game-config.js';
import { narration, narratorAsset, recordedIntros } from '../public/narration-scripts.js';
import { duoIntros, spoken } from '../public/duo-scripts.js';
import { duoRecordings } from '../public/duo-recordings.js';
import { existsSync } from 'node:fs';
import { launcherPreview } from '../public/home-launcher.js';

test('every game mode offers an original spoken introduction and a preview Listen control', () => {
  const ids = modes.map(([id]) => id);
  assert.ok(ids.length >= 13,'Every launched Jambaloop mode must have an intro');
  assert.deepEqual(Object.keys(narration).sort(), [...ids].sort());
  for(const [id, name] of modes) {
    assert.ok(narration[id].length > 80 && narration[id].length < 400, 'Intro length invalid for ' + id);
    const html=launcherPreview(id);
    assert.match(html,new RegExp('data-action="narrator-toggle" data-mode="'+id+'"'));
    assert.match(html,/data-narrator-label>Listen to intro</);
    assert.match(html,/Read spoken introduction/);
    // The transcript always matches what is spoken: the two-host exchange once recorded.
    if (duoRecordings[id]) for (const [, text] of duoIntros[id]) assert.ok(html.includes(spoken(text)),name+' transcript line missing');
    else assert.ok(html.includes(narration[id]),name+' transcript missing');
    assert.match(html,new RegExp('data-action="party" data-mode="'+id+'"'),'Hosting a party on this game must remain one tap away');
  }
});

test('only committed recordings are advertised as recorded and credited', () => {
  assert.deepEqual([...recordedIntros].sort(), ['board','classic','quizrace']);
  for (const [id] of modes) {
    const html=launcherPreview(id);
    assert.equal(narratorAsset(id), recordedIntros.has(id) ? '/audio/narrator/'+id+'.mp3' : null);
    if (duoRecordings[id]) {
      assert.ok(existsSync(new URL('../public/audio/duo/'+id+'.mp3', import.meta.url)));
      assert.match(html,/Recorded: Max and Poppy/);
      assert.match(html,/Voice generated with ElevenLabs/);
    } else if (recordedIntros.has(id)) {
      assert.match(html,/Voice generated with ElevenLabs/);
      assert.match(html,/Recorded announcer/);
    } else {
      assert.doesNotMatch(html,/Voice generated with ElevenLabs/);
      assert.match(html,/Device read-aloud/);
    }
  }
});
