import React, { useState } from 'react';
import UpcomingAppointmentCard from './UpcomingAppointmentCard';
import VitalsWidget from './VitalsWidget';
import RecentRecordsList from './RecentRecordsList';
import { appointmentService, authService } from '../../api/services';
import { apiClient } from '../../api/client';
import { AlertCircle, Calendar, PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await authService.getMe();
      setUser(userData);
      
      const appts = await appointmentService.getAppointments();
      setAppointments(appts || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(t('app.sync_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestCare = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await authService.getMe();
      const patientId = currentUser?.patient_id;
      
      if (!patientId) {
        console.error("Patient profile not found in current user");
        setError(t('clinical.booking_failed', 'Booking failed: patient profile not found'));
        return;
      }

      let doctorId: string | null = null;
      try {
        const docs = await apiClient('/practitioners');
        if (docs && docs.length > 0) {
          doctorId = docs[0].id;
        }
      } catch (err) {
        console.warn("Failed to fetch practitioners", err);
      }

      if (!doctorId) {
        setError(t('clinical.booking_failed', 'Booking failed: no practitioner available'));
        return;
      }

      await apiClient('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          practitioner_id: doctorId,
          channel: 'telemedicine',
          scheduled_for: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
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
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {t('app.good_morning')}{user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-neutral-500 text-sm mt-1">{t('app.health_overview')}</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-semibold">{t('app.sync_failed')}</span>
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
        {appointments.length > 0 ? (
          <UpcomingAppointmentCard appointment={appointments[0]} />
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
        
        <VitalsWidget isDemo={isDemoUser} />
        <RecentRecordsList isDemo={isDemoUser} />
      </main>
    </div>
  );
};

export default PatientDashboard;
