// Spot the Bluff: what the bluffer is told. The bluffer never sees the prompt, only the shape of
// answer the others are writing, so they can write something that might fit instead of a blind guess.
// The hint is deliberately vague: it says what kind of thing to write, never what the prompt is about.
const shapes = [
  [/\b(wear|wearing|worn|outfit|costume)\b/i, 'Something to wear'],
  [/\bjob\b/i, 'A job'],
  [/\b(reason|excuse)\b/i, 'A reason or an excuse'],
  [/\b(say|says|said|shout|whisper|announce|slogan|motto|catchphrase|password|advice)\b/i, 'Something somebody might say'],
  [/\b(go wrong|goes wrong|interrupt|ruin|spoil|cancel)\b/i, 'Something that happens'],
  [/\b(activity|game you|way to|do at|do on|do in|do when|do to|do while|people do|could do|would do|might do|you do|never do|caught doing|does all day|does at|does when)\b/i, 'Something that someone does'],
  [/\b(place|where|somewhere|destination)\b/i, 'A place'],
  [/\b(animal|pet shop|creature|lives in)\b/i, 'A living creature'],
  [/\b(sound|noise|hear|squeak|squeaks|rattle|rattles)\b/i, 'A sound, or something that makes one'],
  [/\b(eat|food|snack|flavour|topping|sandwich|breakfast|lunch|dinner|pizza|soup|drink|toast|cereal)\b/i, 'Something to eat or drink'],
  [/\b(name for|called|title|nickname)\b/i, 'A name or a title'],
  [/\b(complain|lie about|pretend|red flag|regret|realise|hangover|queue for)\b/i, 'Something from everyday life'],
];
export const bluffShapes = Object.freeze([...new Set(shapes.map(([, hint]) => hint)), 'An object you could pick up or point at']);

/** The hint shown only to the bluffer for this prompt. */
export function bluffHint(prompt) {
  const text = String(prompt ?? '');
  return shapes.find(([pattern]) => pattern.test(text))?.[1] ?? 'An object you could pick up or point at';
}
