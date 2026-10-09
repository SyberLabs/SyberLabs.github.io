# server/ contract

The API each `server/` module exports, so modules can be written in parallel. The design is RFC-0002
(MasterMind `docs/rfc/RFC-0002-staff-accounts.md`); where this file and the RFC disagree, the RFC wins and
the code cites it in a one-line comment. Plain ESM `.js`, 2-space indent, single quotes, no npm runtime
dependencies: Web Crypto, `fetch`, `URL` and D1 `prepare/bind/first/all/run/batch` only.

## Conventions

- **Times** are unix milliseconds (`ctx.now`). **Ids** are `newId()` (32 hex). **Tokens** are `randomToken()`.
- **env:** `ORIGIN` (`https://syberlabs.io`, no trailing slash), `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, `APP_SECRET` (32+ chars), `DB`. Any missing: 503.
- **Handler:** `async (ctx) => Response`. Build responses only with `http.js` helpers (`html`, `json`,
  `redirect`, `apiError`); `app.js` re-applies `secure()` to whatever comes back. To fail, either return a
  response or `throw new HttpError(code, message?)`; app.js renders it as JSON under `/api/`, HTML elsewhere.
- **Never** put a secret, provider token, session token or exception message in a response, header or log.
- **SQL** binds every value (`?1`, `?2` or `?`). Multi-row writes go in one `env.DB.batch([...])`.
- **Status codes, all produced by app.js unless noted:**
  - 303 empty body: signed-out `/admin*` -> `/auth/signin?next=<encoded>` (+ `&e=expired_session` and a
    cleared session cookie when the cookie was present but dead). `next` is the GET's own path+search; for a
    POST it is the longest GET route path that prefixes the POST path (`/admin/people/roles/grant` ->
    `/admin/people`), else `/admin/` (RFC-0002 3.6).
  - 401 `signin_required`: signed-out `/api/*`. 403 `csrf`: any POST failing `checkCsrf`. 403 `forbidden`:
    signed in without the route's key (HTML: `forbiddenHtml(ctx, key)`). 404 `not_found`: unknown path when
    signed in, or under `/auth/`. 405 `method_not_allowed`: a method other than GET/HEAD/POST, a known path
    with the wrong method, or HEAD under `/auth/start/*` and `/auth/callback/*`.
  - 308: non-canonical host -> `env.ORIGIN` + path + search; `GET /admin` -> `/admin/`.
  - 503 `unconfigured`: missing env, or any uncaught non-HttpError throw (D1 down). HTML: `unavailableHtml()`.
  - OAuth failures (handlers in oauth.js): 303 `/auth/signin?e=<code>`; uninvited identity: 403 `deniedHtml`.
- **API error body:** `{"error":{"code","message"}}` via `apiError(code, message?)`.

## ctx (built by app.js, passed to every handler)

```js
{ request, env, url /* URL */, now /* ms */, waitUntil /* (promise) => void */,
  params /* {provider} from :segments, decoded */, form /* URLSearchParams; empty unless POST */,
  route /* {method, pattern, access, opts} */,
  user /* null or {id, identityId, sessionHash, displayName, provider, login, email, expiresAt} */,
  perms /* Set<string>, empty when signed out */ }
