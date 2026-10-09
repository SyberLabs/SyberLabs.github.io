-- migrations/0001_accounts.sql
-- Schema, the permission catalogue and roles ONLY. Never people, emails, provider subjects or
-- change entries: this file is in a public repo. CI refuses INSERTs into person/content tables here.
-- Times are INTEGER unix milliseconds. Ids are 32 lowercase hex chars from crypto.getRandomValues.
-- D1 enforces foreign keys by default; the test shim runs PRAGMA foreign_keys = ON.

-- People ---------------------------------------------------------------------------------------
CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,                 -- GitHub login or verified email at first sign-in
  primary_email    TEXT,                          -- contact/display only, never a lookup key
  created_at       INTEGER NOT NULL,
  disabled_at      INTEGER,                       -- users are disabled, never deleted (removal on request: RFC-0002 8.4.9)
  disabled_reason  TEXT
);

-- Sign-in methods. Keyed on the provider's stable subject, never on email or login.
CREATE TABLE identities (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  provider        TEXT NOT NULL CHECK (provider IN ('google','github')),
  subject         TEXT NOT NULL,                  -- Google `sub`; GitHub numeric `id` as text
  email           TEXT,                           -- provider-verified email at last sign-in, if any
  login           TEXT,                           -- GitHub login, display only (logins are reclaimable)
  created_at      INTEGER NOT NULL,
  last_login_at   INTEGER,
  UNIQUE (provider, subject)
);
CREATE INDEX identities_user ON identities(user_id);

-- Opaque server sessions. Only SHA-256(token) is stored; the token exists only in the cookie.
CREATE TABLE sessions (
  id_hash      TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  identity_id  TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,  -- removing a method ends its sessions
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,                  -- created_at + 12 h
  ip_prefix    TEXT,                              -- /24 (v4) or /48 (v6) of CF-Connecting-IP
  user_agent   TEXT                               -- truncated to 200 chars
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

-- Authorization -----------------------------------------------------------------------------
-- Keys code can check: app:resource.verb. Rows are added ONLY by migration, because a permission
-- means nothing unless code checks it. Keys are never renamed; retired keys get deprecated_at.
CREATE TABLE permissions (
  key            TEXT PRIMARY KEY CHECK (key GLOB '[a-z]*:[a-z]*.[a-z]*'),
  description    TEXT NOT NULL,
  privileged     INTEGER NOT NULL DEFAULT 0 CHECK (privileged IN (0,1)),  -- two-step confirm when granted
  deprecated_at  INTEGER
);

-- Arbitrary roles are data, created from /admin/roles.
CREATE TABLE roles (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 2 AND 40
                                           AND name GLOB '[a-z]*' AND name NOT GLOB '*[^a-z0-9-]*'),
  description  TEXT NOT NULL DEFAULT '',
  is_system    INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),  -- cannot be deleted/renamed
  created_by   TEXT REFERENCES users(id),
  created_at   INTEGER NOT NULL
);

