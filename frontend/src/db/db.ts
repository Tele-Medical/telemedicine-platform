import Dexie, { type Table } from 'dexie';

export interface OutboxOperation {
  id?: number;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export class TelemedicineDB extends Dexie {
  patients!: Table<Record<string, unknown>, string>;
  appointments!: Table<Record<string, unknown>, string>;
  observations!: Table<Record<string, unknown>, string>;
  allergies!: Table<Record<string, unknown>, string>;
  conditions!: Table<Record<string, unknown>, string>;
  medication_requests!: Table<Record<string, unknown>, string>;
  outbox!: Table<OutboxOperation, number>;

  constructor() {
    super('TelemedicineDB');
    this.version(1).stores({
      patients: 'id, full_name, phone',
      appointments: 'id, patient_id',
      observations: 'id, patient_id',
      allergies: 'id, patient_id',
      conditions: 'id, patient_id',
      medication_requests: 'id, patient_id',
      outbox: '++id, operation_id, entity_type'
    });
  }
}

export const db = new TelemedicineDB();
