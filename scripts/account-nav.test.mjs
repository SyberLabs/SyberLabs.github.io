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
