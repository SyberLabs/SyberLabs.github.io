// The hero's background clip: the Gyre, full-bleed, on every screen. Muted, looping, decorative; the copy never
// depends on it. The homepage's first-visit reveal is timed to it (REVEAL, in seconds of its own playback).
export const HERO_MEDIA = {
  landscape: '/media/demos/gyre-full-v1.mp4',
  portrait: '/media/demos/gyre-full-portrait-v1.mp4',
  poster: '/media/demos/gyre-full-v1.jpg',
  portraitPoster: '/media/demos/gyre-full-portrait-v1.jpg',
  still: '/media/demos/gyre-full-v1.jpg',
};
// The headline rises at once, then the panel. Times in seconds of the clip.
export const REVEAL = { frame: .5, earth: 1, panel: 1.4, fallback: 4 };
