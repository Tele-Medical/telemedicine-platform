import React from 'react';
import { useTranslation } from 'react-i18next';

const PatientRecordsPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-8 text-neutral-900 font-sans">
      {/* Vitals Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">{t('clinical.latest_vitals')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-xs text-neutral-500 font-semibold block">{t('clinical.blood_pressure')}</span>
            <span className="text-lg font-black text-neutral-900 tracking-tight">120/80 <span className="text-[10px] font-bold text-neutral-400">mmHg</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-xs text-neutral-500 font-semibold block">{t('clinical.pulse')}</span>
            <span className="text-lg font-black text-neutral-900 tracking-tight">72 <span className="text-[10px] font-bold text-neutral-400">{t('clinical.bpm')}</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-xs text-neutral-500 font-semibold block">{t('clinical.temp')}</span>
            <span className="text-lg font-black text-neutral-900 tracking-tight">98.6 <span className="text-[10px] font-bold text-neutral-400">°F</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-xs text-neutral-500 font-semibold block">{t('clinical.spo2')}</span>
            <span className="text-lg font-black text-neutral-900 tracking-tight">99 <span className="text-[10px] font-bold text-neutral-400">%</span></span>
          </div>
        </div>
      </div>

      {/* Past Documents */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">{t('clinical.documents')}</h3>
        <div className="flex flex-col gap-2">
          <button className="flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer w-full text-left border border-neutral-100 shadow-sm active:scale-[0.99]">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-900">{t('clinical.lab_report')} - {t('clinical.blood_count')}</p>
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">Oct 12, 2026</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer w-full text-left border border-neutral-100 shadow-sm active:scale-[0.99]">
            <div className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center border border-success/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-900">{t('clinical.prescription')} - {t('clinical.prev_visit')}</p>
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">Oct 05, 2026</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientRecordsPanel;
