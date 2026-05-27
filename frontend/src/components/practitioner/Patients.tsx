import React, { useState } from 'react';
import { Search, Phone, Activity, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients] = useState<PatientRecord[]>([]);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  return (
    <div className="animate-fade-in pb-12 text-neutral-900">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('nav.patients')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('profile.subtitle')}</p>
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
          placeholder={t('nav.search')}
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-sm"
        />
      </div>

      {/* Patient Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 text-center text-neutral-500">
            {t('clinical.no_medical_records')}
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
                    <span>{t('clinical.blood_group')}: <strong className="text-neutral-700">{patient.bloodGroup}</strong></span>
                  </div>
                </div>
              </div>

              {/* Vitals Summary and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-x-6 gap-y-2 border-t md:border-t-0 border-neutral-100 pt-4 md:pt-0">
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">{t('auth.phone_label')}</span>
                  <div className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <Phone size={13} className="text-neutral-400" />
                    <span>{patient.phone}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">{t('clinical.latest_vitals')}</span>
                  <div className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <Calendar size={13} className="text-neutral-400" />
                    <span>{patient.lastVisit}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">{t('clinical.recent_vitals')}</span>
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
