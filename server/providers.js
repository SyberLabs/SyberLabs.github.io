// Which sign-in providers are on. GitHub always; Google only when both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
// are set, and otherwise nothing Google renders and its routes are 404 (RFC-0002 2.1, Packet 5). No imports, so
// views and oauth.js can both read it without an import cycle (oauth.js re-exports it).
export const PROVIDERS = ['github', 'google'];

export const enabledProviders = env =>
  PROVIDERS.filter(p => p === 'github' || Boolean(env && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET));

export const googleEnabled = env => enabledProviders(env).includes('google');
