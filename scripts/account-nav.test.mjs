import { test } from 'node:test';
import assert from 'node:assert/strict';
import { account } from '../src/site/account.js';

class Events {
  listeners = new Map();
  addEventListener(name, fn) { const list = this.listeners.get(name) || []; list.push(fn); this.listeners.set(name, list); }
  dispatch(name) { return Promise.all((this.listeners.get(name) || []).map(fn => fn())); }
}
function fixture() {
  const doc = new Events();
  const win = new Events();
  const nodes = Object.fromEntries(['sy-account-link', 'sy-account-label', 'sy-account-member', 'sy-account-avatar', 'sy-account-initial'].map(key => [key, {
    hidden: key === 'sy-account-member', textContent: '', attrs: {},
    setAttribute(key, value) { this.attrs[key] = value; }, removeAttribute(key) { delete this.attrs[key]; },
  }]));
  const host = { dataset: {}, ownerDocument: doc, querySelector: selector => nodes[selector.slice(1)] };
  doc.querySelector = selector => selector === '.sy-account' ? host : null;
  doc.visibilityState = 'visible'; doc.defaultView = win;
  const requests = [];
  const timers = new Map(); let timerId = 0;
  win.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  win.clearTimeout = id => timers.delete(id);
  win.fetch = (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
  return { doc, win, nodes, host, requests, timers };
}
const response = (status, data) => ({ status, ok: status === 200, json: async () => data });
const signedIn = label => response(200, { version: 1, user: { id: 'private-id', label } });
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('an unresolved session offers Account and says Sign in only after a confirmed 401', async () => {
  const f = fixture(); account(f.doc);
  assert.equal(f.host.dataset.accountState, 'checking');
  assert.equal(f.nodes['sy-account-label'].textContent, 'Account');
  assert.equal(f.nodes['sy-account-link'].hidden, false);
  assert.equal(f.nodes['sy-account-member'].hidden, true);
  f.requests[0].resolve(response(401)); await settle();
  assert.equal(f.host.dataset.accountState, 'signed-out');
  assert.equal(f.nodes['sy-account-label'].textContent, 'Sign in');
});

test('initial server, malformed, connection and timeout failures leave a usable neutral Account', async () => {
  for (const failure of ['server', 'malformed', 'connection', 'timeout']) {
    const f = fixture(); account(f.doc);
    if (failure === 'server') f.requests[0].resolve(response(503));
    if (failure === 'malformed') f.requests[0].resolve(response(200, { version: 1, user: null }));
    if (failure === 'connection') f.requests[0].reject(new Error('offline'));
    if (failure === 'timeout') {
      for (const fn of f.timers.values()) fn();
      f.requests[0].resolve(response(401));
    }
    await settle();
    assert.equal(f.host.dataset.accountState, 'checking', failure);
    assert.equal(f.nodes['sy-account-label'].textContent, 'Account', failure);
    assert.equal(f.nodes['sy-account-link'].hidden, false, failure);
    assert.equal(f.nodes['sy-account-member'].hidden, true, failure);
    assert.equal(f.timers.size, 0, failure);
  }
});

test('initial validation uses a private uncached cookie request and safe profile text', async () => {
  const f = fixture(); account(f.doc);
  assert.equal(f.requests[0].url, '/admin/api/v1/account');
  assert.equal(f.requests[0].options.credentials, 'same-origin');
  assert.equal(f.requests[0].options.cache, 'no-store');
  f.requests[0].resolve(signedIn('@<script>')); await settle();
  assert.equal(f.nodes['sy-account-link'].hidden, true);
  assert.equal(f.host.dataset.accountState, 'signed-in');
  assert.equal(f.nodes['sy-account-member'].hidden, false);
  assert.equal(f.nodes['sy-account-initial'].textContent, '<');
  assert.equal(f.nodes['sy-account-avatar'].attrs['aria-label'], 'Profile: @<script>');
  assert.equal(f.timers.size, 0);
  account(f.doc); assert.equal(f.requests.length, 1, 'boot is idempotent');
});

test('browser back refreshes signed-out HTML after login and validates sign-out after focus', async () => {
  const f = fixture(); account(f.doc);
  f.requests[0].resolve(response(401)); await settle();
  const back = f.win.dispatch('pageshow');
  f.requests[1].resolve(signedIn('@seth')); await back;
  assert.equal(f.nodes['sy-account-member'].hidden, false);
  const focus = f.win.dispatch('focus');
  f.requests[2].resolve(response(401)); await focus;
  assert.equal(f.nodes['sy-account-link'].hidden, false);
  assert.equal(f.nodes['sy-account-label'].textContent, 'Sign in');
  assert.equal(f.nodes['sy-account-member'].hidden, true);
  assert.equal(f.nodes['sy-account-initial'].textContent, '');
});

test('visibility refresh waits until visible and old requests cannot overwrite new identity', async () => {
  const f = fixture(); account(f.doc);
  f.doc.visibilityState = 'hidden'; await f.doc.dispatch('visibilitychange');
  assert.equal(f.requests.length, 1);
  f.doc.visibilityState = 'visible'; const visible = f.doc.dispatch('visibilitychange');
  assert.equal(f.requests[0].options.signal.aborted, true);
  f.requests[1].resolve(signedIn('@new')); await visible;
  f.requests[0].resolve(response(401)); await settle();
  assert.equal(f.nodes['sy-account-member'].hidden, false);
  assert.equal(f.nodes['sy-account-avatar'].attrs['title'], 'Profile: @new');
});

test('transient server failures, malformed replies and timeout preserve validated state', async () => {
  const f = fixture(); const refresh = account(f.doc);
  f.requests[0].resolve(signedIn('@seth')); await settle();
  for (const result of [response(503), response(200, { version: 1, user: null })]) {
    const pending = refresh(); f.requests.at(-1).resolve(result); await pending;
    assert.equal(f.nodes['sy-account-member'].hidden, false);
    assert.equal(f.host.dataset.accountState, 'signed-in');
  }
  let pending = refresh(); f.requests.at(-1).reject(new Error('offline')); await pending;
  assert.equal(f.nodes['sy-account-member'].hidden, false);
  pending = refresh(); for (const fn of f.timers.values()) fn();
  assert.equal(f.requests.at(-1).options.signal.aborted, true);
  f.requests.at(-1).resolve(response(401)); await pending;
  assert.equal(f.nodes['sy-account-member'].hidden, false);
});

// Public visitors must never mistake the restricted staff login for their subscription account.
test('public navigation routes subscribers to RISE and labels staff access separately', async () => {
  const { header, footer } = await import('../projects/project-template.js');
  const publicHeader = header();
  assert.match(footer(), /href="https:\/\/rise\.syberlabs\.io\/plus\/">Subscriber account[\s\S]*?<\/a>/);
  assert.doesNotMatch(publicHeader, /href="\/admin(?:\/|"|\?)/);
  assert.match(footer(), /href="\/admin\/">Staff sign in<\/a>/);
});