```

## Modules

**permissions.js** (foundation): `CATALOGUE` `{key: {privileged, label}}` (must equal the migration rows),
`PUBLIC`, `SIGNED_IN` (Symbols).

**crypto.js** (foundation): `utf8(s)`, `hex(bytes)`, `b64urlEncode(bytes|string)`, `b64urlDecode(s)` (throws),
`randomBytes(n)`, `newId()`, `randomToken(n=32)`, `sha256(x)` -> Uint8Array, `sha256Hex(x)`, `sha256B64url(x)`
(PKCE S256), `timingSafeEqual(a, b)` (strings), `deriveKeys(APP_SECRET)` -> `Promise<{stateKey, auditKey}>`
(HKDF-SHA256 over utf8(APP_SECRET), empty salt, infos `STATE_INFO`/`AUDIT_INFO`; cached; rejects if <32 chars),
`seal(key, bytes|string, aad)` / `open(key, sealed, aad)` -> Uint8Array|null, `sealJson` / `openJson` -> value|null
(AES-GCM, random 96-bit IV, `b64url(iv||ct)`; open never throws), `hmacHex(key, msg)`.

**http.js** (foundation): `esc(v)` (& < > " ', null -> ''), `CSP`, `SECURITY_HEADERS`, `secure(res)` (copy with
every header set and `Access-Control-Allow-Origin` removed), `html(body, init?)`, `json(data, init?)`,
`text(body, init?)`, `redirect(location, init?)` (303 default, empty body); `init = {status, headers, cookies:
string[]}`. `ERRORS`, `apiError(code, message?, init?)`, `class HttpError(code, message?)` (`.status` from
`ERRORS`), `class AuthError(code, detail?)` (codes: cancelled, expired, provider, no_email, invite_invalid,
disabled). `cookie(name, value, maxAgeSeconds)` (`Path=/; Secure; HttpOnly; SameSite=Lax`, never Domain),
`clearCookie(name)`, `readCookie(request, name)` -> string|null. `checkCsrf(request, origin)` -> boolean,
`safeReturnTo(raw, origin)` (RFC 3.6, verbatim), `isApiPath(p)`, `ipPrefix(request)` (/24 or /48 of
CF-Connecting-IP, or null), `userAgent(request)` (<=200 chars or null), `requestId(request)` (cf-ray),
`readForm(request)` -> URLSearchParams (urlencoded only; >16 KiB throws `HttpError('too_large')`).

**app.js**: `handle(request, env, waitUntil = () => {}, now = Date.now())` -> Response. Order: ORIGIN present
(else 503) -> host 308 -> rest of config (else 503) -> method rules -> `/admin` 308 -> CSRF on POST ->
`loadSession` -> `match` -> access -> `readForm` -> handler -> `secure()`; HEAD gets GET's headers, no body.

**routes.js**: `ROUTES` (the RFC 8.2 table verbatim: `['GET  /auth/signin', PUBLIC, signinPage]`, ...),
`compile(routes)` -> compiled rows; throws at load if the access slot is missing or not PUBLIC / SIGNED_IN /
a `CATALOGUE` key, the handler is not a function, or PUBLIC sits outside `/auth/`. `TABLE = compile(ROUTES)`.
`match(table, method, pathname)` -> `{route, params}` | `{methods: [...]}` (path known, method not) | `null`.
`:name` matches one non-empty segment. HEAD matches GET rows.

**session.js**: `SESSION_COOKIE = '__Host-sl_session'`, `SESSION_TTL_MS = 12 h`,
`loadSession(env, request, now)` -> `{user, perms, stale}` (the RFC 8.1 query, one read, no writes; `stale` =
cookie sent but no live row), `mintSession(env, {userId, identityId, request, now})` -> `{token, cookie,
stmt}` (stmt is the unexecuted `INSERT INTO sessions` with sha256Hex(token), ip_prefix, user_agent; the
caller batches it), `sessionCookie(token)`, `clearSessionCookie()`, `deleteUserSessionsStmt(db, userId)`.
Handlers: `signout` (delete own row, clear cookie, 303 `/`, or `/auth/signin?e=signed_out&next=<safe>` when the
form has `next`), `revokeOwnSessions` (deletes the user's *other* sessions, RFC 3.5; 303
`/admin/account?ended=<n>`). Never sends `Clear-Site-Data`.

**oauth.js**: `OAUTH_COOKIE = '__Host-sl_oauth'`, `STATE_TTL_MS = 600000`, `PROVIDERS = ['github','google']`,
`sealState(env, provider, payload)` / `openState(env, provider, sealed, now)` -> payload|null (AAD
`sl_oauth|<provider>`; payload `{v:1, p, s, cv, n?, inv?, r, t}`; null if undecryptable, `p` mismatch,
`v !== 1`, or `now - t >= 600000`). Handlers: `startLogin` (form: `next`, `invite`, `prompt=select_account`;
unknown provider 404; no D1 access; 303 to the provider + state cookie Max-Age=600) and `callback` (RFC 2.2:
always clears the state cookie; every state check before any fetch; `error=access_denied` -> `e=cancelled`;
outcomes a-d; 303 to the sealed `r`, or `/admin/?welcome=1` after an invite redemption).

**github.js**: `authorizeUrl(env, {state, challenge, selectAccount})`, `fetchIdentity(env, {code, verifier,
waitUntil})` -> `{subject /* numeric id as text */, login, email /* primary && verified, or null */}`;
throws `AuthError('provider')`; schedules the token revoke (Basic auth) exactly once whenever a token was
issued. `lookupLogin(login)` -> `{id, login}` | null (Packet 4 invite form).

**google.js**: `authorizeUrl(env, {state, challenge, nonce, loginHint, selectAccount})`,
`fetchIdentity(env, {code, verifier, nonce, now})` -> `{subject, email, emailVerified, hd}` (token failure:
`AuthError('provider')`; any id_token check: `AuthError('expired')`), `verifyIdToken(env, jwt, {nonce, now})`
-> claims, `googleAuthoritative(email, hd)` -> boolean, `resetJwksCache()` (tests).

**authz.js** (Packet 2 part): `can(ctx, key)`, `displayNames(db, ids)` -> `Map<id, name>`,
`auditStmt(db, {at, actor, action, targetType, targetId, detail, request})` -> unexecuted stmt,
`findIdentity(db, provider, subject)` -> `{identityId, userId, displayName, disabledAt}` | null,
`findOpenInvite(db, {provider, subject, tokenHash, now})` -> invite row | null,
`inviteForToken(db, token, now)` -> `{invite, roleName, inviterName, targetName}` | null (sign-in greeting),
`redeemInvite(env, {invite, provider, subject, email, login, request, now})` -> `{userId, identityId}` | null
(one guarded batch, RFC 8.1). (`recordDenied` was removed in integration: RFC section 0 records nothing for refusals.)
(Packet 4 part, appended below a `// --- Packet 4: guards` line, never rewriting the part above):
`permsOfUser(db, userId, now)` -> Set, `permsOfRole(db, roleId)` -> Set, `subset(a, b)`, `GUARD_COPY`
`{up, target, lockout, system, self}` (RFC 3.5 strings), and lockout-safe statement builders.