CREATE TABLE role_permissions (
  role_id         TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key  TEXT NOT NULL REFERENCES permissions(key),
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE user_roles (
  user_id     TEXT NOT NULL REFERENCES users(id),
  role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by  TEXT REFERENCES users(id),          -- NULL = bootstrap invite seeded by Seth
  granted_at  INTEGER NOT NULL,
  expires_at  INTEGER,                            -- optional time-boxed grant
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX user_roles_role ON user_roles(role_id);

-- Users who could repair any lockout: enabled, holding non-expiring grants of both manage keys.
CREATE VIEW full_admins AS
  SELECT ur.user_id FROM user_roles ur
    JOIN users u ON u.id = ur.user_id AND u.disabled_at IS NULL
    JOIN role_permissions rp ON rp.role_id = ur.role_id
   WHERE ur.expires_at IS NULL AND rp.permission_key IN ('id:users.manage','id:roles.manage')
   GROUP BY ur.user_id HAVING count(DISTINCT rp.permission_key) = 2;

-- Invite-only. Exactly one target: a role (new person) or an existing user (add a sign-in method).
-- github: pinned to the numeric id; the link is optional.
-- google: needs the link (token_hash, carried in the encrypted state cookie) AND a matching
--         Google-authoritative verified email (RFC-0002 section 2.2, case b).
CREATE TABLE invites (
  id                    TEXT PRIMARY KEY,
  token_hash            TEXT NOT NULL UNIQUE,     -- sha256 hex of the link token; the raw token is never stored
  role_id               TEXT REFERENCES roles(id) ON DELETE CASCADE,
  user_id               TEXT REFERENCES users(id),
  provider              TEXT NOT NULL CHECK (provider IN ('google','github')),
  subject               TEXT,                     -- GitHub numeric id
  login_hint            TEXT,                     -- GitHub login when created, display only
  email_normalized      TEXT,                     -- lower(trim(email)), Google only
  note                  TEXT NOT NULL DEFAULT '',
  invited_by            TEXT REFERENCES users(id),-- NULL = bootstrap
  created_at            INTEGER NOT NULL,
  expires_at            INTEGER NOT NULL,         -- default 7 days
  redeemed_at           INTEGER,
  redeemed_identity_id  TEXT,                     -- set by the guarded UPDATE; no FK (row inserted after)
  revoked_at            INTEGER,
  CHECK ((role_id IS NULL) <> (user_id IS NULL)),
  CHECK ((provider = 'github' AND subject IS NOT NULL AND email_normalized IS NULL) OR
         (provider = 'google' AND email_normalized IS NOT NULL AND subject IS NULL))
);
CREATE INDEX invites_subject_open ON invites(provider, subject) WHERE redeemed_at IS NULL AND revoked_at IS NULL;

-- Audit log. The app only INSERTs. UPDATE is refused; DELETE is allowed only by retention.
CREATE TABLE audit_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  at             INTEGER NOT NULL,
  actor_user_id  TEXT,                            -- NULL = anonymous / bootstrap
  action         TEXT NOT NULL,                   -- signin.ok signin.denied invite.create invite.revoke
                                                  -- invite.redeem role.grant role.revoke role.create role.perms
                                                  -- user.disable user.enable identity.remove
                                                  -- session.revoke session.revoke_all
                                                  -- changes.create changes.update changes.delete bootstrap.invite
  target_type    TEXT,
  target_id      TEXT,                            -- signin.denied: HMAC-SHA256(audit key, provider:subject) hex
  detail_json    TEXT NOT NULL DEFAULT '{}',      -- small JSON; never tokens, secrets or emails of denied people
  ip_prefix      TEXT,
  user_agent     TEXT,
  request_id     TEXT                             -- cf-ray
);
CREATE INDEX audit_at ON audit_events(at DESC);
CREATE INDEX audit_dedupe ON audit_events(action, target_id, at);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events
  BEGIN SELECT RAISE(ABORT, 'audit is append-only'); END;
CREATE TRIGGER audit_retention_only BEFORE DELETE ON audit_events
  WHEN NOT (OLD.at < (unixepoch() - 400*86400) * 1000
            OR (OLD.action = 'signin.denied' AND OLD.at < (unixepoch() - 90*86400) * 1000))
  BEGIN SELECT RAISE(ABORT, 'audit rows are kept until retention'); END;

-- Content: "What changed", now private ------------------------------------------------------
-- Fields mirror projects/latest.js (date, project, state, title, text, href).
CREATE TABLE change_entries (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  project     TEXT NOT NULL CHECK (length(project) BETWEEN 1 AND 60),
  state       TEXT NOT NULL CHECK (state IN ('deployed','merged','decided','recorded','in progress')),
  title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  text        TEXT NOT NULL CHECK (length(text) <= 1200),
  href        TEXT NOT NULL CHECK (length(href) <= 500
                                   AND (href GLOB 'https://*' OR (href GLOB '/*' AND href NOT GLOB '//*'))
                                   AND href NOT GLOB '*[^!-~]*'            -- no spaces, controls or non-ASCII
                                   AND href NOT GLOB '*["''<>`\]*'),       -- no quotes, angle brackets, backslash
  created_by  TEXT REFERENCES users(id),          -- opaque id; NULL for the one-off import
  created_at  INTEGER NOT NULL,
  updated_by  TEXT REFERENCES users(id),
  updated_at  INTEGER,
  deleted_at  INTEGER                             -- soft delete
);
CREATE INDEX change_entries_live ON change_entries(date DESC, created_at DESC) WHERE deleted_at IS NULL;

-- Seed: catalogue and roles. Contains no people. -------------------------------------------------
INSERT INTO permissions (key, description, privileged) VALUES
  ('site:changes.read',  'See What changed',                                                      0),
  ('site:changes.write', 'Add, edit and remove What changed entries',                             0),
  ('id:users.read',      'See staff accounts, their roles and sign-ins',                          0),
  ('id:users.manage',    'Invite people, grant and revoke roles, disable accounts, end sessions', 1),
  ('id:roles.manage',    'Create roles and choose their permissions',                             1),
  ('id:audit.read',      'Read the audit log',                                                    0);

INSERT INTO roles (id, name, description, is_system, created_at) VALUES
  ('role_admin',  'admin',  'Everything under /admin/',         1, unixepoch() * 1000),
  ('role_viewer', 'viewer', 'Read What changed, nothing else',  0, unixepoch() * 1000);

INSERT INTO role_permissions (role_id, permission_key) SELECT 'role_admin', key FROM permissions;
INSERT INTO role_permissions (role_id, permission_key) VALUES ('role_viewer', 'site:changes.read');
