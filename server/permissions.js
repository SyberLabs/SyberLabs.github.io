// The permission catalogue. It must match migrations/*.sql exactly (server/test/migration.test.js diffs
// them). A key means nothing until code checks it, so keys are added here and by migration together.
export const CATALOGUE = {
  'site:changes.read':  { privileged: false, label: 'See What changed' },
  'site:changes.write': { privileged: false, label: 'Add, edit and remove What changed entries' },
  'id:users.read':      { privileged: false, label: 'See staff accounts, their roles and sign-ins' },
  'id:users.manage':    { privileged: true,  label: 'Invite people, grant and revoke roles, disable accounts, end sessions' },
  'id:roles.manage':    { privileged: true,  label: 'Create roles and choose their permissions' },
  'id:audit.read':      { privileged: false, label: 'Read the audit log' },
};
export const PUBLIC = Symbol('public');       // allowed only under /auth/ (test-enforced)
export const SIGNED_IN = Symbol('signed-in'); // any valid session, no permission needed
