import Dexie, { type Table } from 'dexie';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OutboxOperation {
  id?: number;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export class TelemedicineDB extends Dexie {
  patients!: Table<any, string>;
  appointments!: Table<any, string>;
  observations!: Table<any, string>;
  allergies!: Table<any, string>;
  conditions!: Table<any, string>;
  medication_requests!: Table<any, string>;
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