**views/** — each returns HTML strings; handlers return Responses.
- `layout.js`: `page(ctx, {title, body, section, admin = true})` -> full document (privacy-page shell, `noindex`,
  `<!--email_off-->`, header()/footer(); admin chrome with "Staff only" badge, account line, Sign out form, nav
  filtered by `ctx.perms`); `alert(kind, html)`.
- `signin.js`: handler `signinPage`; `ERROR_COPY` (RFC 3.4 codes). `admin-home.js`: `adminHome`.
  `account.js`: `accountPage`, `me` (JSON `{name, provider, permissions: [sorted]}`).
- `forbidden.js`: `forbiddenHtml(ctx, key)`, `deniedHtml(ctx, {provider, name, emailMatch})`,
  `notFoundHtml(ctx)`, `errorHtml(ctx, httpError)` (CSRF copy per RFC 3.4), `unavailableHtml()` (no ctx).
- Packet 3 `changes.js`: `changesPage`, `saveChange`, `deleteChange`, `changesJson`, `validHref(raw)` -> string|null.
- Packet 4 `people.js`: `peoplePage`, `createInvite`, `revokeInvite`, `grantRole`, `revokeRole`,
  `removeIdentity`, `disableUser`, `enableUser`, `revokeUserSessions`; `roles.js`: `rolesPage`, `saveRole`;
  `audit.js`: `auditPage`; `confirm.js`: `confirmHtml(ctx, {title, lines, action, fields, submitLabel})`
  (re-posts every field plus `confirm=1`). A `confirm` route acts only when `ctx.form.get('confirm') === '1'`.

## Tests (`node --test 'server/test/**/*.test.js'`; RFC 8.5 case numbers)

Shared, foundation-owned: `d1-shim.js` (`freshDb()`, `brokenDb()`, `D1Shim#totalChanges()/count(t)/sqlite`)
and `helpers.js` (`makeEnv`, `seedRole`, `seedUser`, `seedSession`, `signIn`, `call(env, path, opts)`,
`setCookies`, `stubFetch`). Others may add fixtures in their own files only.

