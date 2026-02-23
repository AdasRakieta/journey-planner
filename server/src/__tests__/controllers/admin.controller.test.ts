import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as adminController from '../../controllers/adminController';
import jsonStore from '../../config/jsonStore';
import * as db from '../../config/db';

// utility to build minimal mock Response
function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('adminController approveRegistrationRequest (JSON fallback)', () => {
  let originalDBAvailable: any;

  beforeEach(async () => {
    // force JSON mode by mocking the getter property
    originalDBAvailable = Object.getOwnPropertyDescriptor(db, 'DB_AVAILABLE');
    Object.defineProperty(db, 'DB_AVAILABLE', { get: () => false });

    // clear relevant tables
    const tables = ['registration_requests', 'users'];
    for (const t of tables) {
      const all = await jsonStore.getAll(t);
      for (const r of all) {
        await jsonStore.deleteById(t, r.id);
      }
    }
  });

  afterEach(() => {
    // restore original descriptor
    if (originalDBAvailable) {
      Object.defineProperty(db, 'DB_AVAILABLE', originalDBAvailable);
    }
  });

  it('should create user with password_hash when the request contains it', async () => {
    const hashed = 'hashedpassword';
    const request = await jsonStore.insert('registration_requests', {
      email: 'test@example.com',
      name: 'testuser',
      provider: 'local',
      profile: null,
      password_hash: hashed,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    const req: any = {
      params: { id: request.id.toString() },
      user: { userId: '999' }, // dummy admin id as string
    };
    const res = makeRes();

    await adminController.approveRegistrationRequest(req, res);

    expect(res.json).toHaveBeenCalled();
    const callArg = res.json.mock.calls[0][0];
    expect(callArg).toHaveProperty('user');
    const createdUser = callArg.user;
    expect(createdUser).toHaveProperty('password_hash', hashed);

    // also verify stored in jsonStore
    const stored = await jsonStore.findByField('users', 'email', 'test@example.com');
    expect(stored.length).toBe(1);
    expect(stored[0].password_hash).toBe(hashed);
  });

  it('should create user without password_hash when request has none', async () => {
    const request = await jsonStore.insert('registration_requests', {
      email: 'nopass@example.com',
      name: 'nopassuser',
      provider: 'local',
      profile: null,
      // no password_hash
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    const req: any = { params: { id: request.id.toString() }, user: { userId: '1' } };
    const res = makeRes();
    await adminController.approveRegistrationRequest(req, res);
    const stored = await jsonStore.findByField('users', 'email', 'nopass@example.com');
    expect(stored.length).toBe(1);
    expect(stored[0]).not.toHaveProperty('password_hash');
  });
});
