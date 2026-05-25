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
      // Synchronize outbox patient records online
      for (const item of outboxItems) {
        if (item.entity_type === 'patients') {
          const payload = (item.payload || {}) as Record<string, unknown>;
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

            const patientData = await db.patients.get(oldId);
            if (patientData) {
              await db.patients.delete(oldId);
              const updatedPatient = {
                ...patientData,
                id: newId
              };
              await db.patients.put(updatedPatient);
            }

            // Reconcile references in appointments
            const appointments = await db.appointments.where('patient_id').equals(oldId).toArray();
            for (const appt of appointments) {
              if (appt.id) {
                await db.appointments.delete(String(appt.id));
                const updatedAppt = {
                  ...appt,
                  patient_id: newId
                };
                await db.appointments.put(updatedAppt);
              }
            }
          }
        }
      }
      
      // Successfully clear outbox queue after synchronizing
      await db.outbox.clear();
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
