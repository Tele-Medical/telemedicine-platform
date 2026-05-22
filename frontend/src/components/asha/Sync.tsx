import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const Sync: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const performSync = async () => {
    setSyncStatus('syncing');
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Offline Record Synchronization</h1>
        <p className="text-neutral-500 text-sm mt-1">Sync assisted medical cases and rural registry details gathered during low-connectivity home visits.</p>
      </header>

      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          syncStatus === 'error' ? 'bg-danger/10 text-danger' : 
          syncStatus === 'syncing' ? 'bg-primary/10 text-primary' :
          'bg-success/10 text-success'
        }`}>
          {syncStatus === 'error' ? <AlertCircle size={30} className="stroke-[2.25]" /> :
           <CheckCircle size={30} className="stroke-[2.25]" />}
        </div>
        <h2 className="text-lg font-bold text-neutral-900">
          {syncStatus === 'idle' ? 'Ready to Sync' :
           syncStatus === 'syncing' ? 'Syncing...' :
           syncStatus === 'error' ? 'Sync Failed' :
           'Database is Fully Synced'}
        </h2>
        <p className="text-neutral-500 text-sm mt-1 max-w-sm">All local vitals reports, registration records, and clinical observations are synced with the central regional server.</p>
        
        <button 
          onClick={performSync}
          disabled={syncStatus === 'syncing'}
          className="mt-6 flex items-center gap-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white font-bold text-sm px-6 py-3 rounded-full shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed">
          <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
          <span>{syncStatus === 'syncing' ? 'Synchronizing...' : 'Synchronize Offline Cache'}</span>
        </button>
      </div>
    </div>
  );
};

export default Sync;
