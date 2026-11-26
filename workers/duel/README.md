# The duel relay

`syberlabs-duel` is a Cloudflare Worker on the route `syberlabs.io/duel/*`, with one Durable Object per duel. It is
the server side of the Duel in PSYCHO SYBER: ARENA (`psycho-syber/arena/`). The rules for it are in `CLAUDE.md`,
"PSYCHO SYBER: ARENA".

| File | What it does |
|---|---|
| `index.js` | The Worker: checks the path, the method and the origin, counts the request against the caller's address, and hands the WebSocket to the room named by the code. Also the Durable Object class, which gives a room its clock, timers and connections |
| `room.js` | The rules of one room. No Cloudflare API: Node runs the same file |
| `room.test.mjs` | `node --test workers/duel/room.test.mjs`, in CI |
| `wrangler.toml` | The Worker's name, route, allowed origin, Durable Object and rate limits |

## What it keeps

In memory, while at least one player is connected: the two seats, a token for each, the round, each player's
health, the score and a few timers. Nothing else. It has no storage, database or log, and it reads no cookie. The
Durable Object class is declared SQLite-backed because the free plan requires that; the code never touches storage.

Cloudflare's rate limiter holds one counter per network address and minute for new duels (6) and for joins (30),
at each Cloudflare location. The Worker passes it the address and does not otherwise use it.

## Addresses

    GET /duel/new             WebSocket   open a room and take its first seat
    GET /duel/join/CODE       WebSocket   take the second seat
    GET /duel/join/CODE?t=…   WebSocket   take a seat back with the token from its welcome

Anything else is 404. A request that is not a WebSocket is 426. A request whose `Origin` is not in `ORIGINS` is 403.
Every other refusal is a message, `["e", why]`, on a socket that is then closed, because a browser cannot read the
status of a refused WebSocket.

## Messages

Every message is a JSON array. The first item names it.

| From the game | Carries | What the room does |
|---|---|---|
| `s` | 18 numbers: a counter, position, velocity, aim, what the body is doing, the grapple's anchor, the last arc shot | Passes it to the other seat during a round, if every item is a finite number, with the counter replaced by the room's own |
| `h` | Damage, and a push in x, y, z | In a live round only: caps the damage, takes it from the other seat's health, tells both with `H`, and ends the round at zero |
| `k` | Indexes of broken blocks, 300 at most | Passes it on during a round, up to 300 blocks a second |
| `b`, `r` | A blast to draw; a rocket to draw | Passes it on, up to 15 a second |
| `x` | Rematch | Starts a new duel when the last is over and both players are there |
| `q` | I am leaving | Tells the other seat and empties the room |
| `p` | Nothing | Counts as a sign of life |

| From the room | Carries |
|---|---|
| `w` | Welcome: version, seat (0 started the duel), the code, the seat's token, and 1 if this is a return |
| `n` | The second player has joined |
| `R` | A round starts: its number, seat 0's form, the score, the length of the countdown |
| `G` | The round is live |
| `H` | Health: whose, what it is now, the damage and the push |
| `E` | A round ended: who won, the score, whether the duel is over |
| `S` | After a return: round, seat 0's form, the score, the phase, both players' health |
| `a` | The other player's connection dropped (0) or came back (1) |
| `q` | The other player left; the room is closed |
| `e` | A refusal: `none`, `full`, `busy`, `wait` or `long` |
| `p` | Every five seconds, so the page can tell a dead connection |

## Limits

All in `LIMITS` in `room.js`: 60 damage for one hit, 90 at once and 70 a second after that, 300 blocks and 15
blasts or rockets a second, 90 messages a second,
ten minutes of waiting for a second player, 45 minutes for a room, twelve seconds of grace for a dropped connection,
twenty seconds of silence before a connection counts as dropped.

The caps limit a player who alters the game; they do not stop one. The room does not check aim or movement.

A room that is waiting costs Durable Object time. One address can open 6 a minute and each can wait ten minutes, so
one address can hold about 60 rooms open. On the free plan, enough idle rooms held open would use up the day's
Durable Object allowance; duels would then fail until the allowance resets, and the rest of the site would be
unaffected. If that happens, add a rate limiting rule for `/duel/new` in the zone's security settings.

## Running it here

    npm ci --prefix deploy
    deploy/node_modules/.bin/wrangler dev --config workers/duel/wrangler.toml --port 8787 --ip 127.0.0.1 --var ORIGINS:http://127.0.0.1:8000

`psycho-syber/test/arena-browser.mjs` does this itself and plays a duel through it.

## Deploying

`.github/workflows/duel-relay.yml` deploys the relay when a push to `main` changes this folder, and can be run by
hand from the Actions tab. It uses `CLOUDFLARE_API_TOKEN`, as the Pages workflow does. That token needs, beyond
what Pages needs:

- Account: Workers Scripts, Edit
- Zone `syberlabs.io`: Workers Routes, Edit

If the workflow fails on authorization, either add those two permissions to the token, or deploy once by hand from
a machine signed in to the account:

    npx wrangler@4.141.0 deploy --config workers/duel/wrangler.toml

The first deploy creates the Worker, its Durable Object class and the route. To check it, open the game, press
Duel and Start a duel: a code appears. If the page says the duel server did not answer, the route is not there.

To take the relay down: delete the Worker `syberlabs-duel` in the Cloudflare dashboard. The game then says the duel
server did not answer, and Waves is unaffected.

The route is on `syberlabs.io` only. A Pages preview or `staging.syberlabs.io` has no relay, so a duel cannot be
started there.
