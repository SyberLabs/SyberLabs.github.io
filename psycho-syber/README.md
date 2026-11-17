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
| `game/levels.js` | The six stages, the command ship and the 21 Atlas marks |
| `game/render.js`, `game/font.js` | Draws one 480 x 270 frame per look into a 2D canvas |
| `game/post.js` | Puts the frame on screen with WebGL: the ring that spreads on a change of form, and the jaguar's distortion. Falls back to 2D |
| `game/audio.js` | All sound, synthesised with Web Audio: one stem per form |
| `game/main.js` | The loop, the keyboard, mouse and touch controls, the panels, the words shown one at a time, the ending |
| `test/run.mjs`, `test/scripts.mjs`, `test/bot.mjs` | A scripted run per stage, played in Node |
| `test/probe.mjs` | Measures how high and far each form jumps |
| `test/browser.mjs` | Opens the built page in headless Chrome: screenshots, a full play-through, the social card |

## Checks

    node psycho-syber/test/run.mjs              every stage to its exit, and the Atlas list against src/lacuna/atlas/sites.js
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
answer of the machine. `ship` does the three roars at the great carved head and walks the command ship. `touch` opens
the page as a phone, sideways then upright, and drives it with fingers sent through the browser's touch input: the
stick, the three buttons, a tap to throw, and a cord that stays tied. `?touch` on the page's address shows the touch
controls on any device.

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
back in the page. A held press on the picture throws the cord and `tied` keeps it after the finger lifts. The
hints are written for keys, and `TOUCH_WORDS` says the same things for touch.

## The command ship

Three roars at the great carved head (`J`, stage 1) within its 22 seconds emit `abduct`. `main.js` loads `SHIP`
from `levels.js` in place of the stage and, at its exit, starts that stage again with a fifth life
(`psycho-syber.ship` in `localStorage`). The page does not say how to get there.
