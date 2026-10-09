// /admin/people (RFC-0002 2.6): one list item per person at every width (no tables: the site layer's
// overflow-x: clip would cut a wide table's controls off at 375 px), Add person, and every action on them.
// Every action here needs id:users.manage, which only admin holds, and admin holds every key, so no up or
// target rule applies (RFC-0002 2.4). The lockout rule lives inside each write (authz.js). Refusals change
// no row and answer 403. Every action confirms first: only the second POST, with confirm=1, acts.
import { esc, html, redirect } from '../http.js';
import { newId } from '../crypto.js';
import { GUARD_COPY, auditStmt, can, disableUserStmts, identityName, revokeRoleStmt } from '../authz.js';
import { LOGIN_RE, lookupLogin } from '../github.js';
import { confirmHtml, confirmed, actingAs } from './confirm.js';
import { alert, errorSummary, field, fixPrefix, head, hidden, page, postButton, time } from './layout.js';

const GITHUB_ID = /^[1-9][0-9]{0,19}$/;
const ACTION_BTN = 'sy-btn sy-btn--line staff-person__btn';

const NOTICES = {
  added: 'Person added.',
  granted: 'Role granted.',
  revoked: 'Role revoked. It takes effect on their next request.',
  disabled: 'Account turned off. Their sessions have ended.',
  enabled: 'Account turned on.',
};

// The first sign-in method names a person (RFC-0002 2.6); last is their latest sign-in by any method.
const FIRST_IDENTITY = '(SELECT id FROM identities WHERE user_id = u.id ORDER BY created_at, id LIMIT 1)';
const LAST_SIGNIN = '(SELECT max(last_login_at) FROM identities WHERE user_id = u.id)';

async function roleById(db, id) {
  if (!id) return null;
  return db.prepare('SELECT id, name, is_system FROM roles WHERE id = ?').bind(String(id)).first();
}

async function userById(db, id) {
  if (!id) return null;
  return db.prepare(`SELECT u.id, u.disabled_at, i.provider, i.login, i.subject, i.email, ${LAST_SIGNIN} AS last_login_at
      FROM users u LEFT JOIN identities i ON i.id = ${FIRST_IDENTITY} WHERE u.id = ?`).bind(String(id)).first();
}

// "@sykosyber (GitHub id 132870419)": every confirm page names its target with both, so two accounts that
// once shared a login cannot be confused (RFC-0002 3.5).
const fullName = p => (p.provider !== 'google' && p.login ? `@${p.login} (GitHub id ${p.subject})` : identityName(p));

// "Admins left after this: @sdcarlson; GitHub id N (never signed in)." (RFC-0002 2.4, 3.5)
async function adminsLeftLine(db, userId) {
  const { results } = await db.prepare(`SELECT i.provider, i.login, i.subject, i.email, ${LAST_SIGNIN} AS last_login_at
      FROM admins a JOIN users u ON u.id = a.user_id LEFT JOIN identities i ON i.id = ${FIRST_IDENTITY}
     WHERE a.user_id <> ?1 ORDER BY i.login, i.subject`).bind(userId).all();
  const names = results.map(a => `${identityName(a)}${a.last_login_at ? '' : ' (never signed in)'}`);
  return esc(`Admins left after this: ${names.length ? names.join('; ') : 'none'}.`);
}

async function loadPeople(db) {
  const [users, identities, grants, roles] = await Promise.all([
    db.prepare('SELECT id, disabled_at, created_at FROM users ORDER BY created_at, id').all(),
    db.prepare('SELECT id, user_id, provider, subject, login, email, created_at, last_login_at FROM identities ORDER BY created_at, id').all(),
    db.prepare(`SELECT ur.user_id, ur.role_id, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      ORDER BY r.is_system DESC, r.name`).all(),
    db.prepare('SELECT id, name, is_system FROM roles ORDER BY is_system DESC, name').all(),
  ]);
  return { users: users.results, identities: identities.results, grants: grants.results, roles: roles.results };
}

// "GitHub @login" or "Google you@example.com". There is no Remove button: removing a method is Seth's runbook
// step (RFC-0002 2.5, 8.4.9).
const methodLabel = i => (i.provider === 'google' ? `Google ${identityName(i)}`
  : i.login ? `GitHub @${i.login}` : `GitHub id ${i.subject}`);

