// What the RISE Sophia frame holds in the hero clip, laid over Earth's disc in step with it (src/BackgroundVideo.jsx).
// Earth itself is never seen: the picture appears with Earth's first frame and covers it until it has gone. Each pass
// of the clip shows one, chosen at random without repeating the last, and the frame always holds something warm
// against the blue page. The Pink Cloud is open access (CC0) at the Cleveland Museum of Art; the other two are
// plates drawn by Mateo's own Engines code (Ostensoria), so the hero shows work he built rather than generated images.
export const FRAME_ART = [
  { id: 'pink-cloud', title: 'The Pink Cloud', by: 'Henri-Edmond Cross', date: 'c. 1896',
    src: '/mateo/frame/pink-cloud-cross-2020.106.jpg', href: 'https://www.clevelandart.org/art/2020.106' },
  { id: 'ostensoria-ember', title: 'Ostensoria', by: 'Mateo Robles', made: 'drawn by his Engines code',
    src: '/mateo/frame/ostensoria-02-mateo-robles.jpg', href: 'https://sykosyber.github.io/engines/#ostensoria' },
  { id: 'ostensoria-rose', title: 'Ostensoria', by: 'Mateo Robles', made: 'drawn by his Engines code',
    src: '/mateo/frame/ostensoria-04-mateo-robles.jpg', href: 'https://sykosyber.github.io/engines/#ostensoria' },
];

// Where Earth's disc sits in each clip, in clip pixels (both clips are 1280 by 720, one turned on its side), and
// Earth's size over the clip as a fraction of that disc: [seconds, radius]. Earth arrives as a dot at 4.62 s and fills
// the frame by 5.12 s, holds, then shrinks from 14.67 s and is gone by 15.42 s. Measured from the rendered frames.
export const FRAME_DISC = {
  landscape: { w: 1280, h: 720, x: 678.8, y: 360.4, r: 334 },
  portrait: { w: 720, h: 1280, x: 381.5, y: 640.8, r: 334 },
  earth: [[4.6, 0], [4.62, .1], [4.75, .3], [4.83, .47], [4.92, .64], [5, .81], [5.08, .94], [5.12, 1],
    [14.67, 1], [14.75, .94], [14.83, .86], [14.92, .77], [15, .67], [15.08, .57], [15.18, .44], [15.27, .36], [15.33, .29], [15.38, .17], [15.42, 0]],
};

// Earth's radius (0 to 1 of the disc) at time t, read off FRAME_DISC.earth.
export function earthRadius(t) {
  const k = FRAME_DISC.earth;
  if (t <= k[0][0] || t >= k[k.length - 1][0]) return 0;
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const [t0, r0] = k[i - 1], [t1, r1] = k[i]; return r0 + (r1 - r0) * (t - t0) / (t1 - t0); }
  return 0;
}
