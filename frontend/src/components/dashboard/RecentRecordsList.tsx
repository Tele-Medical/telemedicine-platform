import React from 'react';
import { FileText, ShieldAlert, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

interface RecentRecordsListProps {
  isDemo?: boolean;
  patientId?: string;
}

const RecentRecordsList: React.FC<RecentRecordsListProps> = ({ isDemo = false, patientId }) => {
  const { t } = useTranslation();

  // Query actual conditions and allergies from local offline IndexedDB
  const dbRecords = useLiveQuery(async () => {
    if (!patientId) return [];

    const [conds, allgs] = await Promise.all([
      db.conditions.where('patient_id').equals(patientId).toArray(),
      db.allergies.where('patient_id').equals(patientId).toArray()
    ]);

    const formattedConds = conds.map((c, idx) => ({
      id: `cond-${c.id || idx}`,
      title: String(c.disease_name || ''),
      subtitle: t('clinical.conditions', 'Active Condition'),
      date: c.created_at ? new Date(String(c.created_at)).toLocaleDateString() : 'Just now',
      type: 'condition'
    }));

    const formattedAllgs = allgs.map((a, idx) => ({
      id: `allg-${a.id || idx}`,
      title: String(a.substance || ''),
      subtitle: t('clinical.allergies', 'Allergy Intolerance'),
      date: a.created_at ? new Date(String(a.created_at)).toLocaleDateString() : 'Just now',
      type: 'allergy'
    }));

    const combined = [...formattedConds, ...formattedAllgs];
    // Sort by date descending
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  }, [patientId]) || [];

  const demoRecords = [
    { id: 'demo-1', title: `${t('clinical.lab_report')} - ${t('clinical.blood_test')}`, subtitle: 'Lab Report', date: 'Oct 12, 2026', type: 'lab' },
    { id: 'demo-2', title: `${t('clinical.prescription')} - ${t('clinical.default_practitioner')}`, subtitle: 'Prescription', date: 'Oct 05, 2026', type: 'prescription' },
  ];

  const activeRecords = (dbRecords.length === 0 && isDemo) ? demoRecords : dbRecords;

  if (activeRecords.length === 0) {
    return (
      <div className="mt-6 mb-8 animate-fade-in text-neutral-900">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">{t('clinical.recent_records')}</h2>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-neutral-50 text-neutral-400 border border-neutral-100 flex items-center justify-center">
            <FileText size={22} className="stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">{t('clinical.no_records')}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 mb-8 text-neutral-900">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-neutral-900 tracking-tight">{t('clinical.recent_records')}</h2>
      </div>
      
      <ul className="flex flex-col gap-3">
        {activeRecords.map(record => (
          <li key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200/60 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer hover:bg-gray-50">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              record.type === 'lab' ? 'bg-blue-50 text-blue-600' : 
              record.type === 'prescription' ? 'bg-green-50 text-green-600' :
              record.type === 'allergy' ? 'bg-red-50 text-red-600' :
              'bg-purple-50 text-purple-600'
            }`}>
              {record.type === 'allergy' ? <ShieldAlert size={18} /> :
               record.type === 'condition' ? <Award size={18} /> :
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-neutral-800">{record.title}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">{record.subtitle} • {record.date}</p>
            </div>
            <svg className="text-neutral-400 opacity-50" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentRecordsList;
