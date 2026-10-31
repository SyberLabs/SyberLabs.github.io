// telemetry.v1 (MasterMind docs/contracts/telemetry-v1.md, RFC 0004): the site.request data point, built only
// from what telemetry/events.json lists. A field the allowlist does not name is never written, and a value
// outside a field's list drops the whole point. Nothing here sees a user, session or save id, an address, a
// User-Agent, a raw path or a query string: app.js passes a route template, a status class and its own
// constants. No imports but the allowlist, so app.js and account-api.js can both use it without an import cycle.
import events from '../telemetry/events.json' with { type: 'json' };

export const EVENT = 'site.request';
const SPEC = events.events[EVENT];

// The error code a response was built with (an HttpError's code, the account API's error), kept beside the
// Response rather than read back from its body. app.js reads it before secure() copies the response.
const codes = new WeakMap();
export const tag = (res, code) => { codes.set(res, code); return res; };
export const codeOf = res => codes.get(res) || 'none';

// release, route and code have no values list: each comes from a closed set the code owns (the short sha CI
// writes into release.js, a route-table template, an error-code literal). These checks refuse any shape no
// member of those sets has, and a blob added to the allowlist without a check here writes nothing.
const CLOSED = {
  release: value => /^(?:[0-9a-f]{7}|unknown)$/.test(value),
  route: value => value === 'unmatched' || /^\/[a-z0-9/:-]*$/.test(value),
  code: value => /^[a-z][a-z_]{0,39}$/.test(value),
};

// { indexes: [event], blobs: [event, ...the allowlist's blobs in order], doubles: [1, ...its numbers] }, or null.
export function sitePoint(fields) {
  const blobs = [EVENT];
  for (const { name, values } of SPEC.blobs) {
    const value = fields[name];
    if (typeof value !== 'string' || !(values ? values.includes(value) : CLOSED[name]?.(value))) return null;
    blobs.push(value);
  }
  const doubles = [];
  for (const name of SPEC.doubles) {
    const value = name === 'count' ? 1 : fields[name];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    doubles.push(value);
  }
  return { indexes: [EVENT], blobs, doubles };
}
