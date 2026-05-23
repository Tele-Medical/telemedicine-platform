import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const EncounterClosureForm: React.FC<{ encounterId: string }> = ({ encounterId }) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const handleFinalize = async () => {
    if (!summary.trim()) {
      setError('Clinical Summary is required');
      return;
    }
    setError('');
    setStatus('saving');

    try {
      await fetch(`/api/v1/encounters/${encounterId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, outcome })
      });
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 p-8 rounded-xl border border-green-200 text-center shadow-sm">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4 shadow-sm">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-green-900 mb-2">{t('clinical.encounter_finalized')}</h3>
        <p className="text-green-700 font-medium">{t('clinical.clinical_summary_saved', 'The clinical summary has been securely saved to the patient record.')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-neutral-900">
      <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">{t('clinical.encounter_closure')}</h3>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="summary" className="block text-sm font-semibold text-gray-700 mb-2">
            Clinical Summary <span className="text-red-500">*</span>
          </label>
          <textarea
            id="summary"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Document patient's presenting symptoms, physical findings, and medical assessment..."
            className={`block w-full rounded-md border ${error ? 'border-red-300 ring-red-500' : 'border-gray-300'} px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y`}
          />
          {error && <p className="text-red-500 text-sm mt-2 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>{error}</p>}
        </div>

        <div>
          <label htmlFor="outcome" className="block text-sm font-semibold text-gray-700 mb-2">
            Outcome & Treatment Plan
          </label>
          <textarea
            id="outcome"
            rows={3}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Prescribed medications, recommended lifestyle changes, scheduled follow-up..."
            className="block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={handleFinalize}
            disabled={status === 'saving'}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex justify-center items-center shadow-sm"
          >
            {status === 'saving' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('app.loading')}
              </>
            ) : t('clinical.finalize_encounter')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncounterClosureForm;
