import { db } from '../db/db';
import { apiClient } from '../api/client';

export class PatientRepository {
  static async queueOutbox(patientData: any) {
    // Very basic UUID generation for now without external dependencies
    const opId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    
    await db.outbox.add({
      operation_id: opId,
      entity_type: 'patients',
      entity_id: patientData.id,
      action: 'CREATE', 
      payload: patientData,
      created_at: new Date().toISOString()
    });
  }

  static async save(patientData: any) {
    // 1. Write to local IndexedDB immediately
    await db.patients.put(patientData);

    // 2. If offline, queue the operation
    if (!navigator.onLine) {
      await PatientRepository.queueOutbox(patientData);
    } else {
      try {
        const response = await apiClient('/patients/', {
          method: 'POST',
          body: JSON.stringify({
            id: patientData.id,
            full_name: patientData.full_name,
            phone: patientData.phone || patientData.guardian_phone || null,
            preferred_language: 'en',
            village: 'Nabha Sub-centre'
          })
        });

        // ID Reconciliation: if the backend returned a different ID (e.g. running old code), reconcile local DB
        if (response && response.id && response.id !== patientData.id) {
          console.log(`Reconciling patient ID: updating local ${patientData.id} to backend ${response.id}`);
          await db.patients.delete(patientData.id);
          const updatedPatient = {
            ...patientData,
            id: response.id
          };
          await db.patients.put(updatedPatient);
          return updatedPatient;
        }
      } catch (err) {
        console.warn('Failed to register patient immediately online. Queuing locally.', err);
        await PatientRepository.queueOutbox(patientData);
      }
    }

    return patientData;
  }
}
