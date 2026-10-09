// github.js: the authorize URL, the two API calls, and the Packet 4 username lookup. fetch is stubbed.
// RFC-0002 2.2: no scope, no /user/emails, no token revoke (supersedes the plan's test 6 revoke check).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, stubFetch } from './helpers.js';
import { AuthError } from '../http.js';
import { authorizeUrl, fetchIdentity, lookupLogin } from '../github.js';

const TOKEN = 'gho_test_token_do_not_leak';

function github({ token = { access_token: TOKEN, token_type: 'bearer', scope: '' }, user = { id: 1001, login: 'octo-test' },
  userStatus = 200 } = {}) {
  return stubFetch(async req => {
    const u = new URL(req.url);
    if (req.method === 'POST' && u.href === 'https://github.com/login/oauth/access_token') return Response.json(token);
    if (req.method === 'GET' && u.href === 'https://api.github.com/user') return Response.json(user, { status: userStatus });
    return undefined;
  });
}

test('authorize URL: exact callback, S256, allow_signup=false, no scope, prompt only on switch', () => {
  const env = makeEnv();
  const u = new URL(authorizeUrl(env, { state: 'st', challenge: 'ch' }));
  assert.equal(u.origin + u.pathname, 'https://github.com/login/oauth/authorize');
  assert.deepEqual(Object.fromEntries(u.searchParams), {
    client_id: 'github-client-test',
    redirect_uri: 'https://syberlabs.io/auth/callback/github',
    state: 'st',
    code_challenge: 'ch',
    code_challenge_method: 'S256',
    allow_signup: 'false',
  });
  assert.equal(u.searchParams.has('scope'), false);
  const sw = new URL(authorizeUrl(env, { state: 'st', challenge: 'ch', selectAccount: true }));
  assert.equal(sw.searchParams.get('prompt'), 'select_account');
});

test('fetchIdentity makes exactly two calls: the token exchange and GET /user', async () => {
  const env = makeEnv();
  const stub = github();
  const scheduled = [];
  try {
    const id = await fetchIdentity(env, { code: 'code-1', verifier: 'ver-1', waitUntil: p => scheduled.push(p) });
    assert.deepEqual(id, { subject: '1001', login: 'octo-test', email: null });
  } finally { stub.restore(); }
  assert.equal(stub.calls.length, 2);
  assert.equal(scheduled.length, 0, 'no revoke is scheduled');

  const [tok, user] = stub.calls;
  assert.equal(tok.headers.get('Accept'), 'application/json');
  assert.equal(tok.headers.get('Authorization'), null);
  const body = new URLSearchParams(await tok.text());
  assert.deepEqual(Object.fromEntries(body), {
    client_id: 'github-client-test',
    client_secret: 'github-secret-test',
    code: 'code-1',
    redirect_uri: 'https://syberlabs.io/auth/callback/github',
    code_verifier: 'ver-1',
  });
  assert.equal(user.headers.get('Authorization'), `Bearer ${TOKEN}`);
  assert.equal(user.headers.get('User-Agent'), 'syberlabs-accounts');
  assert.equal(user.headers.get('Accept'), 'application/vnd.github+json');
  assert.equal(user.headers.get('X-GitHub-Api-Version'), '2022-11-28');
});

test('a junk or used code (200 with error) is AuthError provider after one call', async () => {
  const env = makeEnv();
  const stub = github({ token: { error: 'bad_verification_code', error_description: 'The code passed is incorrect' } });
  try {
    await assert.rejects(fetchIdentity(env, { code: 'junk', verifier: 'v' }),
      err => err instanceof AuthError && err.code === 'provider');
  } finally { stub.restore(); }
  assert.equal(stub.calls.length, 1);
});

test('network failure, non-2xx and a malformed /user are all AuthError provider', async () => {
  const env = makeEnv();
  for (const opts of [{ userStatus: 500 }, { user: { login: 'x' } }, { user: { id: '12', login: 'x' } }, { user: { id: 0, login: 'x' } }]) {
    const stub = github(opts);
    try {
      await assert.rejects(fetchIdentity(env, { code: 'c', verifier: 'v' }), err => err.code === 'provider');
    } finally { stub.restore(); }
  }
  const down = stubFetch(() => { throw new TypeError('network down'); });
  try {
    await assert.rejects(fetchIdentity(env, { code: 'c', verifier: 'v' }), err => err.code === 'provider');
  } finally { down.restore(); }
});

test('the token never appears in the error thrown', async () => {
  const env = makeEnv();
  const stub = github({ userStatus: 401 });
  try {
    await assert.rejects(fetchIdentity(env, { code: 'c', verifier: 'v' }), err => {
      assert.ok(!String(err.message).includes(TOKEN) && !String(err.detail).includes(TOKEN));
      return true;
    });
  } finally { stub.restore(); }
});

test('lookupLogin returns the numeric id as text, or null', async () => {
  const stub = stubFetch(req => {
    const u = new URL(req.url);
    if (u.pathname === '/users/octo-test') return { id: 132, login: 'Octo-Test' };
    if (u.pathname === '/users/missing') return new Response('{}', { status: 404 });
    return undefined;
  });
  try {
    assert.deepEqual(await lookupLogin('@octo-test'), { id: '132', login: 'Octo-Test' });
    assert.equal(await lookupLogin('missing'), null);
    assert.equal(await lookupLogin('../etc'), null);
    assert.equal(await lookupLogin('-bad'), null);
    assert.equal(await lookupLogin(''), null);
  } finally { stub.restore(); }
  assert.equal(stub.calls.length, 2, 'invalid logins never reach GitHub');
  assert.equal(stub.calls[0].headers.get('Authorization'), null, 'the lookup is unauthenticated');
  assert.equal(stub.calls[0].headers.get('User-Agent'), 'syberlabs-accounts');
});
