import React, { useState } from 'react';

interface Props {
  patientId: string;
}

export function ABHALink({ patientId }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [abhaAddress, setAbhaAddress] = useState('');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/abdm/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abha_address: abhaAddress })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to search');
      }
      
      // Auto-trigger OTP if found
      const otpRes = await fetch('/api/v1/abdm/init-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authMethod: 'OTP', abha_address: abhaAddress })
      });
      
      if (!otpRes.ok) throw new Error('Failed to initiate OTP');
      const otpData = await otpRes.json();
      
      setTxnId(otpData.txnId);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/abdm/confirm-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnId, otp })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to verify');
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Link ABHA Account</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Enter the patient's ABHA Address to fetch their records.</p>
          <input
            type="text"
            placeholder="Enter ABHA Address"
            value={abhaAddress}
            onChange={(e) => setAbhaAddress(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={!abhaAddress || loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">An OTP has been sent to the mobile number registered with {abhaAddress}.</p>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full p-2 border rounded text-center tracking-widest text-lg focus:ring-2 focus:ring-blue-500 outline-none"
            maxLength={6}
          />
          <button
            onClick={handleVerify}
            disabled={otp.length < 6 || loading}
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">ABHA Linked Successfully</h3>
          <p className="text-gray-600 text-sm mt-2">The patient's health records are now synchronized.</p>
        </div>
      )}
    </div>
  );
}
