import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';

describe('TelemedicineDB', () => {
  beforeEach(async () => {
    // We expect db to be an instance of Dexie defined in db.ts
    // Clear all tables before each test
    await db.patients.clear();
    await db.outbox.clear();
  });

  it('should open the database and create tables', async () => {
    expect(db.isOpen()).toBe(true);
    expect(db.patients).toBeDefined();
    expect(db.outbox).toBeDefined();
  });

  it('should be able to add and retrieve a patient', async () => {
    const newPatient = {
      id: 'patient-123',
      full_name: 'Test Patient',
      phone: '1234567890',
      created_at: new Date().toISOString()
    };
    
    await db.patients.add(newPatient);
    
    const retrieved = await db.patients.get('patient-123');
    expect(retrieved).toBeDefined();
    expect(retrieved?.full_name).toBe('Test Patient');
  });

  it('should be able to add an outbox operation', async () => {
    const operation = {
      operation_id: 'op-123',
      entity_type: 'patient',
      entity_id: 'patient-123',
      action: 'CREATE',
      payload: { name: 'Test Patient' },
      created_at: new Date().toISOString()
    };
    
    await db.outbox.add(operation);
    
    const count = await db.outbox.count();
    expect(count).toBe(1);
  });
});
