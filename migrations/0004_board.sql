-- migrations/0004_board.sql
-- Applied after 0003. Adds one permission key for the board page (server/views/board.js), which renders the
-- board.v1 JSON that MasterMind's daily ledger job writes to the BOARD KV namespace. Nothing is read from or
-- written to D1 by the page; the key only decides who may open it. Admin holds every key (0001 seeds the
-- catalogue into role_admin with a SELECT, which does not cover keys added later, so the grant is explicit).
-- The viewer role is unchanged. No people, emails or provider subjects (CI greps this file too).
INSERT INTO permissions (key, description, privileged) VALUES ('site:board.read', 'See the board', 0);
INSERT INTO role_permissions (role_id, permission_key) VALUES ('role_admin', 'site:board.read');