| File | Owner | Cases |
|---|---|---|
| crypto.test.js, http.test.js, migration.test.js | foundation | 9, 10 (unit), 12 (CHECK), 15, 18 |
| routes.test.js | app.js + routes.js | 1, 2, 10 (through handle), 17 |
| session.test.js | session.js | 11, 16, 24 |
| oauth.test.js | oauth.js | 4, 9 (callback ignores `next`) |
| google.test.js + google-fixtures.js | google.js | 5 |
| github.test.js | github.js | 6 |
| invites.test.js | authz.js (Packet 2) | 7, 8 |
| views.test.js | views (Packet 2) | 22, escaping of names, nav filtered by perms |
| changes.test.js | Packet 3 | 3, 12 (code + escaping) |
| people.test.js, roles.test.js, guards.test.js | Packet 4 | 13, 14, 19, 20, 21, 23 |

## Contract changes

- **signin (session.js, oauth.js, github.js, google.js)**, following RFC-0002 rev 2 where it differs from the above:
  - `loadSession` user also carries `createdAt` (session start, for the account page). The query adds
    `i.user_id = s.user_id` (RFC 8.1) plus the migration's `user_roles.expires_at` and `permissions.deprecated_at` filters.
  - `signout` always lands on `/auth/signin?e=signed_out`, plus a sanitized `next` and `switch=1` when the form sent them (RFC 2.2).
  - `revokeOwnSessions` deletes every session of the user, this one included, audits `session.revoke_all`, clears the
    cookie and 303s to `/auth/signin?e=signed_out` (RFC 2.3, test 9). It never redirects to `/admin/account?ended=`.
  - `startLogin` reads `switch=1` (RFC) or `prompt=select_account`, and for Google a hidden `login_hint` form field, used
    only with a well-formed `invite`. Start does no D1 read, so **signin.js should render `login_hint=<invite.email_normalized>`
    on a Google invite's form** (RFC 2.2 login_hint).
  - `callback` errors keep the sealed invite and return path: `/auth/signin?invite=<t>&next=<r>&e=<code>` (RFC 2.2);
    only `e=expired` (cookie unreadable) and `e=disabled` carry neither. New code `wrong_provider` (case b′). An add-method
    redemption lands on `/admin/account?added=<provider>`, a role invite on `/admin/?welcome=1` (RFC 3.3).
  - Uninvited (cases c, d) writes nothing to D1 and logs one line `{event, provider, emailMatch}`; `recordDenied` is not
    called (RFC section 0, test 5). `deniedHtml` gets `{provider, name (GitHub login without @, or the Google email),
    emailMatch, invite, next}`.
  - GitHub: no `scope`, exactly two calls (token, `/user`), no `/user/emails`, no revoke (RFC 2.2, T28). `fetchIdentity`
    returns `email: null`; `waitUntil` is accepted and unused. `lookupLogin` returns `{id: '<digits>', login}`.
  - Google: the id_token's claims are checked (`iss`, `aud`, `exp > now − 30 s`, `nonce`, non-empty `sub`) and no JWKS is
    fetched (RFC section 0, 2.2, T31). `verifyIdToken` is synchronous; there is no `resetJwksCache`.
  - `PROVIDERS` is still `['github', 'google']`. RFC 2.1 enables Google only in Packet 5 (`/auth/start/google` 404 until
    then); to ship Packet 2 without it, set `PROVIDERS = ['github']` in oauth.js (google.test.js then needs it back).
