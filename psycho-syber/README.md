# PSYCHO SYBER

A side-scrolling stealth game published at `/psycho-syber/`. Two forms, changed with Shift: SYBER, a weaver with a
stolen Visitor circlet, and PSYCHO, a jaguar. Each form has its own picture, music and abilities. Six stages: one
for each product, one for Lacuna Institute, and THE REAL BATTLE, which has no exit. The rules for what the game may
say are in the repository's `CLAUDE.md`, under "PSYCHO SYBER". This file and `test/` are not published.

## Files

| File | What it does |
|---|---|
| `index.html`, `psycho-syber.css` | The page: the stage, the panels laid over it, and the copy under it |
| `game/sim.js` | The rules. No DOM. Fixed step of 1/60 s, 16 px tiles |
| `game/levels.js` | The six stages, the command ship, THE ANOMALOUS SYSTEM and the 21 Atlas marks |
| `game/render.js`, `game/font.js` | Draws one 480 x 270 frame per look into a 2D canvas |
| `game/post.js` | Puts the frame on screen with WebGL: the ring that spreads on a change of form, and the jaguar's distortion. Falls back to 2D |
| `game/audio.js` | The music and the effects, synthesised with Web Audio (one stem per form), and the playing of the narrator's recordings |
| `game/main.js` | The loop, the keyboard, mouse and touch controls, the panels, the story shown a phrase at a time and kept in step with the narrator, the ending |
| `game/voice.js`, `voice/` | Written by `test/voice.mjs`: the list of narrated lines with each word's time, and the recordings. The list is empty and the folder absent while there are none |
| `test/run.mjs`, `test/scripts.mjs`, `test/bot.mjs` | A scripted run per stage, played in Node |
| `test/probe.mjs` | Measures how high and far each form jumps |
| `test/browser.mjs` | Opens the built page in headless Chrome: screenshots, a full play-through, the social card |
| `test/voice.mjs` | Makes the narrator's recordings with ElevenLabs. See "The narrator" |

## Checks

    node psycho-syber/test/run.mjs              every stage to its exit, the Atlas list against src/lacuna/atlas/sites.js, and the narrator's recordings against the story
    node psycho-syber/test/run.mjs works --log  one stage, with the player's position after each script entry
    node psycho-syber/test/run.mjs machu:weaver one route of one stage

Headless Chrome with a software GPU sometimes paints a plain bar over the picture, the size of the message at the
top and mirrored to the bottom. It is the screenshot, and Chrome on a desktop does not show it.

CI runs the first line. The browser checks need a built site (`pnpm build:site`), Playwright and Chrome:

    PW_REQUIRE_FROM=<dir>/package.json PW_EXECUTABLE=<chrome> node psycho-syber/test/browser.mjs <outDir> flow
    ... browser.mjs <outDir> stage      one stage: STAGE=3 FORM=psycho AT='52,20,p;84,8,s' SIZE=960x540
    ... browser.mjs og og               rewrites og/psycho-syber.png (then quantise it as scripts/og-cards.mjs does)

`flow` plays each scripted run inside the page, walks into each exit with a held key, and prints what every card shows.
It then plays the last stage to its verdict and photographs the ending. `real` photographs the last stage and each
answer of the machine. `ship` does the three roars at the great carved head and walks the command ship. `pick` shows the title's stage buttons and the
last stage with all 21 marks found. `touch` opens
the page as a phone, sideways then upright, and drives it with fingers sent through the browser's touch input: the
stick, the three buttons, a tap to throw, and a cord that stays tied. `?touch` on the page's address shows the touch
controls on any device. `story` prints where each phrase of a stage's introduction sat on the picture. `narrate` is
described under "The narrator".

## What each form clears

Measured by `test/probe.mjs`. Design inside these numbers.

| | SYBER | PSYCHO |
|---|---|---|
| Ledge up | 2 tiles | 3 tiles |
| Gap | 3 tiles | 5 tiles, 10 with a pounce |
| Other | Cord reaches 9 tiles: stone, beams and rings, never metal | Climbs stone, fits 1-tile tunnels, stands on spirit tiles |

