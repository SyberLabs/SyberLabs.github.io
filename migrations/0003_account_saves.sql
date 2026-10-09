-- Explicit personal backups; local applications retain runtime state authority.
CREATE TABLE account_saves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app TEXT NOT NULL CHECK (app IN ('omni', 'rise', 'sketch')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  bytes INTEGER NOT NULL CHECK (bytes BETWEEN 1 AND (1024 * 1024)),
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, request_id)
);
CREATE INDEX account_saves_owner ON account_saves(user_id, created_at DESC);
-- SQL limits are atomic even when concurrent requests passed their own preflight.
CREATE TRIGGER account_saves_quota BEFORE INSERT ON account_saves
WHEN NOT EXISTS (SELECT 1 FROM account_saves WHERE user_id = NEW.user_id AND request_id = NEW.request_id)
 AND ((SELECT count(*) FROM account_saves WHERE user_id = NEW.user_id) >= 50
   OR (SELECT coalesce(sum(bytes), 0) FROM account_saves WHERE user_id = NEW.user_id) + NEW.bytes > (10 * 1024 * 1024))
BEGIN SELECT RAISE(ABORT, 'account_save_quota'); END;
