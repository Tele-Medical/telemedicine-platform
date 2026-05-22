import React, { useState } from 'react';
import { Search, Calendar } from 'lucide-react';

interface CompletedConsult {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  date: string;
  diagnosis: string;
  medications: string[];
  notes: string;
}

const Consults: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [consults] = useState<CompletedConsult[]>([
    {
      id: 'C1001',
      patientName: 'Rohan Sharma',
      age: 34,
      gender: 'Male',
      date: 'May 20, 2026',
      diagnosis: 'Acute Gastrointestinal Infection',
      medications: ['ORS Sachets', 'Metronidazole 400mg', 'Paracetamol 650mg'],
      notes: 'Advised plenty of fluids and soft diet for 3 days. Follow up if fever exceeds 101F.',
    },
    {
      id: 'C1002',
      patientName: 'Meera Bai',
      age: 62,
      gender: 'Female',
      date: 'May 18, 2026',
      diagnosis: 'Hypertensive Heart Disease (Controlled)',
      medications: ['Amlodipine 5mg', 'Telmisartan 40mg'],
      notes: 'Blood pressure checked at 134/86 mmHg. General symptoms stable. Next comprehensive assessment in 1 month.',
    },
    {
      id: 'C1003',
      patientName: 'Vikram Singh',
      age: 48,
      gender: 'Male',
      date: 'May 15, 2026',
      diagnosis: 'Bronchial Asthma Flare-up',
      medications: ['Salbutamol Inhaler', 'Montelukast 10mg'],
      notes: 'Encouraged correct inhaler technique. Avoid exposure to dust and smoke.',
    },
  ]);

  const filteredConsults = consults.filter(c =>
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Consultation Records</h1>
          <p className="text-neutral-500 text-sm mt-1">Review historical clinical summaries, diagnosis logs, and medication orders.</p>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by patient name or diagnosis..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-sm"
        />
      </div>

      {/* Consultations List */}
      <div className="space-y-4">
        {filteredConsults.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 text-center text-neutral-500">
            No consultation records found matching your search.
          </div>
        ) : (
          filteredConsults.map((consult) => (
            <div key={consult.id} className="bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">{consult.patientName}</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                    {consult.age} Yrs • {consult.gender} • ID: {consult.id}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">DATE</span>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5 flex items-center gap-1">
                    <Calendar size={12} className="text-neutral-400" />
                    <span>{consult.date}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3.5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">DIAGNOSIS</span>
                    <span className="text-sm font-bold text-neutral-800">{consult.diagnosis}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">CLINICAL NOTES</span>
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed mt-0.5">{consult.notes}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block mb-1.5">PRESCRIBED MEDICINES</span>
                  <div className="flex flex-wrap gap-1.5">
                    {consult.medications.map((med, idx) => (
                      <span key={idx} className="bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-bold px-2.5 py-1 rounded-xl">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Consults;