function personItem(ctx, u, data, manage) {
  const ids = data.identities.filter(i => i.user_id === u.id);
  const grants = data.grants.filter(g => g.user_id === u.id);
  const last = Math.max(0, ...ids.map(i => i.last_login_at || 0));
  const self = u.id === ctx.user.id;
  const grantable = data.roles.filter(r => !grants.some(g => g.role_id === r.id));
  const actions = !manage ? '' : `
      <div class="staff-person__actions">
        ${grants.map(g => postButton('/admin/people/roles/revoke', `Revoke ${g.name}`, { user: u.id, role: g.role_id }, ACTION_BTN)).join('\n        ')}
        ${grantable.length ? `<form method="post" action="/admin/people/roles/grant" class="staff-person__grant">${hidden({ user: u.id })}
          <label class="sy-field__label" for="grant-${esc(u.id)}">Role to grant</label>
          <select class="sy-input staff-select" id="grant-${esc(u.id)}" name="role">${grantable.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select>
          <button class="${ACTION_BTN}" type="submit">Grant</button></form>` : ''}
        ${u.disabled_at ? postButton('/admin/people/enable', 'Turn on', { user: u.id }, ACTION_BTN)
          : self ? '' : postButton('/admin/people/disable', 'Turn off', { user: u.id }, ACTION_BTN)}
      </div>`;
  return `<li class="staff-person">
      <h3 class="sy-h3 staff-person__name">${esc(identityName(ids[0]))}${self ? ' <span class="sy-small">(you)</span>' : ''}</h3>
      <dl class="staff-dl">
        <div><dt>Sign-in methods</dt><dd>${ids.map(i => esc(methodLabel(i))).join('; ') || 'none'}</dd></div>
        <div><dt>Roles</dt><dd>${grants.map(g => esc(g.name)).join(', ') || 'none'}</dd></div>
        <div><dt>Last sign-in</dt><dd>${last ? time(last) : 'never signed in'}</dd></div>
        <div><dt>Status</dt><dd>${u.disabled_at ? 'Turned off' : 'Active'}</dd></div>
      </dl>${actions}
    </li>`;
}

const ADD_LABELS = { account: 'GitHub username or id', role: 'Role' };

function addForm(ctx, data, values, errors) {
  const roles = data.roles.map(r => [r.id, r.name]);
  const fallback = (data.roles.find(r => r.is_system !== 1) || data.roles[0] || {}).id;
  return `<section class="staff-section" aria-labelledby="add-h">
    <h2 id="add-h" class="sy-h3">Add person</h2>
    <p class="sy-small">Added people sign in at ${esc(ctx.env.ORIGIN)}/admin/ with GitHub.</p>
    <form method="post" action="/admin/people/add" class="staff-form" novalidate>
      ${field({ name: 'account', label: ADD_LABELS.account, value: values.account, error: errors.account, errorHtml: errors.accountHtml,
        hint: 'A username is looked up once. A numeric id is used as typed.', attrs: ' required maxlength="40" autocomplete="off" spellcheck="false"' })}
      ${field({ name: 'role', label: ADD_LABELS.role, kind: 'select', options: roles, value: values.role || fallback, error: errors.role, attrs: ' required' })}
      <button class="sy-btn sy-btn--solid" type="submit">Add person</button>
    </form>
  </section>`;
}

// The page, with an optional notice (trusted HTML) and the Add person form's values and errors.
export async function renderPeople(ctx, { status = 200, notice = '', values = {}, errors = {} } = {}) {
  const data = await loadPeople(ctx.env.DB);
  const manage = can(ctx, 'id:users.manage');
  const ok = NOTICES[ctx.url.searchParams.get('ok')];
  const lonely = data.users.length <= 1 && manage;
  const fields = Object.fromEntries(Object.keys(errors).filter(k => k !== 'accountHtml').map(k => [k, true]));
  if (errors.accountHtml) fields.account = true;
  const body = `${head('Staff', 'People.')}
  ${notice || (ok ? alert('success', esc(ok)) : '')}
  ${errorSummary(fields, ADD_LABELS)}
  ${lonely ? '<div class="sy-empty staff-empty"><p>Only you so far. Add someone below.</p></div>' : ''}
  <ul class="staff-people">${data.users.map(u => personItem(ctx, u, data, manage)).join('')}</ul>
  ${manage ? addForm(ctx, data, values, errors) : ''}`;
  return html(page(ctx, { title: `${fixPrefix(fields)}People`, body, section: 'people' }), { status });
}

export const peoplePage = ctx => renderPeople(ctx);

const refuse = (ctx, copy) => renderPeople(ctx, { status: 403, notice: alert('danger', esc(copy)) });
const done = code => redirect(`/admin/people?ok=${code}`);
const confirmPage = (ctx, opts) => html(confirmHtml(ctx, { cancel: '/admin/people', section: 'people', ...opts }));
const gone = (ctx, what) => renderPeople(ctx, { status: 404, notice: alert('warning', `That ${what} no longer exists.`) });

const ADMIN_LINE = 'Admin can add people, grant and revoke roles, turn accounts off and on, and create roles.';

// ---- add person ------------------------------------------------------------------------------------
// RFC-0002 2.5: no invites. An admin adds the person's GitHub identity directly (8.1), and their first
// sign-in is the ordinary known-identity case.

// RFC-0002 3.4 copy. name has passed LOGIN_RE, so it is letters, digits and hyphens only.
const ADD_COPY = {
  format: 'Enter a GitHub username (1 to 39 letters, digits or hyphens) or a numeric GitHub id.',
  missing: name => `No GitHub account is called @${name}. Check the spelling.`,
  down: name => {
    const url = `https://api.github.com/users/${encodeURIComponent(name)}`;
    return `GitHub didn't answer the username lookup. Open <a href="${esc(url)}">${esc(url)}</a> and enter the "id" it shows instead.<br>Or run <code>gh api users/${esc(name)} --jq .id</code>.`;
  },
  taken: who => `${who} already has a SyberLabs account.`,
};

export async function addPerson(ctx) {
  const { env, form, now, user } = ctx;
  const db = env.DB;
  const values = { account: (form.get('account') || '').trim(), role: (form.get('role') || '').trim() };
  const errors = {};
  const invalid = () => renderPeople(ctx, { status: 422, values, errors });

  const role = await roleById(db, values.role);
  if (!role) { errors.role = 'Choose a role.'; return invalid(); }

  // One field: digits are an id (never looked up), anything else must be a username (looked up once).
  // Anything that is neither is refused without a fetch. A leading @ is dropped, as people paste it.
  const raw = values.account.replace(/^@/, '');
  let subject;
  let login = null;
  if (/^[0-9]+$/.test(raw)) {
    if (!GITHUB_ID.test(raw)) { errors.account = ADD_COPY.format; return invalid(); }
    subject = raw;
    // The confirm page re-posts the id with the login it showed, so confirming makes no second lookup.
    const shown = form.get('login') || '';
    if (confirmed(ctx) && LOGIN_RE.test(shown)) login = shown;
  } else if (LOGIN_RE.test(raw)) {
    const found = await lookupLogin(raw);
    if (found === 'missing') { errors.account = ADD_COPY.missing(raw); return invalid(); }
    if (!found) { errors.accountHtml = ADD_COPY.down(raw); return invalid(); }
    subject = found.id;
    login = found.login;
  } else {
    errors.account = ADD_COPY.format;
    return invalid();
  }
  const who = login ? `@${login}` : `GitHub id ${subject}`;

  if (!confirmed(ctx)) {
    const target = login ? `@${login}, GitHub id ${subject},` : `GitHub id ${subject} (username not checked)`;
    return confirmPage(ctx, {
      title: `Add ${target} as ${role.name}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are adding ${esc(login ? `@${login} (GitHub id ${subject})` : target)} as <strong>${esc(role.name)}</strong>.`,
        ...(role.is_system === 1 ? [esc(ADMIN_LINE)] : [])],
      action: '/admin/people/add',
      fields: { account: subject, login: login || '', role: role.id },
      submitLabel: `Add ${who}`,
    });
  }

  // RFC-0002 8.1: one batch, so UNIQUE (provider, subject) refusing an id that already has an account
  // rolls back all four statements. users.display_name (live schema, NOT NULL) only mirrors the identity.
  const userId = newId();
  try {
    await db.batch([
      db.prepare('INSERT INTO users (id, display_name, created_at) VALUES (?1, ?2, ?3)').bind(userId, login || who, now),
      db.prepare(`INSERT INTO identities (id, user_id, provider, subject, login, created_at)
        VALUES (?1, ?2, 'github', ?3, ?4, ?5)`).bind(newId(), userId, subject, login, now),
      db.prepare('INSERT INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(userId, role.id, user.id, now),
      auditStmt(db, { at: now, actor: user.id, action: 'user.add', targetType: 'user', targetId: userId, request: ctx.request,
        detail: { role: role.id } }),
    ]);
  } catch (err) {
    if (!/UNIQUE/.test(String(err && err.message))) throw err;
    errors.account = ADD_COPY.taken(who);
    return invalid();
  }
  return done('added');
}

// ---- roles on people ---------------------------------------------------------------------------

async function personAndRole(ctx) {
  const db = ctx.env.DB;
  const [target, role] = await Promise.all([userById(db, ctx.form.get('user')), roleById(db, ctx.form.get('role'))]);
  return { target, role };
}

export async function grantRole(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const { target, role } = await personAndRole(ctx);
  if (!target || !role) return gone(ctx, 'person or role');
  // Already held: nothing to do. The adjacent audit checks the write itself, including concurrent repeats.
  const held = await db.prepare('SELECT 1 AS x FROM user_roles WHERE user_id = ? AND role_id = ?').bind(target.id, role.id).first();
  if (held) return done('granted');
  if (!confirmed(ctx)) {
    return confirmPage(ctx, {
      title: `Grant ${role.name} to ${identityName(target)}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are granting <strong>${esc(role.name)}</strong> to ${esc(fullName(target))}.`,
        ...(role.is_system === 1 ? [esc(ADMIN_LINE)] : [])],
      action: '/admin/people/roles/grant',
      fields: { user: target.id, role: role.id },
      submitLabel: `Grant ${role.name} to ${identityName(target)}`,
    });
  }
  await db.batch([
    db.prepare(`INSERT INTO user_roles (user_id, role_id, granted_by, granted_at) SELECT ?1, ?2, ?3, ?4
       WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = ?1 AND role_id = ?2)`).bind(target.id, role.id, user.id, now),
    auditStmt(db, { at: now, actor: user.id, action: 'role.grant', targetType: 'user', targetId: target.id, request: ctx.request,
      detail: { role: role.id }, when: ['changes() = 1'] }),
  ]);
  return done('granted');
}

