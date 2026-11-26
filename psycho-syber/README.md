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

    node psycho-syber/test/run.mjs              every stage to its exit, the Atlas list against src/lacuna/atlas/sites.js, the narrator's recordings against the story, and the rules a clean run never trips
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
A ring takes `dx` and `dy`, pixels off the centre of its tile.

## Adding or changing a stage

1. Plot it in `levels.js` with `grid(w, h)`. Stage 1 is the only one drawn as text.
2. Write its run in `test/scripts.mjs`. An entry is `[keys, until, options]`; `bot.mjs` lists the keys. A second way
   through a stage gets its own run under the key `id:route`. A route named `weaver` fails if it ever takes the
   jaguar's form.
3. Run `node psycho-syber/test/run.mjs <id> --log` until it finishes with no deaths.
4. Look at it: `browser.mjs <outDir> stage`, in both forms.

A tall stage (`order: 'up'`) must not use gates or doors that run down a column.

## What play has shown

On November 18, 2026 the game was played by a tester that had not seen it, in the page and with 5.6 million steps of
random and clumsy input against `sim.js`. What it found is now checked by `run.mjs` (the `rule:` lines under
"found by play"), and a new stage should keep to the same things:

- A ring over a wall hangs just past the wall's near edge (`{ dx: -6 }` on the wall's first column), so it is in
  sight from the foot of the wall. One tile further in, the wall's corner hides it from anyone who walks up to the
  wall, and the cord takes the wall's face.
- A way that ends at a wall gets a hint at the wall that says so and says where the way on is. Stage 1 has one under
  its last stair and stage 2 has one in the ravine.
- A fall that costs a whole climb gets somewhere to land halfway: the two beams under the fourth and fifth words of
  stage 2's first climb. They are lower than the word above them, so they are no part of the way up.
- A standing stone comes before the first place a stage kills: stage 3 has one before its first gate.
- The jaguar takes hold of stone from the ground when up is held, with no jump. On touch the stick's up is not a jump
  (`main.js`), and a hint that says "push into stone and hold up" has to be true there too.
- `R` is an input to `sim.js` (`resetP`), which ends the attempt the ordinary way. The page must not move or
  hurt the player itself: the cord pulled such a player back, alive and at no health.

## What a second tester said was fun

Later on November 18, 2026 a second tester played the opening of stage 1 in both forms and the opening of THE
ANOMALOUS SYSTEM, and was asked what would make the game more fun. Its answer was that the best moment was choosing
where to change form, because the form left behind did something, and that the six stages never showed it. Four
things came of that. `run.mjs` checks the first, the second and the fourth; the third is in `render.js` and
`post.js`, which it does not load, and was looked at in the page. A new stage should keep to all four:

- **The double is seen to work, in the first minute.** A change of form leaves the old form standing for
  `DOUBLE_LIFE` 5 s (it was 3), at most once every `DOUBLE_WAIT` 8 s. A warden within `LURE` 240 px with a
  clear line to it turns to it, whichever way it was walking (it used to need to be facing it already), holds still
  and neither sees the player nor fires until the double fades. `render.js` draws what the rule does: a line of
  dashes from the warden to the double (`gaze`), an eye over the double, a question mark over the warden and a bar
  for what is left of the double. The HUD counts it down. Stage 1's second segment is the place to learn it: a
  warden on a beam four tiles up, a thread behind it, and a standing stone that is out of its sight (128 px) and
  inside `LURE`. Shift at the stone, and the other form walks under the warden while it watches the one left
  behind. The hint there shows over three tiles each side of its mark (`r` on a hint), which is where what it says
  is safe and always works. The line is drawn from a warden dressed as a villager too, so a double is one more
  way to tell which villager is a Visitor. Inside the system a warden watches the nearest copy it can see. The weaver's way is glass from the stone, or under it while its back is turned. Two changes in a row
  leave a double and keep the form: the main run of stage 1 does that at the second warden.
