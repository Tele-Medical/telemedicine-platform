import React, { useState } from 'react';
import { Search, Phone, Activity, Calendar } from 'lucide-react';

interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  lastVisit: string;
  bloodGroup: string;
  vitalsSummary: string;
}

const Patients: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients] = useState<PatientRecord[]>([
    {
      id: 'P101',
      name: 'Ravi Kumar',
      age: 42,
      gender: 'Male',
      phone: '+91 98000 00001',
      lastVisit: 'May 12, 2026',
      bloodGroup: 'O+',
      vitalsSummary: 'BP: 142/94 (Elevated) • Pulse: 72 bpm',
    },
    {
      id: 'P102',
      name: 'Sunita Devi',
      age: 58,
      gender: 'Female',
      phone: '+91 98123 45678',
      lastVisit: 'May 08, 2026',
      bloodGroup: 'B+',
      vitalsSummary: 'BP: 128/80 (Normal) • Pulse: 76 bpm',
    },
    {
      id: 'P103',
      name: 'Baldev Singh',
      age: 65,
      gender: 'Male',
      phone: '+91 98987 65432',
      lastVisit: 'May 14, 2026',
      bloodGroup: 'A-',
      vitalsSummary: 'BP: 156/98 (High) • Pulse: 84 bpm',
    },
  ]);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Patient Directory</h1>
        <p className="text-neutral-500 text-sm mt-1">Access secure medical records, health card status, and case files for registered clinic patients.</p>
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
          placeholder="Search patients by name or phone..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-sm"
        />
      </div>

      {/* Patient Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 text-center text-neutral-500">
            No patients found matching your search.
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">{patient.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 font-semibold mt-1">
                    <span>{patient.gender}</span>
                    <span>•</span>
                    <span>{patient.age} Yrs</span>
                    <span>•</span>
                    <span>Blood Group: <strong className="text-neutral-700">{patient.bloodGroup}</strong></span>
                  </div>
                </div>
              </div>

              {/* Vitals Summary and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-x-6 gap-y-2 border-t md:border-t-0 border-neutral-100 pt-4 md:pt-0">
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">CONTACT</span>
                  <div className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <Phone size={13} className="text-neutral-400" />
                    <span>{patient.phone}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">LAST TRIP</span>
                  <div className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <Calendar size={13} className="text-neutral-400" />
                    <span>{patient.lastVisit}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">RECENT VITALS</span>
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Activity size={13} className="text-primary/70 animate-pulse" />
                    <span>{patient.vitalsSummary}</span>
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

export default Patients;
