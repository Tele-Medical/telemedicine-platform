import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

const EncounterClosureForm: React.FC = () => {
  const { encounterId } = useParams<{ encounterId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Pre-fill follow-up date to exactly 7 days from now
  const getFutureDateString = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const [followUpDate, setFollowUpDate] = useState(getFutureDateString(7));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!summary.trim() || !encounterId) {
      setError(t('common.error'));
      return;
    }

    if (outcome === 'follow_up' && !followUpDate) {
      setError('Please select a valid follow-up date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient(`/encounters/${encounterId}/summary`, {
        method: 'POST',
        body: JSON.stringify({
          clinical_summary: summary,
          outcome: outcome || undefined,
          follow_up_date: outcome === 'follow_up' ? new Date(followUpDate).toISOString() : undefined,
          resolution_notes: outcome === 'completed' ? resolutionNotes : undefined,
        }),
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
      <div className="max-w-xl mx-auto my-12 bg-white border border-green-200 p-8 rounded-3xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 transform scale-100">
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-200 shadow-md animate-bounce">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-3">{t('clinical.encounter_finalized')}</h3>
        <p className="text-gray-600 font-medium mb-6">{t('clinical.clinical_summary_saved')}</p>
        <button
          onClick={() => navigate('/practitioner/queue')}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        >
          Return to Patient Queue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 bg-neutral-50/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-neutral-200/60 text-neutral-800 font-sans">
      <div className="flex items-center gap-3 border-b border-neutral-200/80 pb-5 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight">{t('clinical.encounter_closure')}</h3>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">Finalize consultation, clinical notes, and patient care loop status.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Clinical Summary Text Area */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm transition-all hover:border-neutral-300">
          <label htmlFor="summary" className="block text-sm font-bold text-neutral-800 mb-2">
            {t('clinical.summary')} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="summary"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('clinical.summary_placeholder')}
            className={`block w-full rounded-xl border ${error ? 'border-red-300 ring-1 ring-red-500' : 'border-neutral-300/80'} px-4 py-3 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-neutral-900 bg-neutral-50/30 placeholder-neutral-400`}
            disabled={isSubmitting}
          />
          {error && (
            <p className="text-red-600 text-sm mt-3 font-semibold flex items-center gap-1.5 animate-pulse">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Outcome Selector */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm transition-all hover:border-neutral-300">
          <label htmlFor="outcome" className="block text-sm font-bold text-neutral-800 mb-2">
            {t('clinical.outcome')}
          </label>
          <div className="relative">
            <select
              id="outcome"
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setError(null);
              }}
              className="block w-full appearance-none rounded-xl border border-neutral-300/80 px-4 py-3 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-neutral-900 bg-neutral-50/30 font-medium"
              disabled={isSubmitting}
            >
              <option value="">-- Select Patient Care State --</option>
              <option value="completed">🟢 Cured & Discharged (Discharge from loop)</option>
              <option value="follow_up">🟡 Needs Follow-up (Auto-book pre-confirmed appointment)</option>
              <option value="referred">🔵 Referred (Referred to hospital/specialist)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Cured & Discharged Configuration */}
        {outcome === 'completed' && (
          <div className="bg-green-50/60 p-5 rounded-2xl border border-green-200/80 shadow-sm animate-slide-down">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
              <h4 className="text-sm font-black text-green-900 uppercase tracking-wider">Cured & Discharged</h4>
            </div>
            <label htmlFor="resolutionNotes" className="block text-xs font-bold text-green-800 mb-1.5 uppercase tracking-wide">
              Resolution / Discharge Notes (Optional)
            </label>
            <textarea
              id="resolutionNotes"
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Explain how the patient recovered, and any self-care steps..."
              className="block w-full rounded-xl border border-green-200 px-4 py-3 shadow-inner focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 text-neutral-900 bg-white placeholder-green-400/80 text-sm font-medium"
            />
          </div>
        )}

        {/* Needs Follow-up Configuration */}
        {outcome === 'follow_up' && (
          <div className="bg-yellow-50/60 p-5 rounded-2xl border border-yellow-200/80 shadow-sm animate-slide-down">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">!</div>
              <h4 className="text-sm font-black text-yellow-900 uppercase tracking-wider">Schedule Follow-up</h4>
            </div>
            <label htmlFor="followUpDate" className="block text-xs font-bold text-yellow-800 mb-1.5 uppercase tracking-wide">
              Follow-up Consultation Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              id="followUpDate"
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="block w-full rounded-xl border border-yellow-200 px-4 py-3 shadow-inner focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 text-neutral-900 bg-white text-sm font-bold"
              required
            />
            <p className="text-xs text-yellow-700/80 mt-2 font-medium">Auto-books a pre-confirmed future consultation linked to this care loop.</p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-neutral-200/60">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !summary.trim() || !encounterId}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl disabled:from-neutral-300 disabled:to-neutral-400 disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Summary...
              </>
            ) : t('clinical.finalize_encounter')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncounterClosureForm;
