import React, { useState } from 'react';
import { Search, FileDown, CheckCircle, Clock } from 'lucide-react';

interface PrescriptionRecord {
  id: string;
  patientName: string;
  date: string;
  medicationsCount: number;
  status: 'Pending Dispensation' | 'Dispensed';
  clinic: string;
}

const Prescriptions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptions] = useState<PrescriptionRecord[]>([
    {
      id: 'RX-9201',
      patientName: 'Ravi Kumar',
      date: 'May 22, 2026',
      medicationsCount: 3,
      status: 'Pending Dispensation',
      clinic: 'Rupnagar Sub-Clinic',
    },
    {
      id: 'RX-9104',
      patientName: 'Sunita Devi',
      date: 'May 18, 2026',
      medicationsCount: 2,
      status: 'Dispensed',
      clinic: 'Nangal Block Hospital',
    },
    {
      id: 'RX-8992',
      patientName: 'Meera Bai',
      date: 'May 15, 2026',
      medicationsCount: 2,
      status: 'Dispensed',
      clinic: 'Rupnagar Sub-Clinic',
    },
  ]);

  const filteredPrescriptions = prescriptions.filter(p =>
    p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Prescriptions Management</h1>
          <p className="text-neutral-500 text-sm mt-1">Issue digital prescriptions, verify dispensary statuses, and check pharmacy fulfillment logs.</p>
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
          placeholder="Search by RX ID or patient name..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-sm"
        />
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 text-center text-neutral-500">
            No prescriptions found matching your search.
          </div>
        ) : (
          filteredPrescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 rounded-lg font-mono">
                    {rx.id}
                  </span>
                  <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    rx.status === 'Dispensed' 
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-warning/10 text-warning border-warning/20 animate-pulse'
                  }`}>
                    {rx.status === 'Dispensed' ? <CheckCircle size={10} /> : <Clock size={10} />}
                    <span>{rx.status}</span>
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900">{rx.patientName}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 font-semibold">
                  <span>Issued: {rx.date}</span>
                  <span>•</span>
                  <span>{rx.clinic}</span>
                  <span>•</span>
                  <span>{rx.medicationsCount} Meds Ordered</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t sm:border-t-0 border-neutral-100 pt-3.5 sm:pt-0 shrink-0">
                <button className="flex items-center justify-center gap-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
                  <FileDown size={14} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Prescriptions;
