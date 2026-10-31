-- migrations/0004_board.sql
-- Mission Control (/admin/board) shows the MasterMind board, which names repositories, commit subjects, handles
-- and ask text (board.v1), so it has its own key. Admin holds every key (RFC-0002 2.4) and gets it here; any
-- other role gets it from /admin/roles. Adds two rows and touches no other. No people, emails or provider ids
-- (CI greps this file too).
INSERT INTO permissions (key, description, privileged) VALUES
  ('site:board.read', 'See Mission Control: the board and telemetry', 0);

INSERT INTO role_permissions (role_id, permission_key) VALUES ('role_admin', 'site:board.read');
