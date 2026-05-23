import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';

interface Props {
  patientId: string;
  onComplete: () => void;
}

export function ConsentFormModal({ patientId, onComplete }: Props) {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!agreed || !patientId) return;
    setLoading(true);
    setError('');

    try {
      await apiClient(`/patients/${patientId}/consents`, {
        method: 'POST',
        body: JSON.stringify({ 
          purpose: 'CLINICAL_CARE',
          status: 'GRANTED'
        })
      });
      onComplete();
    } catch {
      console.error('Failed to record consent');
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 outline-none text-neutral-900 font-sans"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-neutral-200 animate-scale-up">
        <h2 id="consent-title" className="text-2xl font-bold mb-6 text-neutral-900">
          {t('clinical.consent_title')}
        </h2>
        
        <div id="consent-desc" className="bg-neutral-50 border border-neutral-200 p-5 rounded-xl text-sm text-neutral-700 h-56 overflow-y-auto mb-6 leading-relaxed">
          <p className="mb-3 font-semibold">{t('clinical.consent_agree')}</p>
          <ul className="list-disc pl-5 space-y-3 font-medium text-xs">
            <li>{t('clinical.consent_item1')}</li>
            <li>{t('clinical.consent_item2')}</li>
            <li>{t('clinical.consent_item3')}</li>
            <li>{t('clinical.consent_item4')}</li>
          </ul>
        </div>

        {error && <div className="text-danger font-bold text-sm mb-4">{error}</div>}

        <label className="flex items-start gap-3 cursor-pointer mb-8 group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 text-primary rounded-lg border-neutral-300 focus:ring-primary focus:ring-offset-2 outline-none transition-all"
            aria-label={t('clinical.consent_agree')}
          />
          <span className="text-neutral-700 font-bold text-sm group-hover:text-primary transition-colors">
            {t('clinical.consent_item1')}
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!agreed || loading || !patientId}
          className="w-full bg-primary hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-lg active:scale-[0.98]"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('auth.verifying')}
            </div>
          ) : t('nav.next')}
        </button>
      </div>
    </div>
  );
}
