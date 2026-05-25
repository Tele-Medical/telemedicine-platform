import React from 'react';
import { Heart, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

interface VitalsWidgetProps {
  isDemo?: boolean;
  patientId?: string;
}

const VitalsWidget: React.FC<VitalsWidgetProps> = ({ isDemo = false, patientId }) => {
  const { t } = useTranslation();

  // Query actual observations/vitals from the offline-first IndexedDB
  const dbVitals = useLiveQuery(async () => {
    if (!patientId) return null;
    const items = await db.observations.where('patient_id').equals(patientId).toArray();
    
    // Sort by created_at descending to get the most recent entries
    items.sort((a, b) => new Date(String(b.created_at || '')).getTime() - new Date(String(a.created_at || '')).getTime());

    const bpObj = items.find(i => i.code === '85354-9');
    const hrObj = items.find(i => i.code === '8867-4');
    const tempObj = items.find(i => i.code === '8310-5');

    return {
      bloodPressure: bpObj ? String(bpObj.value_string) : null,
      pulse: hrObj ? String(hrObj.value_string) : null,
      temperature: tempObj ? String(tempObj.value_string) : null,
    };
  }, [patientId]);

  const showMock = isDemo && (!dbVitals || (!dbVitals.bloodPressure && !dbVitals.pulse));
  
  const bpValue = showMock ? "142/94" : (dbVitals?.bloodPressure || null);
  const pulseValue = showMock ? "72" : (dbVitals?.pulse || null);
  const tempValue = showMock ? "98.6" : (dbVitals?.temperature || null);

  if (!bpValue && !pulseValue && !tempValue) {
    return (
      <div className="mt-6 bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-neutral-50 text-neutral-400 border border-neutral-100 flex items-center justify-center">
          <Activity size={22} className="stroke-[2]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-900">{t('clinical.no_vitals')}</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
            {t('clinical.vitals_desc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 animate-fade-in">
      <h2 className="text-lg font-bold text-neutral-900 mb-3 tracking-tight">{t('clinical.recent_vitals', 'Recent Vitals')}</h2>
      <div className="grid grid-cols-2 gap-4">
        
        {/* BP Widget with High BP Alert if elevated */}
        {bpValue && (
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                  <Heart size={16} className="stroke-[2]" />
                </div>
                <span className="text-xs font-bold text-neutral-500 tracking-wide uppercase">{t('clinical.blood_pressure')}</span>
              </div>
              {bpValue.includes('/') && parseInt(bpValue.split('/')[0]) > 130 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-danger/10 text-danger border border-danger/20">
                  {t('clinical.high_bp')}
                </span>
              )}
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 tracking-tight">{bpValue}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{t('clinical.bp_unit')}</div>
            </div>
          </div>
        )}

        {/* Pulse Widget */}
        {pulseValue && (
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-success">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-neutral-500 tracking-wide uppercase">{t('clinical.pulse')}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-success/10 text-success border border-success/20">
                {t('clinical.normal')}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 tracking-tight">{pulseValue}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{t('clinical.bpm')}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VitalsWidget;
