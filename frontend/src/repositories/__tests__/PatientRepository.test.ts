import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PatientRepository } from '../PatientRepository';
import { db } from '../../db/db';

describe('PatientRepository', () => {
  beforeEach(async () => {
    await db.patients.clear();
    await db.outbox.clear();
    vi.stubGlobal('navigator', { onLine: true });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'p-1' })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should save to indexedDB and NOT create outbox entry when ONLINE', async () => {
    const patientData = {
      id: 'p-1',
      full_name: 'Online Patient',
      phone: '11111'
    };

    await PatientRepository.save(patientData);

    const savedPatient = await db.patients.get('p-1');
    expect(savedPatient).toBeDefined();
    expect(savedPatient?.full_name).toBe('Online Patient');

    const outboxCount = await db.outbox.count();
    expect(outboxCount).toBe(0); // Should try to API sync instead
  });

  it('should save to indexedDB AND create outbox entry when OFFLINE', async () => {
    vi.stubGlobal('navigator', { onLine: false });

    const patientData = {
      id: 'p-2',
      full_name: 'Offline Patient',
      phone: '22222'
    };

    await PatientRepository.save(patientData);

    const savedPatient = await db.patients.get('p-2');
    expect(savedPatient).toBeDefined();
    expect(savedPatient?.full_name).toBe('Offline Patient');

    const outboxItems = await db.outbox.toArray();
    expect(outboxItems.length).toBe(1);
    expect(outboxItems[0].entity_type).toBe('patients');
    expect(outboxItems[0].action).toBe('CREATE');
    expect(outboxItems[0].entity_id).toBe('p-2');
  });
});
