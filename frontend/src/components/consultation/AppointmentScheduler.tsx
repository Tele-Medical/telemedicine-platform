import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { db } from '../../db/db';
import { User } from 'lucide-react';

interface Practitioner {
  id: string;
  name?: string;
  full_name?: string;
  specialization?: string;
  specialty?: string;
}

interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  guardian_name?: string;
}

const AppointmentScheduler: React.FC<{ patientId?: string }> = ({ patientId: propPatientId }) => {
  const { t } = useTranslation();
  const { patientId: paramPatientId } = useParams<{ patientId?: string }>();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId');
  
  // Resolve patientId from props, url params, or query params
  const resolvedPatientId = propPatientId || paramPatientId || queryPatientId || '';

  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [triagePriority, setTriagePriority] = useState('Standard');

  // New states for dynamic patient selection fallback
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(resolvedPatientId);
  const [selectedPatientName, setSelectedPatientName] = useState('');

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

  // Fetch registered patients from IndexedDB
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const localPatients = await db.patients.toArray();
        // Convert local patient records to Patient interface
        const formatted = localPatients.map(p => ({
          id: String(p.id),
          full_name: String(p.full_name || ''),
          phone: String(p.phone || ''),
          guardian_name: String(p.guardian_name || '')
        }));
        setPatients(formatted);

        if (resolvedPatientId) {
          const match = formatted.find(p => p.id === resolvedPatientId);
          if (match) {
            setSelectedPatientName(match.full_name);
          } else {
            // Check hardcoded or fallback
            setSelectedPatientName(`Patient (ID: ${resolvedPatientId.substring(0, 8)})`);
          }
        }
      } catch (err) {
        console.error('Failed to load local patients', err);
      }
    };
    loadPatients();
  }, [resolvedPatientId]);

  // Keep selected patient ID in sync with resolved ID from URL/props
  useEffect(() => {
    if (resolvedPatientId) {
      setSelectedPatientId(resolvedPatientId);
    }
  }, [resolvedPatientId]);

  // Update selected patient name when selectedPatientId changes
  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const match = patients.find(p => p.id === selectedPatientId);
      if (match) {
        setSelectedPatientName(match.full_name);
      }
    }
  }, [selectedPatientId, patients]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate || !selectedPatientId) return;

    setStatus('loading');
    setErrorMsg('');
    try {
      await apiClient('/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: selectedPatientId,
          practitioner_id: selectedDoctor,
          scheduled_for: appointmentDate,
          channel: 'assisted',
          chief_complaint: chiefComplaint,
          triage_priority: triagePriority
        })
      });
      setStatus('success');
      setChiefComplaint('');
      setTriagePriority('Standard');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to book appointment', error);
      if (error?.message === 'Patient not found') {
        setErrorMsg('Failed to book: This patient is currently in your offline queue and has not been synced online yet. Please synchronize your database first.');
      } else {
        setErrorMsg(t('clinical.booking_failed'));
      }
      setStatus('error');
    }
  };


  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 mt-6 max-w-xl text-neutral-900 font-sans">
      <h3 className="text-lg font-bold mb-5 text-gray-800 border-b pb-2">{t('clinical.schedule_consultation')}</h3>
      <form onSubmit={handleBook} className="space-y-5">
        
        {/* Patient Select / Info Panel */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('clinical.patient')}
          </label>
          {resolvedPatientId ? (
            <div className="flex items-center gap-3 bg-teal-50/50 border border-teal-200/50 p-3.5 rounded-xl shadow-sm">
              <div className="w-10 h-10 rounded-full bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/30">
                <User size={18} className="stroke-[2.25]" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">{selectedPatientName}</p>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">ID: {resolvedPatientId.substring(0, 8)}...</p>
              </div>
            </div>
          ) : (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="block w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white text-neutral-800 text-sm font-medium"
            >
              <option value="" disabled>-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.phone ? `(${p.phone})` : p.guardian_name ? `(Guardian: ${p.guardian_name})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Doctor Selection */}
        <div>
          <label htmlFor="doctor" className="block text-sm font-semibold text-gray-700 mb-1">{t('clinical.select_doctor')}</label>
          <select
            id="doctor"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="block w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white text-neutral-800 text-sm font-medium"
          >
            <option value="" disabled>-- {t('clinical.select_doctor')} --</option>
            {practitioners.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.full_name || doc.name || 'Unknown Doctor'} - {doc.specialty || doc.specialization || 'Generalist'}
              </option>
            ))}
          </select>
        </div>

        {/* DateTime Selection */}
        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-1">{t('clinical.appt_datetime')}</label>
          <input
            id="date"
            type="datetime-local"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            className="block w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 text-neutral-800 text-sm font-medium"
          />
        </div>

        {/* Chief Complaint / Symptoms */}
        <div>
          <label htmlFor="chiefComplaint" className="block text-sm font-semibold text-gray-700 mb-1">
            Chief Complaint / Symptoms
          </label>
          <textarea
            id="chiefComplaint"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            rows={3}
            placeholder="Describe patient symptoms or main complaint..."
            className="block w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 text-neutral-800 text-sm font-medium bg-white"
          />
        </div>

        {/* Triage Urgency Level */}
        <div>
          <label htmlFor="triagePriority" className="block text-sm font-semibold text-gray-700 mb-1">
            Triage Urgency Level
          </label>
          <select
            id="triagePriority"
            value={triagePriority}
            onChange={(e) => setTriagePriority(e.target.value)}
            className="block w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white text-neutral-800 text-sm font-medium"
          >
            <option value="Standard">Standard</option>
            <option value="Urgent">Urgent</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={status === 'loading' || !selectedDoctor || !appointmentDate || !selectedPatientId}
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
          <p className="text-sm text-danger font-bold text-center mt-2">{errorMsg || t('clinical.booking_failed')}</p>
        )}
      </form>
    </div>
  );
};

export default AppointmentScheduler;