## Map characters

`#` stone · `M` metal (no cord, no climbing) · `=` beam, passed from below · `%` spirit, solid for the jaguar only ·
`&` ward, solid for the weaver only · `^` thorns · `1` `2` `3` a proven, stale or broken step · `D` door (a column) ·
`@` start · `C` standing stone (checkpoint) · `X` exit · `t` thread ·
`o` ring · `?` hint · `L` sign · `v` villager · `w` warden · `s` sentinel · `e` eye · `T` terminal · `S` source ·
`K` the Approver · `G` `O` a lot whose record has a gap, or is complete · `W` a word (a row) ·
`P` a pace setter (E slows or speeds every word) · `J` the great carved head · `A` an Atlas mark (`mark(id)`) ·
`H` one of the three on the command ship · `R` the Patron (`line` is what he says when you come within `far` px) ·
`Z` the Thousand Eyes ·
gates down a column `|` lit, `!` blinking, `i` lit by the alarm, `f` fed by a source · the same along a row `-` `~` `a` `g`.

Settings go with the character: `m.put(x, y, 'S', { id: 'a' })`. `parseLevel` in `sim.js` lists every setting.

## Adding or changing a stage

1. Plot it in `levels.js` with `grid(w, h)`. Stage 1 is the only one drawn as text.
2. Write its run in `test/scripts.mjs`. An entry is `[keys, until, options]`; `bot.mjs` lists the keys. A second way
   through a stage gets its own run under the key `id:route`. A route named `weaver` fails if it ever takes the
   jaguar's form.
3. Run `node psycho-syber/test/run.mjs <id> --log` until it finishes with no deaths.
4. Look at it: `browser.mjs <outDir> stage`, in both forms.

A tall stage (`order: 'up'`) must not use gates or doors that run down a column.

## More than one way through

Each of the first five stages has a run under `id:weaver` that never takes the jaguar's form, and `run.mjs` fails
if it does. The patterns that give the weaver a way: a row of doors above a jaguar tunnel with a terminal that opens
it, a ladder of beams beside a cliff, a pit ladder under a spirit bridge, and a grate so a source can be checked
through a floor. A new obstacle for the jaguar ships with the weaver's way round it.

## The last stage and the ending

THE REAL BATTLE (`def.real`) is one room the size of the screen. `stepReal` in `sim.js` runs it: shots aimed at
where the player will be, a wall of shots with one gap in the last eight seconds, and a verdict at 40 seconds plus
one second for each Atlas mark found (`g.blind`, set by `main.js`). Death there does not respawn: it sets `g.over`
and emits `real`, and `main.js` plays the ending (`meta()`): the picture splits into 1, 4, 16 ... 1,024 feeds, the
run is read back, and a full-page layer (`#ps-wake`) shows the last four lines. `endMeta()` restores the page. What
the machine says and logs inside the picture is `LOGS`, `SAYS` and `PHASE` in `render.js`.

## Touch

`main.js` turns touch on for a device with a coarse pointer and no hover, or at the first finger on the picture. The
stick and the buttons write to `pad` and to `edge`, the same places the keys write to, so `sim.js` knows nothing of
it. While a stage is on, `.is-immersive` fixes the stage over the whole screen, the header included; the title is
back in the page. On a screen taller than it is wide the stage is also `.is-turned`: laid along the long edge and
rotated a quarter turn, so the player turns the phone and the picture is about three times the size. It does not
depend on the phone's own rotation, which is often locked. `point()` and `moveStick()` turn pointer positions to
match, and `resize()` reads layout sizes, which a rotation does not change. Pause has `Play upright`
(`.is-upright`: the picture at the top, the controls under it). A held press on the picture throws the cord and `tied` keeps it after the finger lifts. The
hints are written for keys, and `TOUCH_WORDS` says the same things for touch.