- **A hint is about the body the player is in.** A hint in `levels.js` is a line, or `by(weaver, jaguar)`, or a
  function of the game that gives either; `hintText` in `sim.js` reads it. At the first wall the weaver is told
  the ring and the jaguar the climb. The tester, as the jaguar, had been told to hold the mouse button for a cord
  the jaguar does not have. The ring beats while the weaver is in reach of it with the cord free, and marks rise up
  a stone face the jaguar can climb when it stands within two tiles of one too high to jump (`claws`). The main
  run of stage 1 is the jaguar's way from the first warden to the stair and `steps:weaver` is the weaver's, so
  each form's line at each obstacle is played. `TOUCH_WORDS` is in `levels.js` beside the hints.
- **The jaguar's look moves, and the ground under the jaguar does not.** The player's jaguar is drawn over a dark
  shape one pixel wider (`INK`), every top within a leap of it is drawn again as a line of white over a line of
  black (`footing`), and `post.js` lets the ripple, the fold and the split of colours fall to nothing around the
  player (`sway`). Black and white have no hue, so the drift of colour cannot tint them. Keep such marks without
  hue.
- **A scene teaches its rule before it tests speed.** THE ANOMALOUS SYSTEM opens with one panel of metal across the
  way (see below). Nothing hunts the player until the rule has been used once.
- `cord()` moves the weaver in pieces of 6 px. `moveX` and `moveY` test only where a move ends, so nothing may
  call them with more than a tile at once.
- Down and jump lets go of a beam or a word. On stone it is a jump.
- In the last stage the place the machine orders you to is as far as your form can run in the 0.7 seconds it gives.
  `g.judged` says whether the run reached the verdict, and the ending says the verdict was late only when it did.
- `g.shifts` counts every change of form and is what the ending reads back. `g.swaps` counts the changes into the
  jaguar and is what holds a `weaver` run to none.

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
hints are written for keys, and `TOUCH_WORDS` in `levels.js` says the same things for touch. `run.mjs` fails if a hint still names a key afterwards.

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
| The system wakes (its cursor and its scan) once a copy has turned metal and the player is past the first panel | `wake` | `wake: 12` in the def, a tile column. A def with none wakes at its first plant |
| The cursor deletes the nearest copy, then comes for the player. It does not see a hidden player. The roar and glass stop it | `stepCursor` | `CURSOR_SPEED` 80 px/s, `CURSOR_CLICK` 0.5 s |
| The scan crosses the stage, cleans what it passes and sends the player it reaches back to the standing stone | `stepAnomaly`, `respawn` | `scan: 240` s in the def, twice as fast under alarm |
| The first plant in a body sets the scan back | `plant` | `SCAN_BACK` 15 s of travel |

BOOT opens with a panel: five tiles of metal across the way, too high to jump, with the place to stand, the
panel and its top in one view. (A jaguar that jumps and then pounces straight up clears it without a copy. The
system stays asleep for it until its first copy at the boot block, which was the rule before.) A copy left against it corrupts it in under a second, and then it takes the claws and
the cord. A copy that touches no metal, before any has, gets a message that says so (`idle`). The first hint there
changes with what has happened: how to corrupt the panel, then how the form the player is in climbs it. The boot
block and its gate come after, with the system awake. BOOT used to be a stair of words and a pace setter, which are
stage 2's rule, with one line of text for this scene's own rule.

Each of the first five sectors ends in an alert: a metal dialog with a gate that is always lit (`|`) standing on it.
That gate goes dark only when the whole dialog is corrupt, so every sector needs a copy. The exit opens when the core
breaks, as the door `core` does in THE WORKS. The card shows `corrupted(g)`: corrupt metal tiles over all metal tiles
at the exit. The best share is `psycho-syber.anomaly` in `localStorage`.

The picture is `bg: 'system'` in `render.js`: `sysTile` draws stone as a desktop's ground, metal as window frames
and beams as title bars. `drawRot` draws corrupt metal (the weaver sees it break up in the signal colour, the jaguar
sees cloth woven over it) and `drawSystem` draws the scan line and the cursor. While the scene is on, `paintRot` in
`main.js` splits the HUD's letters and turns letters in the scene's name and in the tab's title into figures as the
share rises. Reduced motion keeps the name and the title still.

Checks: the run `anomaly` in `test/scripts.mjs` plays the scene to its exit, and seven rules in
`test/run.mjs` cover the copies, the corruption, the gates, the scan, the cursor, the cord and the first panel. There is no `weaver`
run: a copy is left by changing form.