export async function revokeRole(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const { target, role } = await personAndRole(ctx);
  if (!target || !role) return gone(ctx, 'person or role');
  const held = await db.prepare('SELECT 1 AS x FROM user_roles WHERE user_id = ? AND role_id = ?').bind(target.id, role.id).first();
  if (!held) return done('revoked');
  if (!confirmed(ctx)) {
    return confirmPage(ctx, {
      title: `Revoke ${role.name} from ${identityName(target)}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are revoking <strong>${esc(role.name)}</strong> from ${esc(fullName(target))}.`,
        ...(role.id === 'role_admin' ? [await adminsLeftLine(db, target.id)] : [])],
      action: '/admin/people/roles/revoke',
      fields: { user: target.id, role: role.id },
      submitLabel: `Revoke ${role.name} from ${identityName(target)}`,
    });
  }
  const [res] = await db.batch([
    revokeRoleStmt(db, { userId: target.id, roleId: role.id }),
    auditStmt(db, { at: now, actor: user.id, action: 'role.revoke', targetType: 'user', targetId: target.id, request: ctx.request,
      detail: { role: role.id }, when: ['changes() = 1'] }),
  ]);
  if (res.meta.changes !== 1) return refuse(ctx, GUARD_COPY.lockout);
  return done('revoked');
}

