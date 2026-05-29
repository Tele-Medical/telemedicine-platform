import React, { useState } from 'react';
import UpcomingAppointmentCard from './UpcomingAppointmentCard';
import VitalsWidget from './VitalsWidget';
import RecentRecordsList from './RecentRecordsList';
import { appointmentService, authService } from '../../api/services';
import { apiClient } from '../../api/client';
import { AlertCircle, Calendar, PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SymptomIntakeWizard } from '../consultation/SymptomIntakeWizard';

interface User {
  full_name?: string;
  phone?: string;
  patient_id?: string;
}

interface Appointment {
  id: string;
  practitioner_name?: string;
  practitioner_role?: string;
  scheduled_for?: string;
  status: string;
}

const PatientDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeLoop, setActiveLoop] = useState<any | null>(null);
  const [latestResolvedLoop, setLatestResolvedLoop] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const activePatientId = localStorage.getItem('active_patient_id');
  const activePatientName = localStorage.getItem('active_patient_name');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await authService.getMe();
      setUser(userData);
      
      const validActivePatientId = activePatientId && activePatientId !== 'undefined' ? activePatientId : null;
      const selectedPatientId = validActivePatientId || userData?.patient_id;
      
      const appts = await appointmentService.getAppointments(selectedPatientId || undefined);
      setAppointments(appts || []);

      if (selectedPatientId) {
        try {
          const activeLoopData = await apiClient(`/care-loops/active?patient_id=${selectedPatientId}`);
          setActiveLoop(activeLoopData);
          if (!activeLoopData) {
            const resolvedLoopData = await apiClient(`/care-loops/latest-resolved?patient_id=${selectedPatientId}`);
            setLatestResolvedLoop(resolvedLoopData);
          } else {
            setLatestResolvedLoop(null);
          }
        } catch (err) {
          console.error("Error loading care loop data:", err);
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(t('app.sync_failed'));
    } finally {
      setLoading(false);
    }
  }, [t, activePatientId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestCare = () => {
    setShowWizard(true);
  };

  const handleBookWithSymptoms = async (intakeData: { raw_text: string, symptoms: string[], severity: string, duration: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await authService.getMe();
      const patientId = activePatientId || currentUser?.patient_id;
      
      if (!patientId) {
        console.error("Patient profile not found in current user");
        setError(t('clinical.booking_failed', 'Booking failed: patient profile not found'));
        return;
      }

      await apiClient('/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          channel: 'telemedicine',
          scheduled_for: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          chief_complaint: intakeData.raw_text,
          triage_priority: intakeData.severity === 'Severe' ? 'Critical' : 'Standard',
          symptom_intake: intakeData
        })
      });

      await loadData();
    } catch (err) {
      console.error("Failed to book real appointment:", err);
      setError(t('clinical.booking_failed', 'Booking failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-6 pb-24 animate-pulse">
        <header className="mb-6 mt-2 space-y-2">
          <div className="h-8 bg-neutral-200 rounded-lg w-48"></div>
          <div className="h-4 bg-neutral-200 rounded-lg w-32"></div>
        </header>
        <div className="h-40 bg-neutral-200 rounded-2xl w-full"></div>
        <div className="h-32 bg-neutral-200 rounded-2xl w-full"></div>
        <div className="h-48 bg-neutral-200 rounded-2xl w-full"></div>
      </div>
    );
  }

  const isDemoUser = user?.phone === '+919800000001' || user?.full_name?.toLowerCase().includes('ravi');

  return (
    <div className="p-4 max-w-3xl mx-auto animate-fade-in pb-24">
      {showWizard && (
        <SymptomIntakeWizard
          onComplete={async (intakeData) => {
            setShowWizard(false);
            await handleBookWithSymptoms(intakeData);
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {t('app.good_morning')}{activePatientName ? `, ${activePatientName}` : user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-neutral-500 text-sm mt-1">{t('app.health_overview')}</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button 
            onClick={loadData}
            className="px-3 py-1.5 bg-danger/10 border border-danger/30 hover:bg-danger/20 text-danger rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all outline-none"
          >
            <RefreshCw size={12} />
            <span>{t('app.retry')}</span>
          </button>
        </div>
      )}

      <main className="space-y-6">
        {activeLoop && (
          <div className="mb-2 p-5 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-3xl flex items-start gap-4 shadow-sm animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/10 shrink-0 mt-0.5">
              <Calendar size={20} className="stroke-[2.25]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-amber-200/85 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Under Follow-up
                </span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Active Consultation Loop</h3>
              <p className="text-xs text-neutral-600 font-medium">
                Chief Complaint: <span className="font-bold text-neutral-800">"{activeLoop.chief_complaint}"</span>
              </p>
            </div>
          </div>
        )}

        {appointments.length > 0 ? (
          <UpcomingAppointmentCard appointment={appointments[0]} />
        ) : latestResolvedLoop ? (
          /* Premium Care Resolved - Cured & Healthy Card */
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/80 rounded-3xl p-8 text-center flex flex-col items-center gap-5 shadow-sm animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md shadow-green-500/15">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-black uppercase tracking-widest">
                Care Resolved - Cured & Healthy!
              </div>
              <h2 className="text-xl font-black text-neutral-900">You are in peak health!</h2>
              {latestResolvedLoop.resolution_notes && (
                <div className="bg-white/80 border border-green-100 rounded-2xl p-4 mt-2 max-w-md mx-auto shadow-inner text-left">
                  <p className="text-[10px] font-extrabold text-green-800 uppercase tracking-wider mb-1">Doctor's Recovery Notes</p>
                  <p className="text-sm font-medium text-neutral-700 italic">
                    "{latestResolvedLoop.resolution_notes}"
                  </p>
                </div>
              )}
              <p className="text-neutral-500 text-xs font-medium max-w-sm mt-3 mx-auto">
                Your care loop for <span className="font-bold text-neutral-700">"{latestResolvedLoop.chief_complaint}"</span> was successfully concluded. Feel free to request care at any time if symptoms return.
              </p>
            </div>
            <button 
              onClick={handleRequestCare}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98] transition-all text-white font-bold rounded-full shadow-md shadow-emerald-500/10 flex items-center gap-2 text-sm outline-none"
            >
              <PlusCircle size={18} />
              <span>Request New Care Loop</span>
            </button>
          </div>
        ) : (
          /* Proper design compliant Empty State Card */
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,.08)] p-6 border border-neutral-200/60 flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Calendar size={28} className="stroke-[2.25]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-neutral-900">{t('clinical.no_appointments')}</h2>
              <p className="text-neutral-500 text-sm max-w-md">
                {t('clinical.need_specialist')}
              </p>
            </div>
            <button 
              onClick={handleRequestCare}
              className="px-6 py-3 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white font-semibold rounded-full shadow-md shadow-primary/20 flex items-center gap-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <PlusCircle size={18} />
              <span>{t('clinical.book_appointment')}</span>
            </button>
          </div>
        )}
        
        <VitalsWidget isDemo={isDemoUser} patientId={activePatientId || user?.patient_id} />
        <RecentRecordsList isDemo={isDemoUser} patientId={activePatientId || user?.patient_id} />
      </main>
    </div>
  );
};

export default PatientDashboard;
