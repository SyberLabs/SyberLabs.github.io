# PSYCHO SYBER

A side-scrolling stealth game published at `/psycho-syber/`. Two forms, changed with Shift: SYBER, a weaver with a
stolen Visitor circlet, and PSYCHO, a jaguar. Each form has its own picture, music and abilities. Five stages, one
for each product and one for Lacuna Institute. The rules for what the game may say are in the repository's
`CLAUDE.md`, under "PSYCHO SYBER". This file and `test/` are not published.

## Files

| File | What it does |
|---|---|
| `index.html`, `psycho-syber.css` | The page: the stage, the panels laid over it, and the copy under it |
| `game/sim.js` | The rules. No DOM. Fixed step of 1/60 s, 16 px tiles |
| `game/levels.js` | The five stages and the 21 Atlas marks |
| `game/render.js`, `game/font.js` | Draws one 480 x 270 frame per look into a 2D canvas |
| `game/post.js` | Puts the frame on screen with WebGL: the ring that spreads on a change of form, and the jaguar's distortion. Falls back to 2D |
| `game/audio.js` | All sound, synthesised with Web Audio: one stem per form |
| `game/main.js` | The loop, the keyboard and mouse, the panels, the words shown one at a time |
| `test/run.mjs`, `test/scripts.mjs`, `test/bot.mjs` | A scripted run per stage, played in Node |
| `test/probe.mjs` | Measures how high and far each form jumps |
| `test/browser.mjs` | Opens the built page in headless Chrome: screenshots, a full play-through, the social card |

## Checks

    node psycho-syber/test/run.mjs              every stage to its exit, and the Atlas list against src/lacuna/atlas/sites.js
    node psycho-syber/test/run.mjs works --log  one stage, with the player's position after each script entry

CI runs the first line. The browser checks need a built site (`pnpm build:site`), Playwright and Chrome:

    PW_REQUIRE_FROM=<dir>/package.json PW_EXECUTABLE=<chrome> node psycho-syber/test/browser.mjs <outDir> flow
    ... browser.mjs <outDir> stage      one stage: STAGE=3 FORM=psycho AT='52,20,p;84,8,s' SIZE=960x540
    ... browser.mjs og og               rewrites og/psycho-syber.png (then quantise it as scripts/og-cards.mjs does)

`flow` plays each scripted run inside the page, walks into each exit with a held key, and prints what every card shows.

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
`@` start · `C` standing stone (checkpoint) · `X` exit · `t` thread, or an Atlas mark when the stage has `atlas` ·
`o` ring · `?` hint · `L` sign · `v` villager · `w` warden · `s` sentinel · `e` eye · `T` terminal · `S` source ·
`K` the Approver · `G` `O` a lot whose record has a gap, or is complete · `W` a word (a row) ·
gates down a column `|` lit, `!` blinking, `i` lit by the alarm, `f` fed by a source · the same along a row `-` `~` `a` `g`.

Settings go with the character: `m.put(x, y, 'S', { id: 'a' })`. `parseLevel` in `sim.js` lists every setting.

## Adding or changing a stage

1. Plot it in `levels.js` with `grid(w, h)`. Stage 1 is the only one drawn as text.
2. Write its run in `test/scripts.mjs`. An entry is `[keys, until, options]`; `bot.mjs` lists the keys.
3. Run `node psycho-syber/test/run.mjs <id> --log` until it finishes with no deaths.
4. Look at it: `browser.mjs <outDir> stage`, in both forms.

A tall stage (`order: 'up'`) must not use gates or doors that run down a column.
