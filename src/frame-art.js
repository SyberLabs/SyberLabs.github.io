// What the RISE Sophia frame holds in the hero clip. Earth is part of the clip itself; the others are laid over Earth's
// disc in step with it (src/BackgroundVideo.jsx). Each pass of the clip shows one, chosen at random without repeating
// the last. The rule for this frame: it always holds something warm against the blue page.
// The Pink Cloud is open access (CC0) at the Cleveland Museum of Art; the other two are Mateo's own pieces, made with
// Midjourney, and credited that way.
export const FRAME_ART = [
  { id: 'earth', title: 'Earth', by: 'NASA/GSFC', href: 'https://images.nasa.gov/details/GSFC_20171208_Archive_e002131' },
  { id: 'pink-cloud', title: 'The Pink Cloud', by: 'Henri-Edmond Cross', date: 'c. 1896',
    src: '/mateo/frame/pink-cloud-cross-2020.106.jpg', href: 'https://www.clevelandart.org/art/2020.106' },
  { id: 'dune-car', title: 'Dune Run', by: 'Mateo Robles', made: 'made with Midjourney',
    src: '/mateo/frame/dune-car-mateo-robles.jpg' },
  { id: 'chromatic-burst', title: 'Chromatic Burst', by: 'Mateo Robles', made: 'made with Midjourney',
    src: '/mateo/frame/chromatic-burst-mateo-robles.jpg' },
];

// Where Earth's disc sits in each clip, as fractions of the clip (both clips are 1280 by 720, one turned on its side)
// and when it fills and leaves the frame, in seconds of the clip. Measured from the rendered frames.
export const FRAME_DISC = {
  landscape: { w: 1280, h: 720, x: 678.8, y: 360.4, r: 334 },
  portrait: { w: 720, h: 1280, x: 381.5, y: 640.8, r: 334 },
  in: 5.12, held: 5.9, out: 14.1, gone: 14.85,
};
