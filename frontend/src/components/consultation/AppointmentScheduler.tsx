import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';

interface Practitioner {
  id: string;
  name: string;
  specialization: string;
}

const AppointmentScheduler: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { t } = useTranslation();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await apiClient('/practitioners/');
        setPractitioners(data || []);
      } catch {
        console.error('Failed to fetch practitioners');
      }
    };
    fetchDocs();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate || !patientId) return;

    setStatus('loading');
    try {
      await apiClient('/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          practitioner_id: selectedDoctor,
          scheduled_for: appointmentDate,
          channel: 'assisted'
        })
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      console.error('Failed to book appointment');
      setStatus('error');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6 max-w-xl text-neutral-900 font-sans">
      <h3 className="text-lg font-bold mb-5 text-gray-800 border-b pb-2">{t('clinical.schedule_consultation')}</h3>
      <form onSubmit={handleBook} className="space-y-5">
        <div>
          <label htmlFor="doctor" className="block text-sm font-semibold text-gray-700 mb-1">{t('clinical.select_doctor')}</label>
          <select
            id="doctor"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="" disabled>-- {t('clinical.select_doctor')} --</option>
            {practitioners.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.name} - {doc.specialization}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-1">{t('clinical.appt_datetime')}</label>
          <input
            id="date"
            type="datetime-local"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={status === 'loading' || !selectedDoctor || !appointmentDate || !patientId}
            className={`w-full text-white px-4 py-3 rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md ${
              status === 'success' 
                ? 'bg-success hover:bg-success-700 focus:ring-success/30' 
                : 'bg-primary hover:bg-primary-700 focus:ring-primary/30 disabled:bg-neutral-300 disabled:cursor-not-allowed'
            }`}
          >
            {status === 'loading' ? t('auth.sending') : status === 'success' ? `${t('common.success')} ✓` : t('clinical.book_appointment')}
          </button>
        </div>
        
        {status === 'error' && (
          <p className="text-sm text-danger font-bold text-center mt-2">{t('clinical.booking_failed')}</p>
        )}
      </form>
    </div>
  );
};

export default AppointmentScheduler;
