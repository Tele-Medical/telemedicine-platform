import React, { useEffect, useState } from 'react';
import UpcomingAppointmentCard from './UpcomingAppointmentCard';
import VitalsWidget from './VitalsWidget';
import RecentRecordsList from './RecentRecordsList';
import { appointmentService, authService } from '../../api/services';

interface User {
  full_name?: string;
}

interface Appointment {
  id: string;
  practitioner_name?: string;
  practitioner_role?: string;
  scheduled_for?: string;
  status: string;
}

const PatientDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await authService.getMe();
        setUser(userData);
        
        const appts = await appointmentService.getAppointments();
        setAppointments(appts);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    };
    
    loadData();
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in pb-24">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Good morning{user ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-text-secondary mt-1">Here is your health overview.</p>
      </header>

      <main>
        {appointments.length > 0 ? (
          <UpcomingAppointmentCard appointment={appointments[0]} />
        ) : (
          <UpcomingAppointmentCard />
        )}
        <VitalsWidget />
        <RecentRecordsList />
      </main>
    </div>
  );
};

export default PatientDashboard;
