import test from 'node:test';
import assert from 'node:assert/strict';
import { targetActionDenied } from '../supabase/functions/dealzy-admin-user-auth/permissions.ts';

test('no administrative action can change the superadmin, even their own account', () => {
  for (const caller of ['superadmin', 'admin']) {
    for (const action of ['update_identity', 'set_status', 'set_password', 'send_password_reset']) {
      for (const self of [true, false]) {
        assert.equal(targetActionDenied(caller, 'superadmin', self, action), 'Protected superadmin account');
      }
    }
  }
});

test('admin cannot modify staff, including a disabled staff account', () => {
  for (const role of ['admin', 'viewer']) {
    for (const action of ['update_identity', 'set_status', 'send_password_reset']) {
      assert.equal(targetActionDenied('admin', role, false, action), 'Admins can only manage normal users');
    }
  }
});

test('superadmin can manage non-superadmin staff and users', () => {
  for (const role of ['admin', 'viewer', 'user']) {
    for (const action of ['update_identity', 'set_status', 'set_password', 'send_password_reset']) {
      assert.equal(targetActionDenied('superadmin', role, false, action), null);
    }
  }
});

test('self disable and non-superadmin password replacement are denied', () => {
  assert.equal(targetActionDenied('admin', 'user', true, 'set_status'), 'You cannot change your own account status');
  assert.equal(targetActionDenied('admin', 'user', false, 'set_password'), 'Superadmin required');
  assert.equal(targetActionDenied('admin', 'user', false, 'update_identity'), null);
});
