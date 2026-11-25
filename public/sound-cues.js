import { modeStyle } from './mode-style.js';

let cachedNoise;
let noiseContext;

function swoosh(context, start) {
  if (noiseContext !== context) {
    cachedNoise = context.createBuffer(1, Math.ceil(context.sampleRate * .24), context.sampleRate);
    const samples = cachedNoise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    noiseContext = context;
  }
  const noise = context.createBufferSource();
  noise.buffer = cachedNoise;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, start);
  filter.frequency.exponentialRampToValueAtTime(2200, start + .18);
  filter.Q.value = .8;
  const level = context.createGain();
  level.gain.setValueAtTime(.001, start);
  level.gain.exponentialRampToValueAtTime(.075, start + .085);
  level.gain.exponentialRampToValueAtTime(.001, start + .23);
  noise.connect(filter).connect(level).connect(context.destination);
  noise.start(start);
}

export function playCue(context, mode, cue) {
  if (context?.state !== 'running') return;
  const { notes, wave } = modeStyle(mode);
  const start = context.currentTime + .01;
  if (cue === 'rolling' || cue === 'pass') swoosh(context, start);
  const melody = cue === 'estimate-opening' ? [notes[0]/2,notes[0]]
    : cue === 'estimate-guesses' ? [notes[1]]
    : cue === 'estimate-suspense' ? [notes[0]/2,notes[1]/2,notes[0]/2]
    : cue === 'estimate-actual' ? [notes[0],notes[1],notes[2]]
    : cue === 'estimate-winner' ? [...notes,notes[0]*2]
    : cue === 'finished' ? [...notes, notes[0] * 2]
    : ['reveal', 'party-reveal'].includes(cue) ? notes.slice(1)
    : cue === 'score-break' ? [notes[0] / 2, notes[1] / 2, notes[0]]
    : cue === 'party-vote' ? [notes[1], notes[0]]
    : cue === 'rolling' ? [] : [cue === 'pass' ? notes[2] : notes[0]];
  for (const [index, frequency] of melody.entries()) {
    const offset = start + index * .105;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.001, offset);
    gain.gain.exponentialRampToValueAtTime(.095, offset + .019);
    gain.gain.exponentialRampToValueAtTime(.001, offset + .21);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(offset);
    oscillator.stop(offset + .22);
  }
}

/** A short clock tick for Hot Potato; higher and sharper when time is short. */
export function playTick(context, urgent = false) {
  if (context?.state !== 'running') return;
  const start = context.currentTime + .005;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = urgent ? 2100 : 1500;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(urgent ? .06 : .035, start + .004);
  gain.gain.exponentialRampToValueAtTime(.0001, start + .04);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + .05);
}

export function playTowerImpact(context, hit) {
  if (context?.state !== 'running') return;
  const start = context.currentTime;
  const strength = [.092, .079, .076, .067, .088, .041][hit];
  const frequency = [410, 355, 310, 253, 202, 174][hit];
  for (const [pitch, amount] of [[frequency, strength], [frequency * 2.42, strength * .38]]) {
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(pitch, start);
    tone.frequency.exponentialRampToValueAtTime(pitch * .72, start + .065);
    volume.gain.setValueAtTime(amount, start);
    volume.gain.exponentialRampToValueAtTime(.001, start + .078);
    tone.connect(volume).connect(context.destination);
    tone.start(start);
    tone.stop(start + .085);
  }
}
