// The hero's one clip: Gyre motion, the RISE Sophia frame drawing itself, Earth held inside it, then back to Gyre.
// The homepage's first-visit reveal is timed to this clip (REVEAL, in seconds of its own playback).
export const HERO_MEDIA = {
  landscape: '/mateo/demos/gyre-sophia-v1.mp4',
  // phones show the Gyre alone, full-bleed: no Sophia frame, no Earth, no painting
  portrait: '/mateo/demos/gyre-full-portrait-v1.mp4',
  poster: '/mateo/demos/gyre-sophia-v1.jpg',
  portraitPoster: '/mateo/demos/gyre-full-portrait-v1.jpg',
  // wide screens: the clip held at 10 s, the Sophia frame closed around its centre, shown with a painting laid in it
  // whenever the clip cannot move (autoplay blocked, as in iOS Low Power Mode; reduced motion; a media error)
  still: '/mateo/demos/gyre-sophia-held-v1.jpg',
};
// gyre: Gyre alone; frame: the Sophia frame starts drawing; earth: Earth fully framed; panel: the hiring panel rises.
export const REVEAL = { frame: 3.4, earth: 5.4, panel: 5.7, fallback: 8 };
