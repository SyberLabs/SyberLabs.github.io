// The hero's clip: the Gyre alone, full-bleed, on every screen (no Sophia frame, no Earth, no painting).
// The homepage's first-visit reveal is timed to it (REVEAL, in seconds of its own playback).
export const HERO_MEDIA = {
  landscape: '/mateo/demos/gyre-full-v1.mp4',
  portrait: '/mateo/demos/gyre-full-portrait-v1.mp4',
  poster: '/mateo/demos/gyre-full-v1.jpg',
  portraitPoster: '/mateo/demos/gyre-full-portrait-v1.jpg',
  still: '/mateo/demos/gyre-full-v1.jpg',
};
// The headline rises at once; the role follows, then the panel. Times in seconds of the clip.
export const REVEAL = { frame: .5, earth: 1, panel: 1.4, fallback: 4 };
