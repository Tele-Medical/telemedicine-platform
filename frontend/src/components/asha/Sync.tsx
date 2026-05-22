import React from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';

const Sync: React.FC = () => {
  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Offline Record Synchronization</h1>
        <p className="text-neutral-500 text-sm mt-1">Sync assisted medical cases and rural registry details gathered during low-connectivity home visits.</p>
      </header>

      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={30} className="stroke-[2.25]" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Database is Fully Synced</h2>
        <p className="text-neutral-500 text-sm mt-1 max-w-sm">All local vitals reports, registration records, and clinical observations are synced with the central regional server.</p>
        
        <button className="mt-6 flex items-center gap-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white font-bold text-sm px-6 py-3 rounded-full shadow-md shadow-primary/10">
          <RefreshCw size={14} />
          <span>Synchronize Offline Cache</span>
        </button>
      </div>
    </div>
  );
};

export default Sync;