## Music

`audio.js` plays two stems in step and crossfades them when the form changes. The score is slow and modal, by the
owner's direction that it be dark, ancient and psychedelic and never cheerful: `ROOT` is the note held under each bar
(a fifth over it, no third), `TUNE` is eight bars in A minor pentatonic with one flattened second. The jaguar's stem
is a ground that opens and closes like a throat, a heart drum, rattles, a conch horn and the tune on two pipes a few
cents apart. The weaver's is a still ground, a loom, small high lights and the tune struck on stone. `SCENES` gives
each stage its pitch, pace and layers; `main.js` calls `audio.scene(id)` when a stage loads and `audio.urgency()` in
the last stage. Every voice has something between 300 Hz and 2 kHz because a phone's speaker gives little below that. On an iPhone the page sets
`navigator.audioSession.type` to `playback` while the sound is on, so the ringer switch does not silence it, and
sound starts only inside `pointerup`, `touchend`, `click` or `keydown`. The level and the spread across four bands
can be measured in headless Chrome by tapping what reaches the output with an `AnalyserNode`.

## The narrator

Thirty-one lines of the story can be spoken: the introduction to each stage, the two lines when the ship comes
(`TOLD.abduct` in `levels.js`) and the four lines of the ending (`TOLD.end`). What the three on the ship say is not
narrated. `test/voice.mjs` makes one recording for each line with ElevenLabs text to speech, using the request that
answers with the audio and the time of every character:

    node psycho-syber/test/voice.mjs --list     every line and the character count (940); calls nothing
    ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node psycho-syber/test/voice.mjs
    ... voice.mjs --all | --only steps | --mock | --clear

The key is read from the environment and written nowhere. Keep it out of files, commits and workflow logs.
Publishing what the service makes needs one of its paid plans and a voice whose terms allow it. The script writes
`voice/<line>.mp3`, fills `game/voice.js` (for each line its file, a mark of the words it speaks, and when each word
starts and ends), writes the "Narrator" paragraph into `index.html` between its two comment markers, and gives the
game one new `?v=` token. `--clear` undoes all of it. A line whose words change in `levels.js` is recorded again by
the next plain run. `run.mjs` fails when a recording speaks words its line no longer has, when a stage is narrated
in part, when `voice/` holds a file no line uses, or when recordings and the page's paragraph are not there together.

In the page (`rsvp()` in `main.js`) a line that has a recording is spoken when the sound is on, and then the voice is
the clock: each word is shown when the sound clock reaches the start of that word. `audio.js` brings every recording
to one loudness (`SPOKEN`), lowers the music by 9 dB from the first line of a telling until 1.6 seconds after its
last, and fades a line that is cut off. When the sound clock stops in a hidden tab the words wait for it. When it
stays stopped with the page in view, or a recording has not arrived within 1.4 seconds, the telling goes on at the
reader's pace, and a telling that opened without the voice stays without it. With the sound off no recording is
fetched. While `VOICE` is empty the game asks for no file.

    ... browser.mjs <outDir> narrate     STAGE=1 adds the checks of a cut line, a stopped clock, a hidden tab, sound off and missing recordings; STAGE=6 adds the ending

As of November 17, 2026 the list is empty and no request has been made to ElevenLabs. The page was run with the
stand-ins that `--mock` makes (a murmur between 300 Hz and 3.4 kHz with made-up word times) and the script with a
local stand-in for the service that answers in its documented shape. With those, every word was shown within 80 ms
of the voice reaching it, and the voice stood 17 to 22 dB over the music between 300 Hz and 3.4 kHz and about 13 dB
over it in all. A voice has less of its sound in that band than the stand-in, so expect a few dB less. No one has
heard a recording in the page.

Choose or design the narrator by the sound of his voice: old, low, slow. A regional accent of a living language may
be named plainly (Peruvian Spanish, say) and should sound natural. Do not ask the service for the voice of a people
("Native American", "Incan", an "indigenous elder"): there is no record of how anyone at Paracas spoke, and a
machine's version of such a voice is a stereotype. The page says the voice is synthetic and makes no claim about any
people.

