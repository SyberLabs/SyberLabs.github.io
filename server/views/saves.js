// Owned private backups. Payloads are downloaded as JSON, never executed or rendered as markup.
import { esc, html, redirect } from '../http.js';
import { page, head, time } from './layout.js';
import { APP_ORIGINS } from '../account-api.js';

export async function appReturn(ctx) {
  const app = ctx.url.searchParams.get('app');
  if (!Object.hasOwn(APP_ORIGINS, app)) return html(page(ctx, { title: 'Unknown app', body: `${head('Staff', 'Unknown app.')}<p>Choose Omni, RISE or Sketch from your portal.</p>` }), { status: 400 });
  return redirect(APP_ORIGINS[app] + '/');
}

const APPS = { omni: 'Omni', rise: 'RISE', sketch: 'Sketch' };
const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const savesUrl = (app = '', query = '') => {
  const params = new URLSearchParams();
  if (app) params.set('app', app);
  if (query) params.set('q', query);
  return '/admin/saves' + (params.size ? '?' + params.toString() : '');
};

export async function savedThings(ctx) {
  const requestedApp = (ctx.url.searchParams.get('app') || '').trim().toLowerCase();
  const app = Object.hasOwn(APPS, requestedApp) ? requestedApp : '';
  const query = (ctx.url.searchParams.get('q') || '').trim().slice(0, 100);
  const { results } = await ctx.env.DB.prepare('SELECT id, app, name, created_at, bytes FROM account_saves WHERE user_id = ? ORDER BY created_at DESC, id DESC').bind(ctx.user.id).all();
  const matching = results.filter(row => (!app || row.app === app) && row.name.toLowerCase().includes(query.toLowerCase()));
  const counts = Object.keys(APPS).map(key => [key, results.filter(row => row.app === key).length]);
  const tabs = [['', `All apps (${results.length})`], ...counts.map(([key, count]) => [key, `${APPS[key]} (${count})`])].map(([key, label]) => `<a href="${esc(savesUrl(key, query))}"${app === key ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const rows = matching.map(row => `<li class="saved-item" data-app="${esc(row.app)}"><div class="saved-item__copy"><span class="portal-kicker">${esc(APPS[row.app] || row.app)} / PRIVATE BACKUP</span><h2>${esc(row.name)}</h2><p class="saved-meta">${time(row.created_at)}<span>${size(row.bytes)}</span></p></div><div class="saved-item__actions"><a class="sy-btn sy-btn--line" href="/admin/return?app=${encodeURIComponent(row.app)}" aria-label="${esc(`Open ${APPS[row.app] || row.app} to restore ${row.name}`)}">Open ${esc(APPS[row.app] || row.app)} ↗</a><a class="saved-download" href="/admin/saves/${encodeURIComponent(row.id)}/download" aria-label="${esc(`Download ${row.name} as JSON`)}">Download JSON ↓</a></div></li>`).join('');
  const empty = results.length ? `<div class="sy-empty saved-empty"><h2>No matching backups.</h2><p>Try another name or app. Your ${results.length} saved ${results.length === 1 ? 'backup is' : 'backups are'} still in your account.</p><a class="sy-btn sy-btn--line" href="/admin/saves">Clear all filters</a></div>` : `<div class="sy-empty saved-empty"><h2>Your next idea starts here.</h2><p>No account backups yet. Open an app and choose Save to account when you want a private backup. Your browser saves stay in their apps.</p><div class="staff-actions">${Object.entries(APPS).map(([key, label]) => `<a class="sy-btn sy-btn--line" href="/admin/return?app=${key}">Open ${label} ↗</a>`).join('')}</div></div>`;
  const body = `<div class="saved-library">${head('Your private library', 'Saved things.')}<p class="sy-body staff-lede">Find the work you saved, then pick it up in the app that made it.</p>
    <div class="saved-overview"><span><strong>${results.length}</strong> ${results.length === 1 ? 'private backup' : 'private backups'}</span><span><strong>${size(results.reduce((total, row) => total + row.bytes, 0))}</strong> in your account</span></div>
    <nav class="saved-apps" aria-label="Filter backups by app">${tabs}</nav>
    <form class="saved-search" method="get" action="/admin/saves">${app ? `<input type="hidden" name="app" value="${app}">` : ''}<div><label for="backup-search">Find a backup by name</label><input class="sy-input" type="search" id="backup-search" name="q" value="${esc(query)}" maxlength="100" placeholder="Search your saved work"></div><button class="sy-btn sy-btn--line" type="submit">Search</button>${query ? `<a href="${esc(savesUrl(app))}">Clear search</a>` : ''}</form>
    <div class="saved-results"><h2>${app ? `${APPS[app]} backups` : 'All backups'}</h2><p>${matching.length} of ${results.length} ${results.length === 1 ? 'backup' : 'backups'}${query ? ` matching “${esc(query)}”` : ''} · newest first</p></div>
    ${rows ? `<ul class="saved-list">${rows}</ul>` : empty}
    <aside class="saved-guide"><span class="portal-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Restore in the app.</h2><p>Choose Open beside a backup, open Account in that app, then select the named backup and confirm Restore. Your browser work stays yours until you choose to restore.</p><p class="sy-small">Download JSON keeps an offline copy of the account backup. It is separate from the app’s own project download.</p></aside></div>`;
  return html(page(ctx, { title: 'Saved things', body, section: 'saves', compactFooter: true }));
}

export async function downloadSave(ctx) {
  const row = await ctx.env.DB.prepare('SELECT id, app, name, payload, created_at FROM account_saves WHERE id = ? AND user_id = ?').bind(ctx.params.id, ctx.user.id).first();
  if (!row) return html(page(ctx, { title: 'Not found', body: head('Your account', 'Backup not found.') }), { status: 404 });
  return new Response(JSON.stringify({ version: 1, save: { id: row.id, app: row.app, name: row.name, createdAt: row.created_at, payload: JSON.parse(row.payload) } }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${row.app}-backup-${row.id}.json"` } });
}
