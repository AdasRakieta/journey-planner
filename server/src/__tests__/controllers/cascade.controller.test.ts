import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as stopController from '../../controllers/stopController';
import * as journeyController from '../../controllers/journeyController';
import jsonStore from '../../config/jsonStore';
import { Request, Response } from 'express';
import * as db from '../../config/db';

// minimal mock response
function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('cascade deletion (JSON fallback)', () => {
  beforeEach(async () => {
    // always run JSON mode for these tests
    Object.defineProperty(db, 'DB_AVAILABLE', { get: () => false });

    // clear relevant tables
    const tables = ['journeys','stops','attractions','attachments','transports','journey_shares','transport_attachments'];
    for (const t of tables) {
      const all = await jsonStore.getAll(t);
      for (const r of all) {
        await jsonStore.deleteById(t, r.id);
      }
    }
  });

  it('deleting a stop removes its attractions and attachments', async () => {
    // create journey and stop and related items
    const journey = await jsonStore.insert('journeys', { title: 'j', start_date: '2026-01-01', end_date: '2026-01-02', currency: 'PLN', created_by: 'u1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    const stop = await jsonStore.insert('stops', { journey_id: journey.id, city: 'X', country: 'Y', latitude: 0, longitude: 0, arrival_date: '2026-01-01', departure_date: '2026-01-02', is_paid: false, created_at: new Date().toISOString() });
    const attr = await jsonStore.insert('attractions', { stop_id: stop.id, name: 'A', created_at: new Date().toISOString() });
    const attach = await jsonStore.insert('attachments', { stop_id: stop.id, filename: 'f', original_filename: 'f', file_path: '/tmp', file_size: 1, mime_type: 'text/plain', is_encrypted: false });

    const req: any = { params: { id: stop.id }, app: { get: () => ({ emit: vi.fn() }) } };
    const res = makeRes();
    await stopController.deleteStop(req as Request, res as Response);
    expect(res.json).toHaveBeenCalledWith({ message: 'Stop deleted successfully' });

    const remainingStops = await jsonStore.getAll('stops');
    const remainingAttrs = await jsonStore.findByField('attractions','stop_id',stop.id);
    const remainingAtt = await jsonStore.findByField('attachments','stop_id',stop.id);
    expect(remainingStops.length).toBe(0);
    expect(remainingAttrs.length).toBe(0);
    expect(remainingAtt.length).toBe(0);
  });

  it('deleting a journey removes all child objects', async () => {
    const journey = await jsonStore.insert('journeys', { title: 'j2', start_date: '2026-01-01', end_date: '2026-01-02', currency: 'PLN', created_by: 'u2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    const stop = await jsonStore.insert('stops', { journey_id: journey.id, city: 'X', country: 'Y', latitude: 0, longitude: 0, arrival_date: '2026-01-01', departure_date: '2026-01-02', is_paid: false, created_at: new Date().toISOString() });
    const transport = await jsonStore.insert('transports', { journey_id: journey.id, type: 'flight', from_location: 'a', to_location: 'b', departure_date: '2026-01-01', arrival_date: '2026-01-02', price: 10, currency: 'PLN' });
    const attr = await jsonStore.insert('attractions', { journey_id: journey.id, stop_id: stop.id, name: 'A', created_at: new Date().toISOString() });
    const share = await jsonStore.insert('journey_shares', { journey_id: journey.id, shared_by_user_id: 'u2', status: 'pending', created_at: new Date().toISOString() });
    const attach = await jsonStore.insert('attachments', { journey_id: journey.id, filename: 'f', original_filename: 'f', file_path: '/tmp', file_size: 1, mime_type: 'text/plain', is_encrypted: false });
    const tAttach = await jsonStore.insert('transport_attachments', { transport_id: transport.id, filename:'x', original_filename:'x', file_path:'/tmp', file_size:1, mime_type:'text/plain' });

    const req: any = { params: { id: journey.id }, app: { get: () => ({ emit: vi.fn() }) } };
    const res = makeRes();
    await journeyController.deleteJourney(req as Request, res as Response);
    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted successfully' });

    // everything should be gone
    const leftovers = await jsonStore.getAll('journeys');
    expect(leftovers.length).toBe(0);
    expect((await jsonStore.getAll('stops')).length).toBe(0);
    expect((await jsonStore.getAll('transports')).length).toBe(0);
    expect((await jsonStore.getAll('attractions')).length).toBe(0);
    expect((await jsonStore.getAll('journey_shares')).length).toBe(0);
    expect((await jsonStore.getAll('attachments')).length).toBe(0);
    expect((await jsonStore.getAll('transport_attachments')).length).toBe(0);
  });

  it('invokes DB delete query when running in DB mode', async () => {
    const orig = Object.getOwnPropertyDescriptor(db, 'DB_AVAILABLE');
    Object.defineProperty(db, 'DB_AVAILABLE', { get: () => true });
    const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] } as any);

    const fakeId = '550e8400-e29b-41d4-a716-446655440000';
    const req: any = { params: { id: fakeId }, app: { get: () => ({ emit: vi.fn() }) } };
    const res = makeRes();
    await journeyController.deleteJourney(req as Request, res as Response);

    expect(spy).toHaveBeenCalledWith('DELETE FROM journeys WHERE id = $1', [fakeId]);
    spy.mockRestore();
    if (orig) Object.defineProperty(db, 'DB_AVAILABLE', orig);
  });
});
