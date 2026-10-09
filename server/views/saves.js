// Owned private backups. Payloads are downloaded as JSON, never executed or rendered as markup.
import { esc, html, redirect } from '../http.js';
import { page, head, time } from './layout.js';
import { APP_ORIGINS } from '../account-api.js';

export async function appReturn(ctx) {
  const app = ctx.url.searchParams.get('app');
  if (!Object.hasOwn(APP_ORIGINS, app)) return html(page(ctx, { title: 'Unknown app', body: `${head('Staff', 'Unknown app.')}<p>Choose Omni or RISE from your portal.</p>` }), { status: 400 });
  return redirect(APP_ORIGINS[app] + '/');
}

export async function savedThings(ctx) {
  const { results } = await ctx.env.DB.prepare('SELECT id, app, name, created_at, bytes FROM account_saves WHERE user_id = ? ORDER BY created_at DESC, id DESC').bind(ctx.user.id).all();
  const rows = results.map(row => `<li class="saved-item"><div><span class="portal-kicker">${row.app === 'omni' ? 'OMNI' : 'RISE'} / PRIVATE BACKUP</span><h2>${esc(row.name)}</h2><p class="sy-small">${time(row.created_at)} · ${Math.ceil(row.bytes / 1024)} KB</p></div><a class="sy-btn sy-btn--ghost" href="/admin/saves/${encodeURIComponent(row.id)}/download">Download JSON</a></li>`).join('');
  const body = `${head('Your account', 'Saved things.')}<p class="sy-body staff-lede">Private backups you explicitly saved from Omni and RISE. Open the app to save or restore your work.</p><div class="staff-actions"><a class="sy-btn sy-btn--line" href="https://omni.syberlabs.io/">Open Omni ↗</a><a class="sy-btn sy-btn--line" href="https://rise.syberlabs.io/">Open RISE ↗</a></div>${rows ? `<ul class="saved-list">${rows}</ul>` : '<div class="sy-empty"><p>No account backups yet. Your existing browser saves stay in their apps until you choose Save to account.</p></div>'}`;
  return html(page(ctx, { title: 'Saved things', body, section: 'saves', compactFooter: true }));
}

export async function downloadSave(ctx) {
  const row = await ctx.env.DB.prepare('SELECT id, app, name, payload, created_at FROM account_saves WHERE id = ? AND user_id = ?').bind(ctx.params.id, ctx.user.id).first();
  if (!row) return html(page(ctx, { title: 'Not found', body: head('Your account', 'Backup not found.') }), { status: 404 });
  return new Response(JSON.stringify({ version: 1, save: { id: row.id, app: row.app, name: row.name, createdAt: row.created_at, payload: JSON.parse(row.payload) } }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${row.app}-backup-${row.id}.json"` } });
}
