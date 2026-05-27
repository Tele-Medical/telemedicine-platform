import React, { useState } from 'react';
import { Heart, Activity, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

interface VitalsWidgetProps {
  isDemo?: boolean;
  patientId?: string;
}

const VitalsWidget: React.FC<VitalsWidgetProps> = ({ isDemo = false, patientId }) => {
  const { t } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ temp: '', pulse: '', bp: '' });

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

  const pulseNum = pulseValue ? parseInt(pulseValue, 10) : null;
  let pulseStatusLabel = t('clinical.normal', 'Normal');
  let pulseStatusClass = 'bg-success/10 text-success border border-success/20';

  if (pulseNum !== null && !isNaN(pulseNum)) {
    if (pulseNum < 60) {
      pulseStatusLabel = t('clinical.low', 'Low');
      pulseStatusClass = 'bg-warning/10 text-warning border border-warning/20';
    } else if (pulseNum > 100) {
      pulseStatusLabel = t('clinical.high', 'High');
      pulseStatusClass = 'bg-danger/10 text-danger border border-danger/20';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    const now = new Date().toISOString();
    const ops: any[] = [];
    const outboxOps: any[] = [];

    const addObs = (code: string, value: string, display: string, unit: string) => {
      const obsId = crypto.randomUUID();
      const obs = {
        id: obsId,
        patient_id: patientId,
        status: 'final',
        category: 'vital-signs',
        code,
        display,
        value_string: value,
        unit,
        created_at: now,
        updated_at: now
      };
      ops.push(db.observations.put(obs));
      outboxOps.push(db.outbox.add({
        operation_id: crypto.randomUUID(),
        entity_type: 'observation',
        entity_id: obsId,
        action: 'CREATE',
        payload: obs,
        created_at: now
      }));
    };

    if (formData.temp) addObs('8310-5', formData.temp, 'Body temperature', 'F');
    if (formData.pulse) addObs('8867-4', formData.pulse, 'Heart rate', '/min');
    if (formData.bp) addObs('85354-9', formData.bp, 'Blood pressure systolic & diastolic', 'mmHg');

    await Promise.all([...ops, ...outboxOps]);
    setFormData({ temp: '', pulse: '', bp: '' });
    setIsAddModalOpen(false);
  };

  const emptyState = (!bpValue && !pulseValue && !tempValue);

  return (
    <div className="mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-neutral-900 tracking-tight">{t('clinical.recent_vitals', 'Recent Vitals')}</h2>
        {patientId && (
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-600 transition-colors bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full">
            <Plus size={14} className="stroke-[3]" />
            {t('clinical.add', 'Add')}
          </button>
        )}
      </div>

      {emptyState ? (
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60 text-center flex flex-col items-center gap-4">
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
      ) : (
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
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${pulseStatusClass}`}>
                {pulseStatusLabel}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 tracking-tight">{pulseValue}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{t('clinical.bpm')}</div>
            </div>
          </div>
        )}

      </div>
      )}

      {/* Add Vitals Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="font-bold text-neutral-900">Add Vitals</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1.5">Temperature (°F)</label>
                <input type="number" step="0.1" value={formData.temp} onChange={e => setFormData({...formData, temp: e.target.value})} placeholder="e.g. 98.6" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none text-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1.5">Pulse (BPM)</label>
                <input type="number" value={formData.pulse} onChange={e => setFormData({...formData, pulse: e.target.value})} placeholder="e.g. 72" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none text-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1.5">Blood Pressure (mmHg)</label>
                <input type="text" value={formData.bp} onChange={e => setFormData({...formData, bp: e.target.value})} placeholder="e.g. 120/80" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none text-sm transition-all" />
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">Cancel</button>
                <button type="submit" disabled={!formData.temp && !formData.pulse && !formData.bp} className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save Vitals</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalsWidget;
