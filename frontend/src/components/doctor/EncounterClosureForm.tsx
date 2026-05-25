import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';

const EncounterClosureForm: React.FC = () => {
  const { encounterId } = useParams<{ encounterId: string }>();
  const { t } = useTranslation();
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!summary.trim() || !encounterId) {
      setError(t('common.error'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient(`/encounters/${encounterId}/summary`, {
        method: 'POST',
        body: JSON.stringify({ clinical_summary: summary, outcome }),
      });
      setIsSuccess(true);
    } catch {
      console.error('Failed to close encounter');
      setError(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 p-8 rounded-2xl text-center animate-scale-up">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h3 className="text-xl font-bold text-green-900 mb-2">{t('clinical.encounter_finalized')}</h3>
        <p className="text-green-700 font-medium">{t('clinical.clinical_summary_saved')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-neutral-900 font-sans">
      <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">{t('clinical.encounter_closure')}</h3>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="summary" className="block text-sm font-semibold text-gray-700 mb-2">
            {t('clinical.summary')} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="summary"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('clinical.summary_placeholder')}
            className={`block w-full rounded-md border ${error ? 'border-red-300 ring-red-500' : 'border-gray-300'} px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y text-gray-900`}
            disabled={isSubmitting}
          />
          {error && <p className="text-red-500 text-sm mt-2 font-bold flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>{error}</p>}
        </div>

        <div>
          <label htmlFor="outcome" className="block text-sm font-semibold text-gray-700 mb-2">
            {t('clinical.outcome')}
          </label>
          <textarea
            id="outcome"
            rows={3}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder={t('clinical.outcome_placeholder')}
            className="block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y text-gray-900"
            disabled={isSubmitting}
          />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !summary.trim() || !encounterId}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 disabled:bg-blue-300 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('auth.verifying')}
              </>
            ) : t('clinical.finalize_encounter')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncounterClosureForm;
