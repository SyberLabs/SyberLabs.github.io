# server/ contract

The API each `server/` module exports, so modules can be written in parallel. The design is RFC-0002
(MasterMind `docs/rfc/RFC-0002-staff-accounts.md`); where this file and the RFC disagree, the RFC wins and
the code cites it in a one-line comment. Plain ESM `.js`, 2-space indent, single quotes, no npm runtime
dependencies: Web Crypto, `fetch`, `URL` and D1 `prepare/bind/first/all/run/batch` only.

## Conventions

- **Times** are unix milliseconds (`ctx.now`). **Ids** are `newId()` (32 hex). **Tokens** are `randomToken()`.
- **env:** `ORIGIN` (`https://syberlabs.io`, no trailing slash), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
  `APP_SECRET` (32 bytes as unpadded base64url), `DB`. Any missing or malformed: 503. Google (`GOOGLE_CLIENT_*`)
  arrives in Packet 5.
- **Handler:** `async (ctx) => Response`. Build responses only with `http.js` helpers (`html`, `redirect`);
  `app.js` re-applies `secure()` to whatever comes back. To fail, either return a response or
  `throw new HttpError(code, message?)`; app.js renders it as an HTML page. There is no `/api/*` (RFC-0002 R1-8).
- **Never** put a secret, provider token, session token or exception message in a response, header or log.
- **SQL** binds every value (`?1`, `?2` or `?`). Multi-row writes go in one `env.DB.batch([...])`.
- **Status codes, all produced by app.js unless noted:**
  - 303 empty body: signed-out `/admin*` -> `/auth/signin?next=<encoded>` (+ `&e=expired_session` and a
    cleared session cookie when the cookie was present but dead). `next` is the GET's own path+search; for a
    POST it is the longest GET route path that prefixes the POST path (`/admin/people/roles/grant` ->
    `/admin/people`), else `/admin/` (RFC-0002 3.6).
  - 403 `csrf`: any POST failing `checkCsrf`. 403 `forbidden`:
    signed in without the route's key (HTML: `forbiddenHtml(ctx, key)`). 404 `not_found`: unknown path when
    signed in, or under `/auth/`. 405 `method_not_allowed`: a method other than GET/HEAD/POST, a known path
    with the wrong method, or HEAD under `/auth/start/*` and `/auth/callback/*`.
  - 308: non-canonical host -> `env.ORIGIN` + path + search; `GET /admin` -> `/admin/`.
  - 503: missing env, or any uncaught non-HttpError throw (D1 down), rendered in place on the path that failed
    (`unavailableHtml(pathname)`: "Staff pages are unavailable" under `/admin`, else the sign-in page with
    "Sign-in is unavailable" and no buttons). Never a redirect and never a `?e=` code (RFC-0002 2.1, 3.4).
  - OAuth failures (handlers in oauth.js): 303 `/auth/signin?next=<r>&e=<code>&p=<provider>` (`next` and `p` only
    when the state cookie decrypted); an identity nobody added: 403 `deniedHtml`.

## ctx (built by app.js, passed to every handler)

```js
{ request, env, url /* URL */, now /* ms */,
  params /* {provider} from :segments, decoded */, form /* URLSearchParams; empty unless POST */,
  user /* null or {id, identityId, sessionHash, displayName, provider, subject, login, email, createdAt, expiresAt} */,
  perms /* Set<string>, empty when signed out */ }
```

## Modules

**permissions.js** (foundation): `CATALOGUE` `{key: {privileged, label}}` (must equal the migration rows),
`PUBLIC`, `SIGNED_IN` (Symbols).

**crypto.js** (foundation): `hex(bytes)`, `b64urlEncode(bytes|string)`, `b64urlDecode(s)` (throws),
`randomBytes(n)`, `newId()`, `randomToken()` (32 bytes), `sha256(x)` -> Uint8Array, `sha256Hex(x)`, `sha256B64url(x)`
(PKCE S256), `timingSafeEqual(a, b)` (strings), `secretKeyBytes(APP_SECRET)` -> 32 bytes | null,
`stateKey(APP_SECRET)` -> `Promise<CryptoKey>` (APP_SECRET imported directly as the AES-GCM key, no HKDF, RFC-0002
R1-14; cached; rejects unless 32 bytes), `sealJson(key, value, aad)` / `openJson(key, sealed, aad)` -> value|null (AES-GCM, random 96-bit IV, `b64url(iv||ct)`; open never throws).

