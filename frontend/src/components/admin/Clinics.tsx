import React from 'react';
import { MapPin, Plus } from 'lucide-react';

const Clinics: React.FC = () => {
  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Regional Telemedicine Clinics</h1>
          <p className="text-neutral-500 text-sm mt-1">Configure active health points, sub-clinics, and block hospital parameters.</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <MapPin size={30} className="stroke-[2.25]" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Clinic Infrastructure Config</h2>
        <p className="text-neutral-500 text-sm mt-1 max-w-sm">Register physical health posts, map block clinics, and manage local hardware signaling hubs.</p>
        
        <button className="mt-6 flex items-center gap-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white font-bold text-sm px-6 py-3 rounded-full shadow-md shadow-primary/10">
          <Plus size={14} />
          <span>Add Regional Clinic Point</span>
        </button>
      </div>
    </div>
  );
};

export default Clinics;
