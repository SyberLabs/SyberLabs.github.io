# Mateo introduction: media handoff

The media-production owner supplies assets only. The website owner integrates and activates them after verification. Do not edit `src/App.jsx`, `src/home.css`, `src/mateo-video.js`, or workflows from the media lane.

| Asset | Repository path | Requirements |
| --- | --- | --- |
| Main video | `mateo/media/mateo-intro.mp4` | 45–60 seconds; 16:9; preferably 1920×1080, 24/30 fps; H.264 Main/High, `yuv420p`; AAC-LC, 48 kHz, 96–128 kbps; fast-start MP4. Target ≤20 MiB, hard limit 25 MiB. |
| Poster | `mateo/media/mateo-intro-poster.webp` | 16:9; at least 1280×720; target ≤250 KiB. Same verified likeness as the film; essential identity and hiring information remain HTML. |
| English captions | `mateo/media/mateo-intro.en.vtt` | UTF-8 WebVTT; complete spoken words and meaningful sound cues; synchronized cues within the actual duration. |
| Transcript | `mateo/media/mateo-intro-transcript.txt` | Final spoken script verbatim in UTF-8; paragraph breaks welcome. Website owner includes this in static HTML. |

Supply a short private handoff with actual duration, encoding/file-size probe, voice type and provenance, verified photo/likeness approval, credit wording, and source commits for depicted project demos. Do not claim synthetic narration is a recording of Mateo’s own voice. Do not provide private photographs or source voice files in the public repository.

Content requirements come from the owner: exact opening “Hi, my name is Mateo Robles”; natural male narration; verified cartoon likeness; rapid real project demonstrations; truthful sociology-to-software perspective on coordination/leadership/agent orchestration; openness to software engineering, QA, technical support, product and relevant roles; exact motto “Everybody deserves a chance” with a brief shooting star. Salary, private hardship, invented acceptance/savings/experience, and contractual hours promises stay out of public content. Parent/media owner verifies the final script and likeness; the website lane does not invent either.

## Integration

The existing assembly copies `mateo/` unchanged, so public URLs are the same paths prefixed by `/`. No provider, embed, new account, inference credential or framework is needed.

`src/mateo-video.js` stays `null` until the complete delivery is verified. The homepage then uses a native video player above the fold, `controls`, `playsInline`, `preload="none"`, a real poster, and a default English caption track. Playback with sound requires an explicit click. Identity, role, résumé/contact, proof links, transcript and skip route remain usable without playing or waiting for the file. No autoplay with sound, artificial countdown, forced video wall, or old-reading substitution.

Activation object:

```js
export const MATEO_VIDEO = {
  src: '/mateo/media/mateo-intro.mp4',
  poster: '/mateo/media/mateo-intro-poster.webp',
  captions: '/mateo/media/mateo-intro.en.vtt',
  transcriptFile: '/mateo/media/mateo-intro-transcript.txt',
  durationSeconds: 55, // actual probed duration, not an estimate
  credit: 'Animated introduction · synthetic narration', // match actual provenance
  transcript: ['Final approved spoken paragraph…'],
};
```

Until delivery, no empty/disabled video is presented as live. The current concise written pitch and real proof remain the honest interim experience.

## Acceptance after delivery

- Inspect actual pixels, voice and captions against owner-approved sources; confirm exact opening/motto and role/claim accuracy.
- Probe codec, duration, aspect ratio, size and fast-start; verify every delivered file’s bytes.
- Check desktop and phone: explicit play/audio start, pause/resume, keyboard controls, seek, captions, transcript, skip/pause and error fallback. No overflow or blocked hiring path.
- Check script-free native controls/transcript and reduced-motion behavior; the video does not start itself.
- Run existing build/tests/QA and exact-head CI/review. Verify production MP4/poster/VTT/transcript and range/seek behavior after normal protected deployment.
