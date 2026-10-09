-- migrations/0002_add_person.sql
-- Applied after 0001, which is live on production D1 and is never edited. Safe on that database: it drops
-- only the invites table, which nothing reads or writes and which holds no rows, and adds two triggers
-- that no current statement fires. No people, emails or provider subjects (CI greps this file too).

-- RFC-0002 R3-4: Add person replaced invites (server/views/people.js addPerson). Nothing references this
-- table, so dropping it touches no other row. Refuse to discard rows if the production preflight was
-- stale. The placeholder makes this guard rerunnable after the real table has already been dropped.
CREATE TABLE IF NOT EXISTS invites (id TEXT PRIMARY KEY);
CREATE TRIGGER IF NOT EXISTS invites_must_be_empty BEFORE DELETE ON invites
  BEGIN SELECT RAISE(ABORT, 'invites must be empty before removal'); END;
DELETE FROM invites;
DROP TABLE invites;

-- The label the UI shows for id:users.manage (RFC-0002 2.4): no invites, "turn off and on", never "disable"
-- (3.5), and no "end sessions" (turning off ends them). Packet 5 ships method removal in this release.
UPDATE permissions
   SET description = 'Add people, grant and revoke roles, turn accounts off and on, remove sign-in methods'
 WHERE key = 'id:users.manage';

-- RFC-0002 8.1: the system role's row is fixed (roles.js edits only is_system = 0 rows), and a grant is
-- changed by delete and insert, never in place (an UPDATE would slip past the two INSERT/DELETE triggers).
CREATE TRIGGER IF NOT EXISTS roles_admin_fixed BEFORE UPDATE ON roles
  WHEN OLD.id = 'role_admin'
  BEGIN SELECT RAISE(ABORT, 'admin is the system role'); END;
CREATE TRIGGER IF NOT EXISTS role_perms_no_update BEFORE UPDATE ON role_permissions
  BEGIN SELECT RAISE(ABORT, 'delete and insert instead'); END;