test('static chrome derives current navigation from routes, repairing missing and stale labels', async () => {
  const { applyChrome } = await import('./site-chrome.mjs');
  const { header, footer } = await import('../projects/project-template.js');
  for (const [file, expected] of [
    ['mateo/index.html', null], ['plus/index.html', null],
    ['services/index.html', null], ['projects/rise/index.html', null],
    ['projects/syberwork/index.html', '/#work'],
    ['research/index.html', null], ['404.html', null],
  ]) {
    for (const prior of ['', 'services', 'mateo', 'plus', 'projects']) {
      const html = header(prior).replace('href="#main"', 'href="#content"') + '<main id="content"></main>' + footer();
      const generated = applyChrome(html, file);
      // The header row only; the Menu inside the header marks the page's own link separately (next test).
      const primary = generated.match(/<nav class="sy-nav"[\s\S]*?<\/nav>/)[0];
      const current = [...primary.matchAll(/<a href="([^"]+)" aria-current="page"/g)].map(match => match[1]);
      assert.deepEqual(current, expected ? [expected] : [], `${file} previously ${prior}`);
      if (['mateo/index.html', 'services/index.html', 'projects/rise/index.html'].includes(file)) {
        assert.match(primary, /href="mailto:hello\.mateorobles@gmail\.com\?subject=Interview%20with%20Mateo%20Robles">Interview<\/a>/);
        assert.match(primary, /href="\/mateo_robles_resume\.pdf">Résumé<\/a>/);
      }
      assert.match(generated, /href="#content">Skip to content/);
      assert.equal(applyChrome(generated, file), generated, 'regeneration is idempotent');
    }
  }
});

// The Menu (the Atlas) is the one site directory: every page of the site map, the current page marked in the markup so
// it holds without JS, and no stale aria-expanded on the <details> summary. The footer keeps contact and legal links
// in view and does not repeat the map.
test('the selected Menu and footer preserve contact, subscriber and legal links', async () => {
  const { applyChrome } = await import('./site-chrome.mjs');
  const { header, footer } = await import('../projects/project-template.js');
  const { siteMap, footerLinks, CONTACT, RESUME } = await import('../projects/site-data.js');
  for (const [file, marked] of [
    ['research/sybershoke/index.html', []],
    ['mateo/index.html', ['/mateo/']], // one selected contact destination
    ['privacy/index.html', ['/privacy/']],
    ['404.html', []],
  ]) {
    const html = applyChrome(header() + '<main id="main"></main>' + footer(), file);
    const atlas = html.match(/<div class="sy-atlas"[\s\S]*?<\/details>/)[0];
    for (const item of siteMap.flatMap(group => group.items)) assert.ok(atlas.includes(`href="${item.href}"`), `${file}: Menu links ${item.label}`);
    assert.deepEqual([...atlas.matchAll(/<a href="([^"]+)" aria-current="page"/g)].map(match => match[1]), marked, file);
    assert.doesNotMatch(html, /aria-expanded=/, `${file}: <details> reports its own state`);
    const foot = html.match(/<footer[\s\S]*?<\/footer>/)[0];
    for (const href of [CONTACT, RESUME, '/privacy/']) assert.ok(foot.includes(`href="${href}"`), `${file}: footer links ${href}`);
    assert.equal([...foot.matchAll(/<a /g)].length, footerLinks.length + 1, `${file}: footer is the mark and essential links, no duplicated site map`);
  }
});
