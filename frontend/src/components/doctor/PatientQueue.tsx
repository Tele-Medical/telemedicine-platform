import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  status: string;
}

const PatientQueue: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const data = await apiClient('/doctor/queue');
        setQueue(data || []);
      } catch {
        console.error('Failed to load queue');
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 font-medium">{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-neutral-900 font-sans">
      <div className="flex justify-between items-center mb-6 border-b pb-3">
        <h3 className="text-xl font-bold text-gray-800">{t('clinical.patient_queue')}</h3>
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
          {queue.length} {t('clinical.waiting')}
        </span>
      </div>
      
      {queue.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-md border border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-500 font-medium">{t('clinical.no_patients_queue')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {queue.map(apt => (
            <li key={apt.id} className="py-4 flex justify-between items-center hover:bg-gray-50 px-3 -mx-3 rounded transition-colors group">
              <div>
                <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{apt.patientName}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>{new Date(apt.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="mx-2">•</span>
                  <span className="capitalize font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs">{apt.status}</span>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/consultation?appointmentId=${apt.id}`)}
                className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors shadow-sm active:scale-95"
              >
                {t('clinical.join_call')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PatientQueue;
