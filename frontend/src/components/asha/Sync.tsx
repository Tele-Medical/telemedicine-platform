import React, { useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  UploadCloud, 
  Clock, 
  User 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { apiClient } from '../../api/client';

const base64ToBlob = (base64: string, contentType: string): Blob => {
  const parts = base64.split(',');
  const rawBase64 = parts.length > 1 ? parts[1] : parts[0];
  const byteString = atob(rawBase64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: contentType });
};

const Sync: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Live query outbox items from IndexedDB
  const outboxItems = useLiveQuery(() => db.outbox.toArray()) || [];

  const performSync = async () => {
    if (outboxItems.length === 0) {
      setSyncStatus('synced');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      // Loop through outbox items and sync them
      for (const item of outboxItems) {
        const payload = (item.payload || {}) as Record<string, any>;
        let success = false;

        try {
          if (item.entity_type === 'patients') {
            const response = await apiClient('/patients/', {
              method: 'POST',
              body: JSON.stringify({
                id: payload.id ? String(payload.id) : undefined,
                full_name: payload.full_name ? String(payload.full_name) : '',
                phone: (payload.phone || payload.guardian_phone) ? String(payload.phone || payload.guardian_phone) : null,
                preferred_language: 'en',
                village: 'Nabha Sub-centre'
              })
            }) as { id?: string } | null | undefined;

            // ID Reconciliation: if the backend returned a different ID (e.g. running old code), reconcile local DB
            if (response && response.id && response.id !== String(payload.id)) {
              console.log(`Reconciling patient ID during sync: updating local ${payload.id} to backend ${response.id}`);
              const oldId = String(payload.id);
              const newId = response.id;

              await db.transaction('rw', [db.patients, db.appointments], async () => {
                const patientData = await db.patients.get(oldId);
                if (patientData) {
                   const updatedPatient = {
                     ...patientData,
                     id: newId
                   };
                   await db.patients.put(updatedPatient);
                   await db.patients.delete(oldId);
                }

                // Reconcile references in appointments
                const appointments = await db.appointments.where('patient_id').equals(oldId).toArray();
                for (const appt of appointments) {
                  if (appt.id) {
                    const updatedAppt = {
                      ...appt,
                      patient_id: newId
                    };
                    await db.appointments.put(updatedAppt);
                    await db.appointments.delete(String(appt.id));
                  }
                }
              });
            }
            success = true;
          } else if (item.entity_type === 'observation') {
            await apiClient('/clinical/observations', {
              method: 'POST',
              body: JSON.stringify({
                patient_id: payload.patient_id,
                encounter_id: payload.encounter_id || null,
                code: payload.code,
                value_string: payload.value_string,
                unit: payload.unit || null
              })
            });
            success = true;
          } else if (item.entity_type === 'condition') {
            await apiClient('/clinical/conditions', {
              method: 'POST',
              body: JSON.stringify({
                patient_id: payload.patient_id,
                encounter_id: payload.encounter_id || null,
                clinical_status: payload.clinical_status || 'active',
                disease_code: payload.disease_code || null,
                disease_name: payload.disease_name
              })
            });
            success = true;
          } else if (item.entity_type === 'allergy') {
            await apiClient('/clinical/allergies', {
              method: 'POST',
              body: JSON.stringify({
                patient_id: payload.patient_id,
                substance: payload.substance,
                criticality: payload.criticality || 'unable_to_assess'
              })
            });
            success = true;
          } else if (item.entity_type === 'document_reference') {
            const doc = await db.documents.get(item.entity_id);
            if (doc && doc.base64_data) {
              const blob = base64ToBlob(doc.base64_data, doc.content_type);
              const formData = new FormData();
              formData.append('patient_id', payload.patient_id);
              if (payload.appointment_id) {
                formData.append('appointment_id', payload.appointment_id);
              }
              formData.append('document_type', payload.document_type || 'report');
              formData.append('file', blob, payload.file_name);

              await apiClient('/clinical/documents', {
                method: 'POST',
                body: formData
              });

              // Clear local base64 data to save storage
              await db.documents.update(item.entity_id, { base64_data: '' });
            }
            success = true;
          } else if (item.entity_type === 'appointment') {
            // Find any symptom intake for this patient/appointment
            const symptomsList = await db.symptoms.where('patient_id').equals(payload.patient_id).toArray();
            // Sort by created_at desc to find latest
            const latestSymptom = symptomsList.length > 0
              ? symptomsList.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())[0]
              : null;

            const apptBody: Record<string, any> = {
              patient_id: payload.patient_id,
              practitioner_id: payload.practitioner_id,
              scheduled_for: payload.scheduled_for,
              channel: payload.channel || 'assisted',
              chief_complaint: payload.chief_complaint,
              triage_priority: payload.triage_priority || 'Standard',
            };

            if (latestSymptom) {
              apptBody.symptom_intake = {
                raw_text: latestSymptom.raw_text,
                symptoms: latestSymptom.symptoms,
                duration: latestSymptom.duration || '1-3 days',
                severity: latestSymptom.severity || 'Standard'
              };
            }

            await apiClient('/appointments/', {
              method: 'POST',
              body: JSON.stringify(apptBody)
            });
            success = true;
          } else if (item.entity_type === 'symptom_intake') {
            // Standalone symptom intakes are synced as part of appointments.
            success = true;
          }

          // Transactional Cleanup: Delete only this item from outbox upon successful sync
          if (success && item.id !== undefined) {
            await db.outbox.delete(item.id);
          }
        } catch (itemErr) {
          console.error(`Failed to synchronize outbox item ${item.id} (${item.entity_type}):`, itemErr);
          // Do not delete the outbox item, let it remain to be retried
          throw itemErr; // Break the sync loop to show error state to user
        }
      }
      
      setSyncStatus('synced');
      
      // Reset back to idle status after showing success visual for 3.5s
      setTimeout(() => setSyncStatus('idle'), 3500);
    } catch (err) {
      console.error('Failed to sync offline outbox cache:', err);
      setSyncStatus('error');
    }
  };

  return (
    <div className="animate-fade-in pb-12 text-neutral-900 font-sans">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('asha.sync_title')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('asha.sync_desc')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Sync Operational Card */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-soft flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 border shadow-sm ${
            syncStatus === 'error' ? 'bg-danger/10 text-danger border-danger-200' : 
            syncStatus === 'syncing' ? 'bg-primary/10 text-primary border-primary-100 animate-pulse' :
            syncStatus === 'synced' ? 'bg-success/10 text-success border-success-200' :
            outboxItems.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' :
            'bg-teal-50 text-teal-600 border-teal-200'
          }`}>
            {syncStatus === 'error' ? <AlertCircle size={30} className="stroke-[2.25]" /> :
             syncStatus === 'syncing' ? <UploadCloud size={30} className="stroke-[2.25] animate-bounce" /> :
             syncStatus === 'synced' ? <CheckCircle size={30} className="stroke-[2.25] text-success-sync" /> :
             <Database size={30} className="stroke-[2.25]" />}
          </div>

          <h2 className="text-lg font-black text-neutral-900 tracking-tight">
            {syncStatus === 'idle' 
              ? (outboxItems.length > 0 ? 'Pending Offline Changes' : t('asha.ready_to_sync')) 
              : syncStatus === 'syncing' ? t('app.syncing') 
              : syncStatus === 'error' ? t('app.sync_failed') 
              : t('asha.synced_success')}
          </h2>
          
          <p className="text-neutral-400 text-xs font-semibold mt-2.5 max-w-sm leading-relaxed">
            {syncStatus === 'idle'
              ? (outboxItems.length > 0 
                  ? `You have compiled ${outboxItems.length} patient record entries while operating in low network areas. Sync them with the main block server registry.`
                  : t('asha.sync_info'))
              : syncStatus === 'syncing' ? 'Pushing registered clinical documents and outbox records to central clinical server...'
              : syncStatus === 'error' ? 'Unable to securely authenticate with Block Server. Check network and try again.'
              : 'All community clinical checkups have been synced. Local offline cache cleared.'
            }
          </p>

          {/* Sync Trigger button */}
          <button 
            onClick={performSync}
            disabled={syncStatus === 'syncing' || (!isOnline && outboxItems.length > 0)}
            className={`mt-6 inline-flex items-center gap-2 font-extrabold text-xs px-6 py-3.5 rounded-full shadow-md transition-all active:scale-[0.97] outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              syncStatus === 'syncing' 
                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200/50 shadow-none'
                : !isOnline && outboxItems.length > 0
                  ? 'bg-neutral-100 text-neutral-400 border border-neutral-200/50 shadow-none'
                  : 'bg-primary hover:bg-primary-700 text-white shadow-primary/10 focus-visible:ring-primary/30'
            }`}
          >
            <RefreshCw size={13} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            <span>
              {syncStatus === 'syncing' 
                ? t('app.syncing') 
                : outboxItems.length > 0 
                  ? `Push ${outboxItems.length} Changes Online` 
                  : t('asha.sync_action', 'Synchronize Offline Cache')
              }
            </span>
          </button>

          {!isOnline && outboxItems.length > 0 && (
            <p className="text-[10px] text-amber-700 font-extrabold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200/50 mt-4 animate-pulse">
              Network connection is required to push offline queue online.
            </p>
          )}
        </div>

        {/* Outbox Queue Sidebar */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3 mb-4 flex items-center justify-between">
              <span>Local Queue</span>
              <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                {outboxItems.length} items
              </span>
            </h3>
            
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {outboxItems.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs font-semibold">
                  <Database size={24} className="mx-auto mb-2 text-neutral-300 stroke-[1.5]" />
                  <span>Outbox is completely empty.</span>
                </div>
              ) : (
                outboxItems.map((item) => {
                  const payload = item.payload || {};
                  const patientName = String(payload.full_name || 'Assisted Patient');
                  const time = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

                  return (
                    <div key={item.id} className="bg-neutral-50/50 border border-neutral-200/50 p-3 rounded-xl flex flex-col gap-1.5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                      <div className="flex items-center justify-between gap-2 pl-1.5">
                        <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded tracking-wide">
                          {String(item.action)}
                        </span>
                        <span className="text-[9px] font-bold text-neutral-400 flex items-center gap-1">
                          <Clock size={10} />
                          {time}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5 pl-1.5">
                        <div className="w-5 h-5 rounded bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                          <User size={11} className="stroke-[2.25]" />
                        </div>
                        <span className="text-xs font-extrabold text-neutral-700 truncate">
                          {patientName}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4 mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              <span>Sync Protocol</span>
              <span className="text-teal-700 font-extrabold">v1.2 Secure P2P</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Sync;
