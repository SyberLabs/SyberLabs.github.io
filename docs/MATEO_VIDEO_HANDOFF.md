# Mateo introduction: media handoff

The media-production owner supplies assets only. The website owner integrates and activates them after verification. Do not edit `src/App.jsx`, `src/home.css`, `src/mateo-video.js`, or workflows from the media lane.

| Asset | Repository path | Requirements |
| --- | --- | --- |
| Main video | `mateo/media/mateo-intro.mp4` | Owner-approved duration, verified from the delivered file; 16:9; preferably 1920×1080, 24/30 fps; H.264 Main/High, `yuv420p`; AAC-LC, 48 kHz, 96–128 kbps; fast-start MP4. Target ≤20 MiB, hard limit 25 MiB. |
| Poster | `mateo/media/mateo-intro-poster.png` | 16:9; at least 1280×720; target ≤250 KiB. Same verified likeness as the film; essential identity and hiring information remain HTML. |
| English captions | `mateo/media/mateo-intro.en.vtt` | UTF-8 WebVTT; complete spoken words and meaningful sound cues; synchronized cues within the actual duration. |
| Transcript | `mateo/media/mateo-intro-transcript.txt` | Final spoken script verbatim in UTF-8; paragraph breaks welcome. Website owner includes this in static HTML. |

Supply a short private handoff with actual duration, encoding/file-size probe, voice type and provenance, verified photo/likeness approval, credit wording, and source commits for depicted project demos. Do not claim synthetic narration is a recording of Mateo’s own voice. Do not provide private photographs or source voice files in the public repository.

Content requirements come from the owner: exact opening “Hi, my name is Mateo Robles”; natural male narration; verified cartoon likeness; rapid real project demonstrations; truthful sociology-to-software perspective on coordination/leadership/agent orchestration; openness to software engineering, technical support, product and relevant roles; exact closing “Let's build something useful together.” once, with a subtle star accent. QA/quality assurance is excluded from role targeting; actual engineering quality checks remain. Salary, private hardship, invented acceptance/savings/experience, and contractual hours promises stay out of public content. Parent/media owner verifies the final script and likeness; the website lane does not invent either.

## Integration

The existing assembly copies `mateo/` unchanged, so public URLs are the same paths prefixed by `/`. No provider, embed, new account, inference credential or framework is needed.

The homepage uses a native video player above the fold, `controls`, `playsInline`, `preload="none"`, a real poster, and a default English caption track. Playback with sound requires an explicit click. Identity, role, résumé/contact, proof links, transcript and skip route remain usable without playing or waiting for the file. No autoplay with sound, artificial countdown, forced video wall, or old-reading substitution.

Activation object:

```js
export const MATEO_VIDEO = {
  src: '/mateo/media/mateo-intro-v9.mp4',
  poster: '/mateo/media/mateo-intro-v9-poster.png',
  captions: '/mateo/media/mateo-intro-v7.en.vtt',
  transcriptFile: '/mateo/media/mateo-intro-v7-transcript.txt',
  durationSeconds: 120.6, // actual probed duration, not an estimate
  credit: 'Animated introduction · synthetic narration', // match actual provenance
  transcript: ['Final approved spoken paragraph…'],
};
```

Verified V7 delivery: 120.600 seconds, 1280×720 at 30 fps, H.264 High/yuv420p with AAC-LC 48 kHz mono, 5,206,425 bytes. The MP4 places `moov` before `mdat`; full audiovisual decode passes. English captions match the approved 303-word narration, with one closing line. The illustration derives from Mateo’s published GitHub cartoon avatar. Narration is synthetic male speech, not a recording of Mateo’s voice. Real Gyre and active RISE browser footage accompany clearly labeled controlled GitHits test examples. The media owner verified complete browser playback without error. Subjective listening is not claimed.

## Acceptance after delivery

- Inspect actual pixels, voice and captions against owner-approved sources; confirm exact opening/motto and role/claim accuracy.
- Probe codec, duration, aspect ratio, size and fast-start; verify every delivered file’s bytes.
- Check desktop and phone: explicit play/audio start, pause/resume, keyboard controls, seek, captions, transcript, skip/pause and error fallback. No overflow or blocked hiring path.
- Check script-free native controls/transcript and reduced-motion behavior; the video does not start itself.
- Run existing build/tests/QA and exact-head CI/review. Verify production MP4/poster/VTT/transcript and range/seek behavior after normal protected deployment.

V8 changes visuals only. The approved V7 audio, captions and transcript are unchanged. The V7 media URLs remain available for rollback.

V9 aligns the film with the cinematic website kit. The approved audio and caption/transcript bytes remain unchanged.

V12 replaces the film and its narration, at Mateo's request. Script: "I build AI tools that people can trust", covering GitHits, SyberWork, Attest, FLYSPACE, first principles, sociology to software, Gyre and RISE, closing once with "Let's build something useful together." Roles named: new grad software engineering, AI engineering and creative technologist. Narration is a synthetic ElevenLabs voice generated by Mateo, not a recording of his own voice.

Verified V12 web delivery (`mateo-intro-v12.mp4`): 110.133 seconds, 1920×1080 at 30 fps, H.264 High/yuv420p (two-pass, about 1.3 Mbps) with AAC-LC 48 kHz stereo 128 kbps, 19,834,138 bytes (18.9 MiB), `moov` before `mdat`, full decode passes, -16 LUFS integrated. SSIM against the 1080p master is 0.9965. Poster `mateo-intro-v12-poster.jpg` is 1920×1080, 113 KiB. Captions `mateo-intro-v12.en.vtt` hold 58 cues from forced alignment of all 306 spoken words. `mateo-intro-v12-transcript.txt` is the spoken script verbatim. Headless Chromium at 1440×900 and 390×844 confirmed the hero play button starts the film, captions load and track the voice after seeking, and the `/mateo` film uses the same files. Subjective listening was done by Mateo, not the media lane. Source, renderer and verification: SyberLabs/presence `media/mateo` (V12). The V7 to V10 media URLs remain available for rollback.

## V13: bounded claim correction

V13 removes V12's Attest narration and scene at 49.000 to 60.780 seconds. The universal wording exceeded what the evidence establishes. Attest implements real command and browser checks, with skipped and unverifiable results; see the [source and limits at 274b8e74](https://github.com/SyberLabs/attest/blob/274b8e74d4f96085a531930c6516d5159fe9b055/README.md#known-limitations). This edit removes the absolutes without suggesting the product has no real execution capability.

All other spoken words remain. The 53 caption cues and 270-word transcript remove exactly that paragraph and shift subsequent cues by 11.780 seconds. The original transition retained the Attest headline briefly after the cut, so the first clean FLYSPACE frame is held for 0.52 seconds while FLYSPACE's retained speech begins. Two 3 ms audio fades smooth the splice. No new narration or artwork is generated. The poster and contact content remain unchanged; the V12 files stay available for rollback.

The shared activation uses the versioned V13 MP4, poster, captions and transcript. The web encode keeps the corrected source's audio stream and frame timestamps. The play label derives its runtime from the manifest rather than a fixed two-minute label. The studio inbox and canonical résumé are unchanged.

Verified V13 web delivery: 98.353333 seconds, 19,007,927 bytes, H.264 High/yuv420p at 1920×1080, with the corrected source's AAC-LC stereo 48 kHz audio copied unchanged. All 2,950 frame timestamps match the corrected source. Whole-file decode, fast-start placement and caption/transcript checks pass. SSIM against the corrected source is 0.996904. These are technical checks; subjective listening is not claimed.
