import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { apiClient } from '../../api/client';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const ClinicalForms: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const [activeTab, setActiveTab] = useState<'vitals' | 'conditions' | 'allergies'>('vitals');

  const [vitals, setVitals] = useState({ heartRate: '', bloodPressure: '', temperature: '' });
  const [condition, setCondition] = useState('');
  const [allergy, setAllergy] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSaveVitals = async () => {
    if (!patientId) return;
    setIsSubmitting(true);

    try {
      const recordsToSave = [];
      
      if (vitals.heartRate) {
        recordsToSave.push({
          id: crypto.randomUUID(),
          patient_id: patientId,
          encounter_id: null,
          code: '8867-4',
          value_string: vitals.heartRate,
          unit: 'bpm',
          created_at: new Date().toISOString(),
        });
      }
      
      if (vitals.bloodPressure) {
        recordsToSave.push({
          id: crypto.randomUUID(),
          patient_id: patientId,
          encounter_id: null,
          code: '85354-9',
          value_string: vitals.bloodPressure,
          unit: 'mmHg',
          created_at: new Date().toISOString(),
        });
      }
      
      if (vitals.temperature) {
        recordsToSave.push({
          id: crypto.randomUUID(),
          patient_id: patientId,
          encounter_id: null,
          code: '8310-5',
          value_string: vitals.temperature,
          unit: 'F',
          created_at: new Date().toISOString(),
        });
      }

      for (const payload of recordsToSave) {
        await db.observations.put(payload);

        if (isOnline) {
          await apiClient('/observations', {
            method: 'POST',
            body: JSON.stringify({
              patient_id: payload.patient_id,
              encounter_id: payload.encounter_id,
              code: payload.code,
              value_string: payload.value_string,
              unit: payload.unit
            }),
          });
        } else {
          await db.outbox.add({
            operation_id: crypto.randomUUID(),
            entity_type: 'observation',
            entity_id: payload.id,
            action: 'CREATE',
            payload,
            created_at: new Date().toISOString(),
          });
        }
      }

      showSuccess(t('auth.saved'));
    } catch (err) {
      console.error('Failed to save vitals', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCondition = async () => {
    if (!condition || !patientId) return;
    setIsSubmitting(true);
    const id = crypto.randomUUID();
    const payload = {
      id,
      patient_id: patientId,
      encounter_id: null,
      clinical_status: 'active' as const,
      disease_code: null,
      disease_name: condition,
      created_at: new Date().toISOString(),
    };

    try {
      await db.conditions.put(payload);

      if (isOnline) {
        await apiClient('/conditions', {
          method: 'POST',
          body: JSON.stringify({
            patient_id: payload.patient_id,
            encounter_id: payload.encounter_id,
            clinical_status: payload.clinical_status,
            disease_code: payload.disease_code,
            disease_name: payload.disease_name
          }),
        });
      } else {
        await db.outbox.add({
          operation_id: crypto.randomUUID(),
          entity_type: 'condition',
          entity_id: id,
          action: 'CREATE',
          payload,
          created_at: new Date().toISOString(),
        });
      }

      showSuccess(t('auth.saved'));
      setCondition('');
    } catch {
      console.error('Failed to add condition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAllergy = async () => {
    if (!allergy || !patientId) return;
    setIsSubmitting(true);
    const id = crypto.randomUUID();
    const payload = {
      id,
      patient_id: patientId,
      substance: allergy,
      criticality: 'unable_to_assess' as const,
      created_at: new Date().toISOString(),
    };

    try {
      await db.allergies.put(payload);

      if (isOnline) {
        await apiClient('/allergies', {
          method: 'POST',
          body: JSON.stringify({
            patient_id: payload.patient_id,
            substance: payload.substance,
            criticality: payload.criticality
          }),
        });
      } else {
        await db.outbox.add({
          operation_id: crypto.randomUUID(),
          entity_type: 'allergy',
          entity_id: id,
          action: 'CREATE',
          payload,
          created_at: new Date().toISOString(),
        });
      }

      showSuccess(t('auth.saved'));
      setAllergy('');
    } catch {
      console.error('Failed to add allergy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-neutral-900 font-sans">
      <div className="flex bg-gray-50 border-b border-gray-200">
        {(['vitals', 'conditions', 'allergies'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab 
                ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-sm z-10' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-t-2 border-transparent'
            }`}
          >
            {t(`clinical.${tab}`)}
          </button>
        ))}
      </div>

      <div className="p-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-lg mb-6 flex items-center gap-2 animate-fade-in">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="space-y-6 animate-fade-in text-neutral-900">
            <h4 className="text-lg font-bold text-gray-800 border-b pb-2">{t('clinical.record_vitals')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="heartRate" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('clinical.heart_rate')}</label>
                <div className="relative">
                  <input 
                    id="heartRate"
                    type="number" 
                    value={vitals.heartRate} 
                    onChange={e => setVitals(prev => ({...prev, heartRate: e.target.value}))}
                    placeholder="72"
                    className="block w-full rounded-xl border border-gray-300 pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" 
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-gray-400 font-bold text-xs">{t('clinical.bpm')}</span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="bloodPressure" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('clinical.blood_pressure')}</label>
                <div className="relative">
                  <input 
                    id="bloodPressure"
                    type="text" 
                    placeholder="120/80" 
                    value={vitals.bloodPressure} 
                    onChange={e => setVitals(prev => ({...prev, bloodPressure: e.target.value}))}
                    className="block w-full rounded-xl border border-gray-300 pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" 
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-gray-400 font-bold text-xs">{t('clinical.bp_unit')}</span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="temperature" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('clinical.temp')}</label>
                <div className="relative">
                  <input 
                    id="temperature"
                    type="number" 
                    step="0.1"
                    value={vitals.temperature} 
                    onChange={e => setVitals(prev => ({...prev, temperature: e.target.value}))}
                    placeholder="98.6"
                    className="block w-full rounded-xl border border-gray-300 pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" 
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-gray-400 font-bold text-xs">{t('clinical.temp_unit')}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button 
                onClick={handleSaveVitals}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
                {t('clinical.save_vitals')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'conditions' && (
          <div className="space-y-6 animate-fade-in text-neutral-900">
            <h4 className="text-lg font-bold text-gray-800 border-b pb-2">{t('clinical.record_conditions')}</h4>
            <div>
              <label htmlFor="condition" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('clinical.condition_name')}</label>
              <input 
                id="condition"
                type="text" 
                value={condition} 
                onChange={e => setCondition(e.target.value)}
                placeholder="e.g. Hypertension, Diabetes"
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" 
              />
            </div>
            <button 
              onClick={handleAddCondition}
              disabled={isSubmitting || !condition}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
              {t('clinical.add_condition')}
            </button>
          </div>
        )}

        {activeTab === 'allergies' && (
          <div className="space-y-6 animate-fade-in text-neutral-900">
            <h4 className="text-lg font-bold text-gray-800 border-b pb-2">{t('clinical.record_allergies')}</h4>
            <div>
              <label htmlFor="allergy" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('clinical.allergy_substance')}</label>
              <input 
                id="allergy"
                type="text" 
                value={allergy} 
                onChange={e => setAllergy(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts, Dust"
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" 
              />
            </div>
            <button 
              onClick={handleAddAllergy}
              disabled={isSubmitting || !allergy}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
              {t('clinical.add_allergy')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalForms;

// Helper icons
const RefreshCw = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
);
