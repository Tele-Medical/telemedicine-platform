import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, AlertCircle, ArrowRight, Play, CheckCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';

interface QueuePatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  complaint: string;
  triage: 'Critical' | 'Urgent' | 'Standard';
  waitTime: string;
  status: 'Waiting' | 'In Consultation' | 'Completed';
  appointmentId: string;
}

const Queue: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient('/appointments/queue');
      setPatients(data || []);
    } catch (err) {
      console.error('Failed to fetch doctor queue:', err);
      setError('Failed to fetch the active patient queue. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleStartConsult = (appointmentId: string) => {
    // Navigate to live consult WebRTC page
    navigate(`/consultation?appointmentId=${appointmentId}`);
  };

  const getTriageBadgeColor = (triage: string) => {
    switch (triage) {
      case 'Critical':
        return 'bg-danger/10 text-danger border-danger/20';
      case 'Urgent':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'Standard':
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-900 font-sans">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-neutral-500 font-medium">Loading active doctor queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-neutral-200/60 p-8 text-center max-w-md mx-auto mt-12 text-neutral-900 font-sans shadow-sm">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
          <AlertCircle size={24} className="stroke-[2.25]" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">Failed to Load Queue</h3>
        <p className="text-neutral-500 text-sm mb-6">{error}</p>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white font-bold text-sm px-6 py-3 rounded-full shadow-md shadow-primary/10"
        >
          <RefreshCw size={16} className="shrink-0" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-12 text-neutral-900">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('clinical.queue_title')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('clinical.queue_desc')}</p>
      </header>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900">
              {patients.filter(p => p.status === 'Waiting').length}
            </div>
            <div className="text-xs text-neutral-500 font-semibold mt-0.5">{t('clinical.patients_waiting')}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
            <AlertCircle size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900">
              {patients.filter(p => p.triage === 'Critical' || p.triage === 'Urgent').length}
            </div>
            <div className="text-xs text-neutral-500 font-semibold mt-0.5">{t('clinical.high_priority')}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <Clock size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900">8 {t('clinical.mins')}</div>
            <div className="text-xs text-neutral-500 font-semibold mt-0.5">{t('clinical.avg_triage_time')}</div>
          </div>
        </div>
      </div>

      {/* Patient Queue Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('clinical.active_queue')}</h2>
        
        {patients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 text-center">
            <CheckCircle size={40} className="text-success mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-900">{t('clinical.queue_clear')}</h3>
            <p className="text-neutral-500 text-sm mt-1">{t('clinical.no_waiting_queue')}</p>
          </div>
        ) : (
          [...patients]
            .sort((a, b) => {
              // Critical first, then Urgent, then Standard
              const priority = { Critical: 3, Urgent: 2, Standard: 1 };
              return priority[b.triage] - priority[a.triage];
            })
            .map((patient) => (
              <div 
                key={patient.id} 
                className="bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-sm">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">{patient.name}</h3>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                        {patient.age} Yrs • {patient.gender} • ID: {patient.id}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${getTriageBadgeColor(patient.triage)}`}>
                      {t(`clinical.${patient.triage.toLowerCase()}`)}
                    </span>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3.5 text-sm text-neutral-700 font-medium">
                    <span className="text-neutral-400 font-semibold text-xs block mb-1">{t('clinical.chief_complaint')}</span>
                    {patient.complaint}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-neutral-100 pt-4 md:pt-0 shrink-0">
                  <div className="text-right flex items-center md:flex-col gap-1.5 md:gap-0">
                    <span className="text-xs text-neutral-400 font-semibold">{t('clinical.wait_time')}</span>
                    <div className="text-sm font-bold text-neutral-700 flex items-center gap-1">
                      <Clock size={14} className="text-neutral-400" />
                      <span>{patient.waitTime}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartConsult(patient.appointmentId)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white font-bold text-sm px-5 py-3 rounded-full shadow-md shadow-primary/10"
                  >
                    <Play size={14} className="fill-current text-white shrink-0" />
                    <span>{t('clinical.start_consultation')}</span>
                    <ArrowRight size={14} className="shrink-0" />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Queue;
