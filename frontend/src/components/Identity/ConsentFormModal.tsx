import { useState, useEffect, useRef } from 'react';

interface Props {
  patientId: string;
  onComplete: () => void;
}

export function ConsentFormModal({ patientId, onComplete }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus container on mount for screen readers and keyboard users
    modalRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!agreed) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/patients/${patientId}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          purpose: 'CLINICAL_CARE',
          status: 'GRANTED'
        })
      });

      if (!res.ok) throw new Error('Failed to record consent');
      
      onComplete();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to record consent');
      }
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 outline-none"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h2 id="consent-title" className="text-2xl font-bold mb-4 text-gray-800">
          Digital Consent Form
        </h2>
        
        <div id="consent-desc" className="bg-gray-50 border p-4 rounded text-sm text-gray-700 h-48 overflow-y-auto mb-6">
          <p className="mb-2">By checking the box below, you (the patient or authorized guardian) agree to the following:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>I consent to the storage and processing of my Personal Health Information (PHI) by this telemedicine platform.</li>
            <li>I allow authorized clinicians and staff to view my clinical history to provide medical care.</li>
            <li>I understand that this data will be stored securely and may be synced with the national ABDM network if linked.</li>
            <li>I reserve the right to revoke this consent at any time by speaking to the clinic administrator.</li>
          </ul>
        </div>

        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-offset-2 outline-none"
            aria-label="I agree to the consent terms"
          />
          <span className="text-gray-800 font-medium">
            I consent to the storage and processing of my data for clinical purposes.
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!agreed || loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {loading ? 'Recording Consent...' : 'Agree & Continue'}
        </button>
      </div>
    </div>
  );
}
