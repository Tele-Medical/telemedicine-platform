import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';

interface Props {
  patientId: string;
}

export function ABHALink({ patientId }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [abhaAddress, setAbhaAddress] = useState('');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!abhaAddress || !patientId) return;
    setLoading(true);
    setError('');
    try {
      await apiClient('/abdm/search', {
        method: 'POST',
        body: JSON.stringify({ abha_id: abhaAddress })
      });
      
      // Auto-trigger OTP if found
      const otpData = await apiClient('/abdm/init-auth', {
        method: 'POST',
        body: JSON.stringify({ method: 'AADHAAR_OTP', abha_id: abhaAddress })
      });
      
      const resolvedTxnId = otpData.txn_id || otpData.txnId;
      if (!resolvedTxnId) throw new Error('Failed to initiate OTP');
      
      setTxnId(resolvedTxnId);
      setStep(2);
    } catch {
      console.error('ABHA search failed');
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6 || !txnId) return;
    setLoading(true);
    setError('');
    try {
      await apiClient('/abdm/confirm-auth', {
        method: 'POST',
        body: JSON.stringify({ txn_id: txnId, otp })
      });
      setStep(3);
    } catch {
      console.error('ABHA verification failed');
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto text-neutral-900 font-sans">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{t('profile.link_abha')}</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-danger/10 text-danger border border-danger/20 rounded text-sm font-bold">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">{t('profile.abha_desc')}</p>
          <input
            type="text"
            placeholder={t('profile.abha_placeholder')}
            value={abhaAddress}
            onChange={(e) => setAbhaAddress(e.target.value)}
            className="w-full p-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-gray-900"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={!abhaAddress || loading}
            className="w-full bg-primary hover:bg-primary-700 text-white p-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? t('auth.sending') : t('nav.search')}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">{t('profile.abha_otp_sent')} {abhaAddress}.</p>
          <input
            type="text"
            placeholder={t('auth.enter_otp')}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full p-2.5 border border-neutral-300 rounded-xl text-center tracking-widest text-lg font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-gray-900"
            maxLength={6}
            disabled={loading}
          />
          <button
            onClick={handleVerify}
            disabled={otp.length < 6 || loading}
            className="w-full bg-success hover:bg-success-700 text-white p-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? t('auth.verifying') : t('auth.verify_login')}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-6 animate-scale-in">
          <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4 border border-success/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">{t('profile.abha_success')}</h3>
          <p className="text-gray-600 text-sm mt-2">{t('profile.abha_sync_desc')}</p>
        </div>
      )}
    </div>
  );
}
