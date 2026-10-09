// The one route table. Deny by default: a path that is not here is refused, and a row without a valid
// access slot throws when this module loads. PUBLIC is allowed only under /auth/, and every other slot
// only under /admin/.
import { CATALOGUE, PUBLIC, SIGNED_IN } from './permissions.js';
import { signinPage } from './views/signin.js';
import { startLogin, callback, addGoogle } from './oauth.js';
import { googleEnabled } from './providers.js';
import { signout, revokeOwnSessions } from './session.js';
import { adminHome } from './views/admin-home.js';
import { accountPage } from './views/account.js';
import { changesPage, saveChange, deleteChange } from './views/changes.js';
import {
  peoplePage, addPerson, grantRole, revokeRole, disableUser, enableUser,
} from './views/people.js';
import { rolesPage, saveRole } from './views/roles.js';
import { auditPage } from './views/audit.js';

// [method path, access, handler, opts?]; access = PUBLIC | SIGNED_IN | '<permission key>'. Each handler decides
// for itself whether an action needs a confirm page first (views/confirm.js confirmed), and ownerPage()
// derives a POST's owning page, so the RFC's opts column carries only `provider`: a row that exists only while
// that provider is on (tableFor).
// No /api/* routes: RFC-0002 R1-8 removed the JSON API, which had no consumer.
export const ROUTES = [
  // Packet 2
  ['GET  /auth/signin',                        PUBLIC,               signinPage],     // never reads D1, never redirects
  ['POST /auth/start/:provider',               PUBLIC,               startLogin],
  ['GET  /auth/callback/:provider',            PUBLIC,               callback],       // HEAD -> 405
  ['POST /auth/signout',                       PUBLIC,               signout],        // RFC-0002 2.2: works after the session ended
  ['GET  /admin/',                             SIGNED_IN,            adminHome],      // private portal; tools follow the session permissions
  ['GET  /admin/account',                      SIGNED_IN,            accountPage],
  ['POST /admin/account/signout-everywhere',   SIGNED_IN,            revokeOwnSessions],
  // Packet 3
  ['GET  /admin/changes',                      'site:changes.read',  changesPage],
  ['POST /admin/changes',                      'site:changes.write', saveChange],
  ['POST /admin/changes/delete',               'site:changes.write', deleteChange],
  // Packet 4
  ['GET  /admin/people',                       'id:users.read',      peoplePage],
  ['POST /admin/people/add',                   'id:users.manage',    addPerson],        // RFC-0002 R3-4: replaces invites
  ['POST /admin/people/roles/grant',           'id:users.manage',    grantRole],
  ['POST /admin/people/roles/revoke',          'id:users.manage',    revokeRole],
  ['POST /admin/people/disable',               'id:users.manage',    disableUser],
  ['POST /admin/people/enable',                'id:users.manage',    enableUser],
  ['GET  /admin/roles',                        'id:users.read',      rolesPage],
  ['POST /admin/roles',                        'id:roles.manage',    saveRole],         // RFC-0002 8.2: non-privileged keys only
  ['GET  /admin/audit',                        'id:audit.read',      auditPage],
  // Packet 5. Removing a sign-in method has no page in v1: it is Seth's runbook step (RFC-0002 2.5, 8.4.9).
  ['POST /admin/account/add-google',           SIGNED_IN,            addGoogle,         { provider: 'google' }],  // session under 10 min
];

const METHODS = new Set(['GET', 'POST']);

export function compile(routes) {
  return routes.map((row, i) => {
    const [spec, access, handler, opts = {}] = row;
    const m = /^(\S+)\s+(\/\S*)$/.exec(String(spec || '').trim());
    if (!m || !METHODS.has(m[1])) throw new Error(`route ${i}: bad method/path`);
    const [, method, pattern] = m;
    const ok = access === PUBLIC || access === SIGNED_IN || (typeof access === 'string' && access in CATALOGUE);
    if (!ok) throw new Error(`route ${spec}: missing or unknown access slot`);
    if (access === PUBLIC && !pattern.startsWith('/auth/')) throw new Error(`route ${spec}: PUBLIC outside /auth/`);
    // app.js reads the session only under /admin, so a gated route anywhere else could never be reached.
    if (access !== PUBLIC && !pattern.startsWith('/admin/')) throw new Error(`route ${spec}: gated route outside /admin/`);
    if (typeof handler !== 'function') throw new Error(`route ${spec}: handler is not a function`);
    return { method, pattern, access, handler, provider: opts.provider || null, segments: pattern.split('/') };
  });
}

export const TABLE = compile(ROUTES);
const GITHUB_ONLY = TABLE.filter(r => r.provider === null);

// With Google off its rows are not in the table at all, so their paths answer like any unknown path (404 signed
// in, 303 to sign-in signed out) whatever the method.
export const tableFor = env => (googleEnabled(env) ? TABLE : GITHUB_ONLY);

function matchPath(segments, parts) {
  if (segments.length !== parts.length) return null;
  const params = {};
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s.startsWith(':')) {
      if (!parts[i]) return null;
      try { params[s.slice(1)] = decodeURIComponent(parts[i]); } catch { return null; }
    } else if (s !== parts[i]) {
      return null;
    }
  }
  return params;
}

// {route, params} | {methods} (path known, method not) | null. HEAD matches GET rows.
export function match(table, method, pathname) {
  const want = method === 'HEAD' ? 'GET' : method;
  const parts = pathname.split('/');
  const methods = new Set();
  for (const route of table) {
    const params = matchPath(route.segments, parts);
    if (!params) continue;
    if (route.method === want) return { route, params };
    methods.add(route.method);
  }
  return methods.size ? { methods: [...methods].sort() } : null;
}

// For a signed-out POST: the longest parameterless GET route that owns the form's path (RFC-0002 3.6).
export function ownerPage(table, pathname) {
  let best = '/admin/';
  for (const r of table) {
    if (r.method !== 'GET' || r.pattern.includes(':') || !r.pattern.startsWith('/admin/')) continue;
    const p = r.pattern;
    const owns = pathname === p || pathname.startsWith(p.endsWith('/') ? p : p + '/');
    if (owns && p.length > best.length) best = p;
  }
  return best;
}
