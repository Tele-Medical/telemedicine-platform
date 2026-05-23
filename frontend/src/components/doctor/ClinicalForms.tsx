import React, { useState } from 'react';
import { db } from '../../db/db';

const ClinicalForms: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [activeTab, setActiveTab] = useState<'vitals' | 'conditions' | 'allergies'>('vitals');

  const [vitals, setVitals] = useState({ heartRate: '', bloodPressure: '', temperature: '' });
  const [condition, setCondition] = useState('');
  const [allergy, setAllergy] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSaveVitals = async () => {
    const id = crypto.randomUUID();
    const payload = {
      id,
      patient_id: patientId,
      heart_rate: vitals.heartRate,
      blood_pressure: vitals.bloodPressure,
      created_at: new Date().toISOString(),
    };

    try {
      await db.observations.put(payload);

      if (navigator.onLine) {
        await fetch('/api/v1/observations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await db.outbox.add({
          operation_id: crypto.randomUUID(),
          entity_type: 'observation',
          entity_id: id,
          action: 'CREATE',
          payload,
          created_at: new Date().toISOString(),
        });
      }

      showSuccess('Vitals saved successfully');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCondition = async () => {
    if (!condition) return;
    const id = crypto.randomUUID();
    const payload = {
      id,
      patient_id: patientId,
      name: condition,
      created_at: new Date().toISOString(),
    };

    try {
      await db.conditions.put(payload);

      if (navigator.onLine) {
        await fetch('/api/v1/conditions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

      showSuccess('Condition added successfully');
      setCondition('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAllergy = async () => {
    if (!allergy) return;
    const id = crypto.randomUUID();
    const payload = {
      id,
      patient_id: patientId,
      substance: allergy,
      created_at: new Date().toISOString(),
    };

    try {
      await db.allergies.put(payload);

      if (navigator.onLine) {
        await fetch('/api/v1/allergies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

      showSuccess('Allergy added successfully');
      setAllergy('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex bg-gray-50 border-b border-gray-200">
        {['vitals', 'conditions', 'allergies'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab 
                ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-sm z-10' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-t-2 border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {successMessage && (
          <p className="text-green-600 text-sm font-medium mb-4">{successMessage}</p>
        )}

        {activeTab === 'vitals' && (
          <div className="space-y-5 animate-fadeIn">
            <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Record Vitals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="heartRate" className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
                <div className="relative">
                  <input 
                    id="heartRate"
                    type="number" 
                    value={vitals.heartRate} 
                    onChange={e => setVitals({...vitals, heartRate: e.target.value})}
                    placeholder="e.g. 72"
                    className="block w-full rounded-md border border-gray-300 pl-3 pr-12 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-400 sm:text-sm">bpm</span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="bloodPressure" className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                <div className="relative">
                  <input 
                    id="bloodPressure"
                    type="text" 
                    placeholder="e.g. 120/80" 
                    value={vitals.bloodPressure} 
                    onChange={e => setVitals({...vitals, bloodPressure: e.target.value})}
                    className="block w-full rounded-md border border-gray-300 pl-3 pr-12 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-400 sm:text-sm">mmHg</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button 
                onClick={handleSaveVitals}
                className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Save Vitals
              </button>
            </div>
          </div>
        )}

        {activeTab === 'conditions' && (
          <div className="space-y-5 animate-fadeIn">
            <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Record Conditions</h4>
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">Condition Name</label>
              <input 
                id="condition"
                type="text" 
                value={condition} 
                onChange={e => setCondition(e.target.value)}
                placeholder="e.g. Hypertension, Diabetes"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
              />
            </div>
            <button 
              onClick={handleAddCondition}
              className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add Condition
            </button>
          </div>
        )}

        {activeTab === 'allergies' && (
          <div className="space-y-5 animate-fadeIn">
            <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Record Allergies</h4>
            <div>
              <label htmlFor="allergy" className="block text-sm font-medium text-gray-700 mb-1">Allergy Substance</label>
              <input 
                id="allergy"
                type="text" 
                value={allergy} 
                onChange={e => setAllergy(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts, Dust"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
              />
            </div>
            <button 
              onClick={handleAddAllergy}
              className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add Allergy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalForms;
