import { describe, it, expect, beforeEach, vi } from 'vitest';
import jsonStore from '../../config/jsonStore';
let db: typeof import('../../config/db');
let authController: typeof import('../../controllers/authController');
let adminController: typeof import('../../controllers/adminController');

// helper to create fake req/res
function makeReq(body: any = {}, params: any = {}) {
  return { body, params, user: { userId: '1' } } as any;
}
function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('end-to-end auth flow (JSON mode)', () => {
  beforeEach(async () => {
    // reload modules to start fresh
    vi.resetModules();
    // import db first and force JSON mode
    db = await import('../../config/db');
    Object.defineProperty(db, 'DB_AVAILABLE', { get: () => false });
    // debug check
    console.log('db.DB_AVAILABLE after override', db.DB_AVAILABLE);
    console.log('descriptor', Object.getOwnPropertyDescriptor(db, 'DB_AVAILABLE'));    // now import controllers which will see modified db
    authController = await import('../../controllers/authController');
    adminController = await import('../../controllers/adminController');

    // clear tables
    for (const t of ['pending_registrations', 'registration_requests', 'users', 'invitation_tokens']) {
      const all = await jsonStore.getAll(t);
      for (const r of all) {
        await jsonStore.deleteById(t, r.id);
      }
    }
  });

  it('can register, approve and login with same password', async () => {
    // step1: request code
    const email = 'test@example.com';
    const username = 'tester';
    const password = 'Pass1234';

    let req = makeReq({ email, username, password });
    let res = makeRes();
    await authController.registerRequest(req, res);
    expect(res.json).toHaveBeenCalled();

    // extract stored pending registration
    const pendings = await jsonStore.findByField('pending_registrations', 'email', email);
    expect(pendings.length).toBe(1);
    const code = pendings[0].code;

    // confirm code
    req = makeReq({ email, code });
    res = makeRes();
    await authController.registerConfirm(req, res);
    expect(res.json).toHaveBeenCalled();

    // retrieve registration request id
    const requests = await jsonStore.findByField('registration_requests', 'email', email);
    expect(requests.length).toBe(1);
    const requestId = requests[0].id;

    // approve as admin
    req = makeReq({}, { id: requestId.toString() });
    req.user = { userId: '1' };
    res = makeRes();
    await adminController.approveRegistrationRequest(req, res);
    expect(res.json).toHaveBeenCalled();

    // before attempting login inspect stored user hash
    const users = await jsonStore.findByField('users', 'email', email);
    expect(users.length).toBe(1);
    const stored = users[0];
    // verify hash matches password directly
    const { comparePassword } = await import('../../utils/auth');
    const ok = await comparePassword(password, stored.password_hash);
    expect(ok).toBe(true);
    // now login
    req = makeReq({ login: username, password });
    res = makeRes();
    await authController.login(req, res);
    expect(res.json).toHaveBeenCalled();
    const loginResult = res.json.mock.calls[0][0];
    expect(loginResult).toHaveProperty('accessToken');
  });
});
