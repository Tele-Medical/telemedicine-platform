import React, { useState } from 'react';
import { Pill, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  purpose: string;
  schedule: string;
  timing: string;
  stockLeft: number;
}

const Medicines: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([
    { id: '1', name: 'Amlodipine 5mg', dosage: '1 Pill', purpose: 'Hypertension', schedule: 'Once Daily', timing: 'Morning (after breakfast)', stockLeft: 12 },
    { id: '2', name: 'Metformin 500mg', dosage: '1 Pill', purpose: 'Diabetes', schedule: 'Twice Daily', timing: 'Morning, Night (with meals)', stockLeft: 8 },
    { id: '3', name: 'Paracetamol 650mg', dosage: '1 Pill', purpose: 'Fever / Body Pain', schedule: 'As Needed', timing: 'Max 3 times daily', stockLeft: 4 }
  ]);

  const [refillStatus, setRefillStatus] = useState<Record<string, 'idle' | 'requesting' | 'completed'>>({});

  const handleRequestRefill = (id: string) => {
    setRefillStatus(prev => ({ ...prev, [id]: 'requesting' }));
    
    // Simulate API request
    setTimeout(() => {
      setRefillStatus(prev => ({ ...prev, [id]: 'completed' }));
      
      // Add mock stock
      setMedicines(prevMeds => 
        prevMeds.map(m => m.id === id ? { ...m, stockLeft: m.stockLeft + 30 } : m)
      );

      // Reset completed state after 3 seconds
      setTimeout(() => {
        setRefillStatus(prev => ({ ...prev, [id]: 'idle' }));
      }, 3000);
    }, 1500);
  };

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Active Medications</h1>
        <p className="text-neutral-500 text-sm mt-1">Track your daily pill schedule and request prescription refills easily.</p>
      </header>

      {/* Pill Compliance Tracker */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 border border-primary/15 mb-6 flex gap-4 items-center">
        <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
          <Clock size={20} className="stroke-[2.25] animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-neutral-900">Compliance Streak</h3>
          <p className="text-xs text-neutral-600 mt-0.5">You've logged your daily medications 6 days in a row. Keep it up!</p>
        </div>
      </div>

      {/* Active Medicines List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Your Prescription Schedule</h2>
        
        <div className="grid gap-4">
          {medicines.map((med) => (
            <div 
              key={med.id} 
              className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] border border-neutral-200/60 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Pill size={20} className="stroke-[2.25]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">{med.name}</h3>
                    <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                      For {med.purpose} • {med.dosage}
                    </p>
                  </div>
                </div>
                
                {/* Stock Level Warning Badge */}
                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                    med.stockLeft <= 5 
                      ? 'bg-danger/10 text-danger border border-danger/20' 
                      : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                  }`}>
                    {med.stockLeft} days left
                  </span>
                </div>
              </div>

              {/* Instructions and Schedule */}
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-700 font-bold">
                  <Clock size={12} className="text-primary" />
                  <span>{med.schedule}</span>
                </div>
                <div className="text-neutral-500 ml-4.5 font-medium">{med.timing}</div>
              </div>

              {/* Refill trigger */}
              <div className="flex justify-between items-center pt-1 border-t border-neutral-100 mt-1">
                <span className="text-[11px] text-neutral-500 font-semibold flex items-center gap-1">
                  {med.stockLeft <= 5 && (
                    <>
                      <AlertCircle size={12} className="text-danger" />
                      <span className="text-danger">Stock running low</span>
                    </>
                  )}
                </span>
                
                <button
                  onClick={() => handleRequestRefill(med.id)}
                  disabled={refillStatus[med.id] === 'requesting'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                    refillStatus[med.id] === 'completed'
                      ? 'bg-success text-white'
                      : refillStatus[med.id] === 'requesting'
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                        : 'bg-primary/10 hover:bg-primary/20 text-primary'
                  }`}
                >
                  {refillStatus[med.id] === 'requesting' ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Requesting Refill...</span>
                    </>
                  ) : refillStatus[med.id] === 'completed' ? (
                    <>
                      <CheckCircle2 size={12} />
                      <span>Refill Ordered!</span>
                    </>
                  ) : (
                    <span>Request Refill</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Medicines;
