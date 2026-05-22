import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Appointment {
  scheduled_for?: string;
  practitioner_name?: string;
  practitioner_role?: string;
  id?: string;
  status?: string;
}

interface UpcomingAppointmentCardProps {
  appointment?: Appointment | null;
}

const UpcomingAppointmentCard: React.FC<UpcomingAppointmentCardProps> = ({ appointment }) => {
  const navigate = useNavigate();

  const formattedDate = React.useMemo(() => {
    if (!appointment || !appointment.scheduled_for) return '';
    try {
      const date = new Date(appointment.scheduled_for);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return '';
    }
  }, [appointment]);

  if (!appointment) return null;

  const initial = appointment.practitioner_name
    ? appointment.practitioner_name.trim().charAt(0).toUpperCase()
    : 'P';

  const statusText = appointment.status
    ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).toLowerCase()
    : 'Scheduled';

  return (
    <div className="bg-surface rounded-2xl shadow-soft p-5 border border-black/5 flex flex-col gap-4 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Upcoming Consultation</h2>
          {formattedDate && <p className="text-sm text-text-secondary">{formattedDate}</p>}
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
          {statusText}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center text-secondary font-bold text-xl">
          {initial}
        </div>
        <div>
          <h3 className="font-medium text-text-primary">{appointment.practitioner_name || 'Practitioner'}</h3>
          <p className="text-sm text-text-secondary">{appointment.practitioner_role || 'Healthcare Provider'}</p>
        </div>
      </div>
      
      <button 
        onClick={() => navigate('/consultation')}
        aria-label="Join Video Consultation Call"
        className="mt-2 w-full bg-primary hover:bg-primary/90 transition-colors text-white py-3 rounded-full font-medium shadow-md shadow-primary/30 flex justify-center items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span>Join Video Call</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
      </button>
    </div>
  );
};

export default UpcomingAppointmentCard;