// ---- accounts ----------------------------------------------------------------------------------

const isAdmin = async (db, userId) => Boolean(await db.prepare(
  "SELECT 1 AS x FROM user_roles WHERE user_id = ? AND role_id = 'role_admin'").bind(userId).first());

export async function disableUser(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const target = await userById(db, ctx.form.get('user'));
  if (!target) return gone(ctx, 'person');
  if (target.id === user.id) return refuse(ctx, GUARD_COPY.self);
  if (target.disabled_at) return done('disabled');
  if (!confirmed(ctx)) {
    return confirmPage(ctx, {
      title: `Turn off ${identityName(target)}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are turning off ${esc(fullName(target))}'s account. Their sessions end now.`,
        ...(await isAdmin(db, target.id) ? [await adminsLeftLine(db, target.id)] : [])],
      action: '/admin/people/disable',
      fields: { user: target.id },
      submitLabel: `Turn off ${identityName(target)}`,
    });
  }
  const [res] = await db.batch(disableUserStmts(db, { userId: target.id, actorId: user.id, now, request: ctx.request }));
  if (res.meta.changes !== 1) return refuse(ctx, GUARD_COPY.lockout);
  return done('disabled');
}

export async function enableUser(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const target = await userById(db, ctx.form.get('user'));
  if (!target) return gone(ctx, 'person');
  if (!target.disabled_at) return done('enabled');
  if (!confirmed(ctx)) {
    // Turning admin back on restores full authority, so that confirm page says so (RFC-0002 2.4).
    const admin = await isAdmin(db, target.id);
    return confirmPage(ctx, {
      title: `Turn on ${identityName(target)}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are turning on ${esc(fullName(target))}'s account${admin ? ', which holds <strong>admin</strong>' : ''}.`,
        ...(admin ? [esc(ADMIN_LINE)] : [])],
      action: '/admin/people/enable',
      fields: { user: target.id },
      submitLabel: `Turn on ${identityName(target)}`,
    });
  }
  await db.batch([
    db.prepare('UPDATE users SET disabled_at = NULL WHERE id = ? AND disabled_at = ?').bind(target.id, target.disabled_at),
    auditStmt(db, { at: now, actor: user.id, action: 'user.enable', targetType: 'user', targetId: target.id, request: ctx.request,
      when: ['changes() = 1'] }),
  ]);
  return done('enabled');
}
