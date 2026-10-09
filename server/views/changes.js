// /admin/changes (RFC-0002 2.6, 3.4): "What changed" from D1, newest first, behind site:changes.read; the
// Add/Edit form, Delete and their audit rows behind site:changes.write. Rows hold no user ids; who wrote
// what lives only in audit_events (update and delete keep the old row there).
import { esc, html, redirect, HttpError } from '../http.js';
import { newId } from '../crypto.js';
import { auditStmt } from '../authz.js';
import { page, head, alert, field, errorSummary, fixPrefix, postButton } from './layout.js';
import { confirmHtml, confirmed } from './confirm.js';

export const STATES = ['deployed', 'merged', 'decided', 'recorded', 'in progress'];
const LIMIT = 100;
const COLUMNS = 'id, date, project, state, title, text, href';

// The same rule as the change_entries CHECK, so code refuses what SQL would: https:// with a host, or a
// single-slash path; printable ASCII only; no quotes, angle brackets, backticks or backslashes.
export function validHref(raw) {
  if (typeof raw !== 'string') return null;
  const href = raw.trim();
  if (!href || href.length > 500 || /[^!-~]/.test(href) || /["'<>`\\]/.test(href)) return null;
  if (href.startsWith('/')) return href.startsWith('//') ? null : href;
  if (!href.startsWith('https://')) return null;
  try {
    const u = new URL(href);
    return u.protocol === 'https:' && u.hostname ? href : null;
  } catch {
    return null;
  }
}

const realDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export const LABELS = { date: 'Date', project: 'Project', state: 'State', title: 'Title', text: 'Text', href: 'Link' };
export const MESSAGES = {
  date: 'Use a date like 2026-10-09.',
  project: 'Projects are 1 to 60 characters.',
  state: 'Choose a state.',
  title: 'Titles are 1 to 160 characters.',
  text: n => `Text is at most 1,200 characters (you have ${n.toLocaleString('en-US')}).`,
  href: 'Links must start with https:// or a single /.',
};

// Validates one entry (form or import). Returns {entry, errors}; errors maps field -> message.
export function validateEntry(input) {
  const get = k => (typeof input[k] === 'string' ? input[k].trim() : input[k] == null ? '' : String(input[k]).trim());
  const entry = { date: get('date'), project: get('project'), state: get('state'), title: get('title'), text: get('text'), href: get('href') };
  const errors = {};
  if (!realDate(entry.date)) errors.date = MESSAGES.date;
  if (entry.project.length < 1 || entry.project.length > 60) errors.project = MESSAGES.project;
  if (!STATES.includes(entry.state)) errors.state = MESSAGES.state;
  if (entry.title.length < 1 || entry.title.length > 160) errors.title = MESSAGES.title;
  if (entry.text.length > 1200) errors.text = MESSAGES.text(entry.text.length);
  const href = validHref(entry.href);
  if (href === null) errors.href = MESSAGES.href;
  else entry.href = href;
  return { entry, errors };
}

const stateClass = s => `is-${s.replace(/\s+/g, '-')}`;
const fmtDate = d => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function changeRow(e, { write = false } = {}) {
  const actions = write ? `
        <div class="staff-change__actions">
          <a class="sy-btn sy-btn--ghost staff-btn--small" href="/admin/changes?edit=${encodeURIComponent(e.id)}#f-entry">Edit</a>
          ${postButton('/admin/changes/delete', 'Delete', { id: e.id }, 'sy-btn sy-btn--ghost staff-btn--small')}
        </div>` : '';
  return `<li class="staff-change">
      <time class="staff-change__date" datetime="${esc(e.date)}">${esc(fmtDate(e.date))}</time>
      <span class="staff-change__state ${esc(stateClass(e.state))}">${esc(e.state)}</span>
      <div class="staff-change__body">
        <p class="staff-change__project">${esc(e.project)}</p>
        <h2 class="staff-change__title"><a href="${esc(e.href)}">${esc(e.title)}</a></h2>
        ${e.text ? `<p class="staff-change__text">${esc(e.text)}</p>` : ''}${actions}
      </div>
    </li>`;
}

function entryForm(values = {}, errors = {}, editing = null) {
  const v = k => values[k] ?? '';
  // The top form, at id="f-entry", which every Edit link targets (RFC-0002 2.6).
  return `<section class="staff-section" id="f-entry" aria-labelledby="entry-h">
    <h2 class="sy-heading" id="entry-h">${editing ? 'Edit entry' : 'Add entry'}</h2>
    ${errorSummary(errors, LABELS)}
    <form method="post" action="/admin/changes" class="staff-form" novalidate>
      ${editing ? `<input type="hidden" name="id" value="${esc(editing)}">` : ''}
      <div class="staff-form__row">
        ${field({ name: 'date', label: LABELS.date, value: v('date'), error: errors.date, type: 'date', attrs: ' required' })}
        ${field({ name: 'project', label: LABELS.project, value: v('project'), error: errors.project, attrs: ' required maxlength="60"' })}
        ${field({ name: 'state', label: LABELS.state, value: v('state') || 'merged', error: errors.state, kind: 'select', options: STATES.map(s => [s, s]), attrs: ' required' })}
      </div>
      ${field({ name: 'title', label: LABELS.title, value: v('title'), error: errors.title, attrs: ' required maxlength="160"' })}
      ${field({ name: 'text', label: LABELS.text, value: v('text'), error: errors.text, kind: 'textarea', attrs: ' maxlength="1200" rows="4"' })}
      ${field({ name: 'href', label: LABELS.href, value: v('href'), error: errors.href, hint: 'https://… or a path like /plus/', attrs: ' required maxlength="500" inputmode="url" autocomplete="off"' })}
      <div class="staff-actions">
        <button class="sy-btn sy-btn--solid" type="submit">${editing ? 'Save changes' : 'Add entry'}</button>
        ${editing ? '<a class="staff-link" href="/admin/changes">Cancel edit</a>' : ''}
      </div>
    </form>
  </section>`;
}

async function listEntries(db) {
  const { results } = await db.prepare(`SELECT ${COLUMNS} FROM change_entries ORDER BY date DESC, created_at DESC LIMIT ?`)
    .bind(LIMIT).all();
  return results;
}

const NOTICES = { saved: 'Entry saved.', added: 'Entry added.', deleted: 'Entry deleted.' };

async function render(ctx, { values, errors = {}, editing = null, status = 200 }) {
  const write = ctx.perms.has('site:changes.write');
  const entries = await listEntries(ctx.env.DB);
  const done = ctx.url.searchParams.get('done');
  const notice = Object.hasOwn(NOTICES, done || '') && !Object.keys(errors).length ? alert('success', esc(NOTICES[done])) : '';
  const list = entries.length
    ? `<ol class="staff-changes">${entries.map(e => changeRow(e, { write })).join('')}</ol>`
    : `<div class="sy-empty staff-empty"><p>${write ? 'No entries yet. Add the first one above.' : 'No entries yet.'}</p></div>`;
  const body = `${head('Staff', 'What changed.')}
  ${notice}
  ${write ? entryForm(values, errors, editing) : ''}
  <section class="staff-section" aria-label="Entries">
    ${list}
  </section>`;
  return html(page(ctx, { title: `${fixPrefix(errors)}What changed`, body, section: 'changes' }), { status });
}

// GET /admin/changes[?edit=<id>]
export async function changesPage(ctx) {
  const editId = ctx.url.searchParams.get('edit');
  if (editId && ctx.perms.has('site:changes.write')) {
    const row = await ctx.env.DB.prepare(`SELECT ${COLUMNS} FROM change_entries WHERE id = ?`).bind(editId).first();
    if (!row) throw new HttpError('not_found');
    return render(ctx, { values: row, editing: row.id });
  }
  return render(ctx, {});
}

// POST /admin/changes: create, or update when the form carries id.
export async function saveChange(ctx) {
  const db = ctx.env.DB;
  const form = ctx.form;
  const id = form.get('id') || null;
  const input = Object.fromEntries(Object.keys(LABELS).map(k => [k, form.get(k) ?? '']));
  const { entry, errors } = validateEntry(input);
  if (Object.keys(errors).length) return render(ctx, { values: input, errors, editing: id, status: 422 });

  const audit = (action, targetId, detail) => auditStmt(db, {
    at: ctx.now, actor: ctx.user.id, action, targetType: 'change_entry', targetId, detail, request: ctx.request, when: ['changes() = 1'],
  });
  if (id) {
    const before = await db.prepare(`SELECT ${COLUMNS} FROM change_entries WHERE id = ?`).bind(id).first();
    if (!before) throw new HttpError('not_found');
    await db.batch([
      db.prepare('UPDATE change_entries SET date = ?, project = ?, state = ?, title = ?, text = ?, href = ? WHERE id = ?')
        .bind(entry.date, entry.project, entry.state, entry.title, entry.text, entry.href, id),
      audit('changes.update', id, { before }),
    ]);
    return redirect('/admin/changes?done=saved');
  }
  const newEntry = newId();
  await db.batch([
    db.prepare('INSERT INTO change_entries (id, date, project, state, title, text, href, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newEntry, entry.date, entry.project, entry.state, entry.title, entry.text, entry.href, ctx.now),
    audit('changes.create', newEntry, { date: entry.date, project: entry.project, title: entry.title }),
  ]);
  return redirect('/admin/changes?done=added');
}

// POST /admin/changes/delete. A hard delete (RFC-0002 5.1): the audit row keeps the whole entry.
// Confirm first (RFC-0002 2.4, 3.5): only the second POST, with confirm=1, deletes.
export async function deleteChange(ctx) {
  const db = ctx.env.DB;
  const id = ctx.form.get('id') || '';
  const before = await db.prepare(`SELECT ${COLUMNS} FROM change_entries WHERE id = ?`).bind(id).first();
  if (!before) throw new HttpError('not_found');
  if (!confirmed(ctx)) {
    return html(confirmHtml(ctx, {
      title: 'Delete entry',
      lines: [`Delete "${esc(before.title)}"? The audit log keeps a copy.`],
      action: '/admin/changes/delete',
      fields: { id },
      submitLabel: 'Delete entry',
      cancel: '/admin/changes',
      section: 'changes',
    }));
  }
  await db.batch([
    db.prepare('DELETE FROM change_entries WHERE id = ?').bind(id),
    auditStmt(db, { at: ctx.now, actor: ctx.user.id, action: 'changes.delete', targetType: 'change_entry', targetId: id, detail: { before }, request: ctx.request, when: ['changes() = 1'] }),
  ]);
  return redirect('/admin/changes?done=deleted');
}
