// What the RISE Sophia frame holds in the hero clip. Earth is part of the clip itself; the paintings are laid over
// Earth's disc in step with it (src/BackgroundVideo.jsx). Each pass of the clip shows one, chosen at random without
// repeating the last. Both paintings are open access (CC0) at the Cleveland Museum of Art.
export const FRAME_ART = [
  { id: 'earth', title: 'Earth', by: 'NASA/GSFC', href: 'https://images.nasa.gov/details/GSFC_20171208_Archive_e002131' },
  { id: 'point-judith', title: 'Point Judith, Rhode Island', by: 'Martin Johnson Heade', date: '1867–68',
    src: '/mateo/frame/point-judith-heade-1970.161.jpg', position: '46% 50%',
    href: 'https://www.clevelandart.org/art/1970.161' },
  { id: 'pink-cloud', title: 'The Pink Cloud', by: 'Henri-Edmond Cross', date: 'c. 1896',
    src: '/mateo/frame/pink-cloud-cross-2020.106.jpg', position: '50% 44%',
    href: 'https://www.clevelandart.org/art/2020.106' },
];

// Where Earth's disc sits in each clip, as fractions of the clip (both clips are 1280 by 720, one turned on its side)
// and when it fills and leaves the frame, in seconds of the clip. Measured from the rendered frames.
export const FRAME_DISC = {
  landscape: { w: 1280, h: 720, x: 678.8, y: 360.4, r: 334 },
  portrait: { w: 720, h: 1280, x: 381.5, y: 640.8, r: 334 },
  in: 5.12, held: 5.9, out: 14.1, gone: 14.85,
};