## The command ship

Three roars at the great carved head (`J`, stage 1) within its 22 seconds emit `abduct`. `main.js` loads `SHIP`
from `levels.js` in place of the stage and, at its exit, starts that stage again with a fifth life
(`psycho-syber.ship` in `localStorage`). The page does not say how to get there.

## THE ANOMALOUS SYSTEM

`ANOMALY` in `levels.js` is a scene outside the six stages, started from its own button on the title (`beginAnomaly`
in `main.js`). It is the inside of the Thousand Eyes, drawn as an operating system, 192 x 24 tiles: BOOT, DESKTOP,
REGISTRY, DEFRAG, FIREWALL, CORE and LOG OFF. Every rule below is behind `def.anomaly`, so the six stages play as
they did before (the suite printed the same lines for them before and after).

| Rule | In `sim.js` | First value |
|---|---|---|
| Every change of form leaves a copy. No wait of 8 seconds | `trySwap`, `g.copies` | up to `COPY_MAX` 5, each for `COPY_LIFE` 12 s |
| A copy corrupts the metal within a tile of it | `plant` | `PLANT_REACH` 16 px |
| Metal tiles that touch are a body, and corruption spreads through a body | `parseLevel` (`L.body`), `stepAnomaly` | one tile each `ROT_STEP` 0.2 s. The roar does not slow it |
| Corrupt metal takes the cord and the claws | `climbable`, the cord's hit test | |
| A gate or an eye set in a body is dark while the whole body is corrupt | `bodyDark` | |
| The first plant wakes the system: its cursor and its scan | `plant` (`wake`) | |
| The cursor deletes the nearest copy, then comes for the player. It does not see a hidden player. The roar and glass stop it | `stepCursor` | `CURSOR_SPEED` 80 px/s, `CURSOR_CLICK` 0.5 s |
| The scan crosses the stage, cleans what it passes and sends the player it reaches back to the standing stone | `stepAnomaly`, `respawn` | `scan: 240` s in the def, twice as fast under alarm |
| The first plant in a body sets the scan back | `plant` | `SCAN_BACK` 15 s of travel |

Each of the first five sectors ends in an alert: a metal dialog with a gate that is always lit (`|`) standing on it.
That gate goes dark only when the whole dialog is corrupt, so every sector needs a copy. The exit opens when the core
breaks, as the door `core` does in THE WORKS. The card shows `corrupted(g)`: corrupt metal tiles over all metal tiles
at the exit. The best share is `psycho-syber.anomaly` in `localStorage`.

The picture is `bg: 'system'` in `render.js`: `sysTile` draws stone as a desktop's ground, metal as window frames
and beams as title bars. `drawRot` draws corrupt metal (the weaver sees it break up in the signal colour, the jaguar
sees cloth woven over it) and `drawSystem` draws the scan line and the cursor. While the scene is on, `paintRot` in
`main.js` splits the HUD's letters and turns letters in the scene's name and in the tab's title into figures as the
share rises. Reduced motion keeps the name and the title still.

Checks: the run `anomaly` in `test/scripts.mjs` plays the scene to its exit, and six rules at the end of
`test/run.mjs` cover the copies, the corruption, the gates, the scan, the cursor and the cord. There is no `weaver`
run: a copy is left by changing form.

Not built yet: a second run that takes every body, sentinels in FIREWALL and CORE, the arm in DEFRAG as a scripted
swing, a touch check on a phone, and a narrator's reading of the intro. The numbers in the table are first values
and have not been tuned by people playing.

Where the structure came from: the sectors follow the parts of AnomalyOS (github.com/the-bugeater/AnomalyOS), a
browser desktop made as an art piece by another author. The scene uses none of its text, art or code, and that
repository carried no license file on November 18, 2026. The page does not name it.