- **views (layout, signin, admin-home, account, forbidden, error, changes, audit, confirm; staff.css; privacy copy)**:
  - `layout.js` also exports the helpers every view shares: `head(eyebrow, h1)`, `field({name, label, value, error, kind,
    type, hint, options, attrs})` (the RFC 3.4 markup, id `f-<name>`), `errorSummary(errors, labels)`, `fixPrefix(errors)`,
    `hidden(fields)`, `postButton(action, label, fields, cls)`, `time(ms)`/`utc(ms)`/`duration(ms)`, `navItems(ctx)`,
    `providerLabel(p)`. `page()` puts its own " · SyberLabs staff" after `title`; `alert(kind, html)` kinds are
    `neutral | success | warning | danger`.
  - `forbidden.js` re-exports `notFoundHtml`, `errorHtml`, `unavailableHtml`, `CSRF_COPY` from `views/error.js`.
  - `confirm.js` exports `confirmed(ctx)`, `actingAs(user)` ("You, Seth via GitHub," escaped, trailing comma) and
    `confirmHtml(ctx, {title, lines, action, fields, submitLabel, cancel = '/admin/', section})` -> string.
  - Sign-in page: `?p=<provider>` (optional) names the provider in the `e=provider` copy, which is generic without it.
    Its forms send both `switch=1` and `prompt=select_account`, and `login_hint` on a Google invite. Copy follows RFC 3.4;
    the no-keys empty state says "Ask an admin" (no names in the repo).
  - `changes.js` hard-deletes (RFC 5.1; the audit row keeps the old row) and writes only the RFC 8.1 columns, so it works
    on either migration; `deleted_at`, `created_by`, `updated_*` stay unused. Rows use `staff-change__*` (RFC 2.6), not
    `.home-latest*`. It also exports `validateEntry(input)` -> `{entry, errors}`, shared with `scripts/changes-import.mjs`
    (`<commit>` or `--file <path>`; first line `-- source <sha>, N rows`; one bad entry exits 1 with no SQL).
  - `staff.css` sits at the repo root and is linked as `/staff.css?v=1`: **`scripts/assemble-dist.sh` must copy it into
    `dist/`** (owner of that file). It aliases `sy-btn--primary` and `sy-h3` (not kit classes) for people/roles.
  - `privacy/index.html` copy describes what this build does (GitHub and Google, no-scope GitHub, user agent and IP
    prefix on sessions and audit rows, nothing recorded for refusals, ~400 days). If Packet 2 ships with
    `PROVIDERS = ['github']`, drop Google from the staff entry. "About 400 days" needs the retention delete (RFC 5.1).
- **core (authz.js, routes.js, app.js, views/people.js, views/roles.js)**:
  - `ROUTES` is RFC 8.2 plus the routes this contract already names: `GET /api/me`, `GET /api/admin/changes`,
    `POST /admin/people/sessions/revoke`. `enableUser` and `saveRole` have no confirm (RFC 8.2).
  - The on-disk migration has `full_admins` and no privileged-key triggers, so authz keeps the up rule, the target rule
    and the `full_admins` lockout, and `saveRole` also refuses any privileged key on a custom role (RFC 2.4, 403).
  - `auditStmt(db, {..., when: [sqlCondition, ...params]})` writes `INSERT … SELECT … WHERE <cond>`, so batch rows
    land only when the guarded first statement took effect.
  - `redeemInvite`'s UPDATE re-checks the inviter (enabled, holds `id:users.manage` and every key of the role and of an
    add-method target, non-expired grants) and an add-method target being enabled; bootstrap (`invited_by` NULL) is exempt.
    A UNIQUE race on `(provider, subject)` returns null.
  - Packet 4 exports also: `permsOfSql(userExpr, nowExpr)`, `MANAGE_KEYS`, `isFullAdmin`, `revokeRoleStmt`,
    `disableUserStmts` (also revokes the target's open invites, RFC 8.1), `removeRolePermStmt`, `removeIdentityStmt`;
    `GUARD_COPY` adds `privileged` and `lastMethod`.
  - Packet 4 handlers live in views/people.js and views/roles.js (written by core). Guard refusals render the page with
    a danger alert and HTTP 403 and change no row; a stale invite revoke is 409. Successes 303 to `/admin/people?ok=<code>`
    or `/admin/roles?ok=saved`; a created invite renders 200 (the Google link is shown once).
  - app.js: a signed-out request to a SIGNED_IN route outside `/admin/` (e.g. `POST /auth/signout`) is 303
    `/auth/signin?e=signed_out`; 405s carry `Allow`; an `AuthError` escaping a handler is 303 `/auth/signin?e=<code>`.
  - Cases 7 and 8 are in authz.test.js (not invites.test.js); core's other files: routes, app, changes-api, people,
    roles, guards.
- **integration**:
  - `recordDenied` is gone (dead under RFC section 0); plan case 7 is now "ten uninvited tries write no row" in oauth.test.js.
  - `CSP` has no `script-src` or `connect-src` (RFC 8.2); app.test asserts it on every response.
  - `_routes.json` keeps `/api/*` because `GET /api/me` and `GET /api/admin/changes` exist (RFC 2.1 drops `/api/*`; reconcile
    before merge). The deploy job installs wrangler from `deploy/package-lock.json` with `npm ci` (RFC D12).