Not built yet: a second run that takes every body, sentinels in FIREWALL and CORE, the arm in DEFRAG as a scripted
swing, a touch check on a phone, and a narrator's reading of the intro. The numbers in the table are first values
and have not been tuned by people playing.

Where the structure came from: the sectors follow the parts of AnomalyOS (github.com/the-bugeater/AnomalyOS), a
browser desktop made as an art piece by another author. The scene uses none of its text, art or code, and that
repository carried no license file on November 18, 2026. The page does not name it.

## ARENA

PSYCHO SYBER: ARENA is a second game, published at `/psycho-syber/arena/` since November 19, 2026: a first-person
arena in 3D with two modes, Waves and the Duel. Its rules for the site are in `CLAUDE.md` under "PSYCHO SYBER: ARENA".
It shares nothing with the game above but the two forms' names and this folder.

| File | What it does |
|---|---|
| `arena/index.html`, `arena/arena.css` | The page: the stage, the HUD, the touch controls, the panels, and the copy under it. Its header and footer come from `scripts/site-chrome.mjs` |
| `arena/game.js` | The whole game, one classic script: the block world, the two forms, enemies, waves, operators, sound, the duel's client and the loop |
| `arena/vendor/three.min.js`, `three.LICENSE.txt` | three.js r160, `build/three.min.js` from the npm package `three@0.160.0`, unchanged. It prints one deprecation notice to the console when it loads |
| `../workers/duel/` | The duel's relay: a Cloudflare Worker and a Durable Object. Its own `README.md` has the messages, the limits and how to deploy |
| `test/arena.mjs` | Runs in CI, in Node: the page's ids, the page's rules, that the game and the relay agree, the library's hash |
| `test/arena-browser.mjs` | Run by hand: a wave at a desktop and a phone width, and a duel through the relay under `wrangler dev` |

`game.js` was built outside this repository and ported. The port took out a story mode and its codex, renamed the
forms, put every element id under `ar-` and scoped the styles to `#ar-stage`.

### The duel, twice

The first duel (November 19) was a direct WebRTC link between the two browsers, with no server: an invite link
carried one browser's session description and a reply link carried the other's. It kept the site's promise that a
page talks to nobody but syberlabs.io and one STUN server, and it did not work on the owner's network: with no
relay, two networks that refuse direct links cannot connect, and many do.

The second (November 20) sends everything through `workers/duel/`. It works wherever the site loads, the players
never learn each other's address, a code is six characters, and the relay keeps health and the score. What it
costs: every message crosses Cloudflare twice, and the site now runs a program that takes connections.

In `game.js` the duel is the block under "duel: Psycho against Syber, through the site's relay". `D.seat` is 0 for
the player who started the duel. `beginRound`, `endRound` and the handler for `H` only do what the relay says; the
browser decides nothing about health, rounds or the score. Each side draws the other 100 ms in the past, between
the two positions on either side of that moment.

### Running the browser checks

    pnpm build:site
    npm ci --prefix deploy
    PW_REQUIRE_FROM=/opt/npm-tools/package.json PW_EXECUTABLE=/usr/bin/google-chrome node psycho-syber/test/arena-browser.mjs shots all

The script starts the relay itself with `wrangler dev`, allowing its own page's origin, and points the pages at it
through `window.__arenaRelay`, which the game reads only on `localhost` and `127.0.0.1`. `ARENA_RELAY=ws://…` uses a
relay that is already running. The game caps a frame at 34 ms and headless Chrome draws a few frames a second, so
the script also advances both games by calling `update()`; the relay's countdown and its twelve seconds of grace
run in real time.

### Not yet done

- Two people have not played a duel through the relay on Cloudflare, on a phone, or in Firefox or Safari.
- The page has no social card of its own; it uses the game's.
- The header, the Menu, the homepage and `llms.txt` do not list the page.
- The picture's colours (rose for Psycho, teal for Syber) are the earlier build's, not the first game's.
- A player who comes back after a dropped connection has missed the blocks broken while they were away; the two
  arenas agree again at the next round.