**http.js** (foundation): `esc(v)` (& < > " ', null -> ''), `CSP`, `SECURITY_HEADERS`, `secure(res)` (copy with
every header set and `Access-Control-Allow-Origin` removed), `html(body, init?)`, `text(body, init?)`,
`redirect(location, init?)` (303 default, empty body); `init = {status, headers, cookies: string[]}`. `ERRORS`
(`[status, message]` per code), `class HttpError(code, message?)` (`.status` from `ERRORS`),
`class AuthError(code, detail?)` (codes: cancelled, expired, provider, disabled). `cookie(name, value, maxAgeSeconds)` (`Path=/; Secure; HttpOnly; SameSite=Lax`, never Domain),
`clearCookie(name)`, `readCookie(request, name)` -> string|null. `checkCsrf(request, origin)` -> boolean,
`safeReturnTo(raw, origin)` (RFC 3.6, verbatim), `ipPrefix(request)` (/24 or /48 of
CF-Connecting-IP, or null), `userAgent(request)` (<=200 chars or null; sessions only),
`readForm(request)` -> URLSearchParams (urlencoded only; >16 KiB throws `HttpError('too_large')`).

**app.js**: `handle(request, env, now = Date.now())` -> Response. Order: ORIGIN present
(else 503) -> host 308 -> rest of config (else 503) -> method rules -> `/admin` 308 -> CSRF on POST ->
`loadSession` -> `match` -> access -> `readForm` -> handler -> `secure()`; HEAD gets GET's headers, no body.

