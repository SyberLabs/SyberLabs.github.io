// The one route table. Deny by default: a path that is not here is refused, and a row without a valid
// access slot throws when this module loads. PUBLIC is allowed only under /auth/.
import { CATALOGUE, PUBLIC, SIGNED_IN } from './permissions.js';
import { signinPage } from './views/signin.js';
import { startLogin, callback } from './oauth.js';
import { signout, revokeOwnSessions } from './session.js';
import { adminHome } from './views/admin-home.js';
import { accountPage } from './views/account.js';
import { changesPage, saveChange, deleteChange } from './views/changes.js';
import {
  peoplePage, createInvite, revokeInvite, grantRole, revokeRole, removeIdentity, disableUser, enableUser,
  revokeUserSessions,
} from './views/people.js';
import { rolesPage, saveRole } from './views/roles.js';
import { auditPage } from './views/audit.js';

// [method path, access, handler]; access = PUBLIC | SIGNED_IN | '<permission key>'. Each handler decides
// for itself whether an action needs a confirm page first (views/confirm.js confirmed), and ownerPage()
// derives a POST's owning page, so the RFC's opts column has nothing to carry here.
// No /api/* routes: RFC-0002 R1-8 removed the JSON API, which had no consumer.
export const ROUTES = [
  // Packet 2
  ['GET  /auth/signin',                        PUBLIC,               signinPage],
  ['POST /auth/start/:provider',               PUBLIC,               startLogin],
  ['GET  /auth/callback/:provider',            PUBLIC,               callback],       // HEAD -> 405
  ['POST /auth/signout',                       SIGNED_IN,            signout],
  ['GET  /admin/',                             SIGNED_IN,            adminHome],      // tiles filtered by perms
  ['GET  /admin/account',                      SIGNED_IN,            accountPage],
  ['POST /admin/account/signout-everywhere',   SIGNED_IN,            revokeOwnSessions],
  // Packet 3
  ['GET  /admin/changes',                      'site:changes.read',  changesPage],
  ['POST /admin/changes',                      'site:changes.write', saveChange],
  ['POST /admin/changes/delete',               'site:changes.write', deleteChange],
  // Packet 4
  ['GET  /admin/people',                       'id:users.read',      peoplePage],
  ['POST /admin/people/invite',                'id:users.manage',    createInvite],
  ['POST /admin/people/invite/revoke',         'id:users.manage',    revokeInvite],
  ['POST /admin/people/roles/grant',           'id:users.manage',    grantRole],
  ['POST /admin/people/roles/revoke',          'id:users.manage',    revokeRole],
  ['POST /admin/people/identity/remove',       'id:users.manage',    removeIdentity],
  ['POST /admin/people/disable',               'id:users.manage',    disableUser],
  ['POST /admin/people/enable',                'id:users.manage',    enableUser],       // RFC-0002 8.2: no confirm
  ['POST /admin/people/sessions/revoke',       'id:users.manage',    revokeUserSessions],
  ['GET  /admin/roles',                        'id:users.read',      rolesPage],
  ['POST /admin/roles',                        'id:roles.manage',    saveRole],         // RFC-0002 8.2: non-privileged keys only
  ['GET  /admin/audit',                        'id:audit.read',      auditPage],
];

const METHODS = new Set(['GET', 'POST']);

export function compile(routes) {
  return routes.map((row, i) => {
    const [spec, access, handler] = row;
    const m = /^(\S+)\s+(\/\S*)$/.exec(String(spec || '').trim());
    if (!m || !METHODS.has(m[1])) throw new Error(`route ${i}: bad method/path`);
    const [, method, pattern] = m;
    const ok = access === PUBLIC || access === SIGNED_IN || (typeof access === 'string' && access in CATALOGUE);
    if (!ok) throw new Error(`route ${spec}: missing or unknown access slot`);
    if (access === PUBLIC && !pattern.startsWith('/auth/')) throw new Error(`route ${spec}: PUBLIC outside /auth/`);
    if (typeof handler !== 'function') throw new Error(`route ${spec}: handler is not a function`);
    return { method, pattern, access, handler, segments: pattern.split('/') };
  });
}

export const TABLE = compile(ROUTES);

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