**routes.js**: `ROUTES` (the RFC 8.2 table without its opts column: `['GET  /auth/signin', PUBLIC, signinPage]`, ...;
each handler decides its own confirm step and `ownerPage()` derives a POST's owning page),
`compile(routes)` -> compiled rows; throws at load if the access slot is missing or not PUBLIC / SIGNED_IN /
a `CATALOGUE` key, the handler is not a function, or PUBLIC sits outside `/auth/`. `TABLE = compile(ROUTES)`.
`match(table, method, pathname)` -> `{route, params}` | `{methods: [...]}` (path known, method not) | `null`.
`:name` matches one non-empty segment. HEAD matches GET rows.

**session.js**: `SESSION_COOKIE = '__Host-sl_session'`, `SESSION_TTL_MS = 12 h`, `SESSION_COOKIE_MAX_AGE = 46800` (13 h, RFC-0002 R4-8),
`loadSession(env, request, now)` -> `{user, perms, stale}` (the RFC 8.1 query, one read, no writes; `stale` =
cookie sent but no live row), `mintSession(env, {userId, identityId, request, now})` -> `{token, cookie,
stmt}` (stmt is the unexecuted `INSERT INTO sessions` with sha256Hex(token), ip_prefix, user_agent; the
caller batches it), `sessionCookie(token)`, `clearSessionCookie()`, `deleteUserSessionsStmt(db, userId)`.
`TOKEN_RE` (43 base64url chars). Handlers: `signout` (PUBLIC; deletes the row its own cookie names, expires the cookie,
303 `/auth/signin?e=signed_out` plus a sanitized `next` and `switch=1` when sent), `revokeOwnSessions` (every session of
the user, this one included; 303 `/auth/signin?e=signed_out_all`). Never sends `Clear-Site-Data`.

**oauth.js**: `OAUTH_COOKIE = '__Host-sl_oauth'`, `STATE_TTL_MS = 600000` (GitHub only until Packet 5: any other `:provider` is 404),
`sealState(env, provider, payload)` / `openState(env, provider, sealed, now)` -> payload|null (AAD
`sl_oauth|<provider>`; payload `{v:1, p, s, cv, n?, r, t}`; null if undecryptable, `p` mismatch,
`v !== 1`, or `now - t >= 600000`). Handlers: `startLogin` (form: `next`, `switch=1`;
unknown provider 404; no D1 access; 303 to the provider + state cookie Max-Age=600) and `callback` (RFC 2.2:
always clears the state cookie; every state check before any fetch; `error=access_denied` -> `e=cancelled`;
outcomes a and b; case a's batch also deletes the session the browser's previous cookie named and every expired
session (RFC 2.2, 3.2); 303 to the sealed `r`).

**github.js**: `authorizeUrl(env, {state, challenge, selectAccount})`, `fetchIdentity(env, {code, verifier})`
-> `{subject /* numeric id as text */, login}`; throws `AuthError('provider')`; no token revoke (RFC 2.2, T28).
`LOGIN_RE`, `lookupLogin(login)` -> `{id, login}` | `'missing'` (404) | null (GitHub did not answer) (Add person).

**google.js**: Packet 5 is implemented. Google is enabled only when both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET exist; claims are validated through the trusted TLS token endpoint and Google links require a recent existing staff session.

**authz.js** (Packet 2 part): `can(ctx, key)`, `identityName({login, subject})` -> `@login` | `GitHub id N` |
`a removed account`, `displayNames(db, ids)` -> `Map<id, identityName of the user's first identity>`,
`auditStmt(db, {at, actor, action, targetType, targetId, detail, request})` -> unexecuted stmt,
`findIdentity(db, provider, subject)` -> `{identityId, userId, displayName, disabledAt}` | null,
(Packet 4 part, below a `// --- Packet 4: guards` line): `GUARD_COPY` `{lockout, system, self, privileged}`
(RFC 3.5 strings), `revokeRoleStmt`, `disableUserStmts`, `removeRolePermStmt` (lockout-safe statement builders over
the `admins` view).

**views/** — each returns HTML strings; handlers return Responses.
- `chrome.js`: `staffHeader(ctx, {section, user, signOut})` (RFC 2.6: skip link, `.sy-field-host`, then
  `<header class="staff-header">` with wrapping rows: lockup + Sign out; `Staff` eyebrow + "Signed in as @login
  (GitHub)"; `<nav class="staff-nav" aria-label="Staff">`, always shown), `NAV`, `navItems(ctx)`, `PROVIDER_LABEL`,
  `providerLabel(p)`, `signedInAs(user)`, `GITHUB_MARK`. Never the public `header()`.
- `layout.js`: `page(ctx, {title, body, section, admin = true, signOut})` -> full document (privacy-page shell without
  its Google Fonts links, `noindex`, `<!--email_off-->`, `staffHeader()`, public `footer()`); `alert(kind, html)`.
- `signin.js`: handler `signinPage` (no D1 access); `ERROR_COPY` (RFC 3.4 codes: cancelled, expired, provider,
  disabled, expired_session, signed_out, signed_out_all; `p` names the provider), `contact(text)`.
  `admin-home.js`: `adminHome` (200 private portal; permission-filtered tool cards and account access for every staff session). `account.js`: `accountPage`
  (the no-keys empty state lives here).
- `forbidden.js`: `forbiddenHtml(ctx, key)`, `deniedHtml(ctx, {provider, name, next})`,
  `notFoundHtml(ctx)`, `errorHtml(ctx, httpError)` (CSRF copy per RFC 3.4), `unavailableHtml(pathname)` (no ctx).
- Packet 3 `changes.js`: `changesPage`, `saveChange`, `deleteChange`, `validHref(raw)` -> string|null.
- Packet 4 `people.js`: `peoplePage`, `addPerson`, `grantRole`, `revokeRole`, `disableUser`, `enableUser` (each
  confirms first); `roles.js`: `rolesPage`, `saveRole`;
  `audit.js`: `auditPage`; `confirm.js`: `confirmHtml(ctx, {title, lines, action, fields, submitLabel})`
  (re-posts every field plus `confirm=1`). A handler that needs a confirm acts only when `ctx.form.get('confirm') === '1'`.

## Tests (`node --test 'server/test/**/*.test.js'`; RFC 8.5 case numbers)

Shared, foundation-owned: `d1-shim.js` (`MIGRATION_FILES` in apply order, `migrate(db, files)`, `freshDb({upTo})`
applying 0001 then 0002 and on, `brokenDb()`, `D1Shim#totalChanges()/count(t)/sqlite`)
and `helpers.js` (`makeEnv`, `seedRole`, `seedUser`, `seedSession`, `signIn`, `call(env, path, opts)`,
`setCookies`, `stubFetch`). Others may add fixtures in their own files only.

| File | Owner | Cases |
|---|---|---|
| crypto.test.js, http.test.js, migration.test.js | foundation | 9, 10 (unit), 12 (CHECK), 15, 18 |
| routes.test.js | app.js + routes.js | 1, 2, 10 (through handle), 17 |
| session.test.js | session.js | 11, 16, 24 |
| oauth.test.js | oauth.js | 4, 9 (callback ignores `next`) |
| github.test.js | github.js | 6 |
| authz.test.js | authz.js (Packet 2) | 7, 8 |
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
  - `startLogin` reads `switch=1` only, and for Google a hidden `login_hint` form field, used
    only with a well-formed `invite`. Start does no D1 read, so **signin.js should render `login_hint=<invite.email_normalized>`
    on a Google invite's form** (RFC 2.2 login_hint).
  - `callback` errors keep the sealed invite and return path: `/auth/signin?invite=<t>&next=<r>&e=<code>` (RFC 2.2);
    only `e=expired` (cookie unreadable) and `e=disabled` carry neither. New code `wrong_provider` (case b′). An add-method
    redemption lands on `/admin/account?added=<provider>`, a role invite on `/admin/?welcome=1` (RFC 3.3).
  - Uninvited (cases c, d) writes nothing to D1 and logs one line `{event, provider, emailMatch}`; `recordDenied` is not
    called (RFC section 0, test 5). `deniedHtml` gets `{provider, name (GitHub login without @, or the Google email),
    emailMatch, invite, next}`.
  - GitHub: no `scope`, exactly two calls (token, `/user`), no `/user/emails`, no revoke (RFC 2.2, T28). `fetchIdentity`
    returns `email: null`. `lookupLogin` returns `{id: '<digits>', login}`.
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
  - Sign-in page: one GitHub form, and the `e=` copy names GitHub (no `?p=` until Packet 5 adds a second provider). Its forms send `switch=1` (no `prompt` field), and `login_hint` on a Google invite. Copy follows RFC 3.4;
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
  - `ROUTES` is RFC 8.2 (Packets 2-4, plus `POST /admin/people/identity/remove`) and `POST /admin/people/sessions/revoke`.
    `saveRole` has no confirm; `enableUser` confirms when the target holds `role_admin` (RFC e4f92b8 8.2).
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
  - `_routes.json` includes only `/auth/*`, `/admin` and `/admin/*` (RFC 2.1, R1-8). The deploy job installs wrangler
    from `deploy/package-lock.json` with `npm ci` in a step with no token, and validate builds the Function with it (RFC D12, 8.3).
- **review round 1 (RFC-0002 rev 3 adopted where it cuts):** the bullets above that mention invite links, Google
  invites, `login_hint`, `wrong_provider`, `no_email`, add-method invites, `full_admins`, the up and target rules,
  expiring grants, retired keys or `/api/*` are superseded by this list.
  - Invites are GitHub only, pinned to the numeric id, with no token and no link (RFC 2.5): `invites(id, role_id NOT
    NULL, subject NOT NULL numeric, login_hint, invited_by NOT NULL, …)`. Creation refuses an id with an open invite
    or a sign-in method, and any `provider` other than github (422). Google is added from a signed-in session in
    Packet 5; until then every unknown Google identity gets the 403 page ("Sign in with GitHub, then add Google from
    your account page."). A redemption whose guarded UPDATE changes 0 rows is that same 403 page (case c).
  - The sign-in page reads no D1 and ignores `?invite=`. Its codes are cancelled, expired, provider, disabled,
    expired_session, signed_out and unconfigured.
  - Privileged keys sit only on `role_admin`, enforced by the `role_perms_privileged_admin_only` and
    `role_perms_admin_keeps_all` triggers (RFC 8.1), so the up and target rules are gone and lockout uses the
    `admins` view (enabled holders of `role_admin`). Confirm pages: granting or revoking admin, turning off,
    removing a method, every invite.
  - Dropped columns: `users.disabled_reason`, `roles.created_by`, `user_roles.expires_at`, `permissions.deprecated_at`,
    `invites.note`/`token_hash`/`provider`/`email_normalized`/`user_id`, `audit_events.user_agent`/`request_id`,
    `change_entries.created_by`/`updated_by`/`updated_at`/`deleted_at`; `audit_dedupe` and the 90-day `signin.denied`
    retention tier are gone. `change_entries_order` replaces the partial index.
  - `/api/me`, `/api/admin/changes` and `/api/*` in `_routes.json` are gone (RFC R1-8); every error is HTML.
  - Bootstrap writes users, identities and grants directly from Seth's terminal (RFC 8.4.8); its audit action is
    `bootstrap`.
- **review round 2:**
  - **Spec target.** This branch implements RFC-0002 as of `88e25a9` (red-team round 2). Round 3 (`e4f92b8`) deletes
    invites (`invites` table, `login_hint`, case b, redemption batch, invite revoke, open-invites list, `welcome=1`) for
    `POST /admin/people/add`, drops `users.display_name` and the seeded `viewer`, makes `/auth/signin` never redirect,
    makes `POST /auth/signout` PUBLIC and splits a CI function job. Those are not adopted here: whether this branch
    tracks round 3 is Seth's call. Reviews should not flag that drift until he decides. Round 3 items adopted one by one
    are cited in code (`enableUser` confirm).
  - Confirm pages also cover deleting a What changed entry (RFC 2.4, 3.5, test 15) and turning on an account that holds
    `role_admin` (RFC `e4f92b8` 2.4, 8.2, test 19).
  - `ctx.waitUntil` is gone: nothing schedules work (no token revoke, RFC 2.2/T28). `AuthError` carries only `code`.
- **review round 3 (RFC-0002 rev 4/5, R3-1 and R3-4), superseding the bullets above where they differ:**
  - No invites (R3-4). `POST /admin/people/add` (`addPerson`, `id:users.manage`, confirm page first) takes one
    `account` field: digits must be a GitHub id (`^[1-9][0-9]{0,19}$`, never looked up, "username not checked");
    anything else must match `github.LOGIN_RE` and is looked up once (`lookupLogin` -> `{id, login}` | `'missing'` |
    `null`). Confirming runs the RFC 8.1 batch (users, identities, user_roles, `user.add` audit); `UNIQUE (provider,
    subject)` refuses an id that already has an account (422). Gone: the `invites` table, `findOpenInvite`,
    `redeemInvite`, callback case b, invite revoke and list, `INVITE_TTL_MS`, `welcome=1`, turn-off step 3.
  - Callback outcomes are a (known identity; also an added person's first sign-in, which refreshes `login` and
    `users.display_name`) and b (unknown: 403, nothing written).
  - GitHub only until Packet 5: `PROVIDERS = ['github']`; no `google.js`, nonce, Google button, Google copy or
    `accounts.google.com` in `form-action`; no `POST /admin/people/identity/remove` (`removeIdentity`, `lastMethod`).
  - app.js reads the session only under `/admin` (R3-1): `GET /auth/signin` never reads D1 and never redirects.
    `compile()` refuses a non-PUBLIC route outside `/admin/`. `POST /auth/signout` is PUBLIC: it deletes the row its
    own cookie names (if well-formed), always expires the cookie and keeps `next` and `switch=1`.
  - `readCookie` returns null when the name appears more than once (RFC 2.2 cookie parsing).
  - app.js no longer catches `AuthError`; only `github.fetchIdentity` throws it, inside `oauth.callback`.
- **follow-up after go-live (2026-10-08, RFC-0002 rev 6), superseding the bullets above where they differ:**
  - Migrations: `0001_accounts.sql` is applied to production D1 and is never edited. `0002_add_person.sql` drops the
    empty `invites` table, rewords the `id:users.manage` label ("Add people, grant and revoke roles, turn accounts off
    and on") and adds the RFC 8.1 triggers `roles_admin_fixed` and `role_perms_no_update`. Later changes are new files.
  - Staff pages use `staffHeader()` (chrome.js), never the public header or its Atlas. No Google Fonts: the CSP has
    no font source and `style-src` is `'self' 'unsafe-inline'`. `staff.css` is linked as `/staff.css?v=2`.
  - No tables on staff pages: People and Roles are `<ul>`s of items with a `<dl>`; Audit is an `<ol>` of sentences
    with names from identities (no hex ids, no IP prefixes, no filter). Every People action confirms first, and
    `POST /admin/people/sessions/revoke` is gone (RFC 8.2 has no such route; turning off ends sessions).
  - Names everywhere come from identities (`identityName`): `@login`, else `GitHub id N`. Confirm pages name the
    target as "@login (GitHub id N)"; revoking admin or turning off an admin adds "Admins left after this: …".
  - Error summary markup is `.sy-alert.sy-alert--danger.staff-errors` with a `<p>` and `<ul>` (RFC 3.4); `field()`
    takes `errorHtml` for the Add person lookup message, which carries a link.
  - `projects/latest.js`, the homepage `Latest()` section and its `.home-latest*` CSS are deleted;
    `scripts/assemble-dist.sh` no longer removes `dist/projects/latest.js`, so the CI `test ! -e` guard can fail, and
    CI greps `dist/` for the canary title. `scripts/changes-import.mjs <commit>` still reads the file from git history.

## Deviations from RFC

RFC-0002 rev 6 (MasterMind `docs/rfc/RFC-0002-staff-accounts.md`, read 2026-10-08) assumes #89 is reverted and
rebuilt on a fresh database. #89 is live instead, with sign-in on, so live reality wins for data. Deliberately not
implemented, with the reason:

- **Packet 1c and the RFC's own 0001 (sections 6, 8.1, 8.4.0).** Nothing is reverted and no database is replaced:
  production holds 2 users, 2 identities, 2 admin grants and 11 entries. The schema is #89's 0001 plus 0002, so these
  stay: `users.display_name` and `primary_email` (written, never used to name anyone), `roles.is_system`,
  `user_roles.granted_by`/`granted_at`, `sessions.ip_prefix`/`user_agent`, `audit_events.ip_prefix`, the `ON DELETE
  CASCADE`s on role foreign keys (no route deletes a role), and the seeded `viewer` role (test 11 "admin is the only
  seeded role" does not hold). Dropping live columns or a seeded role is a contract change, not an additive migration.
- **Audit retention (8.1 `audit_no_delete`, test 12).** The live trigger `audit_retention_only` allows deleting rows
  older than 400 days, and the privacy page promises "about 400 days". UPDATE always raises, and DELETE raises for any
  row inside 400 days; replacing the trigger would change a published retention promise.
- **File layout of tests (8.5 `server/test/<nn>-<name>.test.js`).** The existing files are kept; the table above maps
  them to RFC cases. Renaming them would churn history without changing what is tested.
- **`opts.back` and `opts.confirm` in `ROUTES` (8.2).** `ownerPage()` derives a POST's owning page from the table, and
  each handler runs its own confirm step; the tests check both. `PROVIDERS` is `requireGithub()` in oauth.js until
  Packet 5 makes it a list.
- **`staff/staff.css` (2.6, 8.3).** The stylesheet stays at the repo root and is served as `/staff.css`, the live
  path, which CI checks with `test -s dist/staff.css`. Moving it is a path change for no behaviour.
- **CI shape (8.3: a separate function job, the deploy job building from its own checkout, G8).** Not changed here:
  this task keeps the CI guards and their `if` form. Packet 1b's canary guard and the removal of #84's `rm -f` are done.
- **Headers (8.2).** `X-Frame-Options`, `Permissions-Policy` and `Cross-Origin-Opener-Policy` stay: the RFC says they
  add nothing, not that they harm. `form-action` names only GitHub until Packet 5 adds Google.
- **Names in copy (3.3, 3.4: "Ask Seth or Mateo").** The copy says "Ask an admin": no names in the repo.
- **`id:users.manage` label (2.4).** The permission now includes removing sign-in methods; the existing live schema already supports Packet 5 without new identity columns.
- **Two RFC conflicts, settled for the copy table in 3.4.** Test 4 expects `e=refused` for `error=server_error`, but
  3.4 has no such code and maps every non-`access_denied` error to `provider`; the code uses `e=provider&p=github`.
  Test 20 expects "Enter the account's numeric id instead", but 3.4's message for a failed lookup is "Open
  https://api.github.com/users/name and enter the "id" it shows instead." plus the `gh` line; the code uses 3.4.
- **Add person accepts a leading `@` (2.5).** It is dropped before the two patterns are checked, because people paste
  `@login`. Anything else that matches neither pattern is still refused without a fetch.
- **"Person added." (3.5).** The confirm POST 303s to `/admin/people?ok=added`, which shows that one-line notice like
  every other People action, as well as the "never signed in" row.
- **`novalidate` on staff forms (3.4).** Fields carry `required` and `maxlength`, but the forms keep `novalidate`, so
  the server's 422 messages (the RFC's own copy) show instead of the browser's.
- **Packet 5.** Google sign-in, Add Google, Remove on People, `google_taken` and the Google button are implemented. They remain unavailable until both Google credentials are configured. Linking requires a staff session younger than ten minutes; it cannot create a new staff account. Concurrent links cannot add a second Google identity or report success after session revocation.
