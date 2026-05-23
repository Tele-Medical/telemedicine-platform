import React, { useEffect, useState } from 'react';

interface Practitioner {
  id: string;
  name: string;
  specialization: string;
}

const AppointmentScheduler: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch('/api/v1/practitioners');
        if (response.ok) {
          setPractitioners(await response.json());
        }
      } catch (e) {
        console.error('Failed to fetch practitioners', e);
      }
    };
    fetchDocs();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate) return;

    setStatus('loading');
    try {
      await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          practitionerId: selectedDoctor,
          time: appointmentDate
        })
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error('Failed to book', e);
      setStatus('error');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6 max-w-xl">
      <h3 className="text-lg font-bold mb-5 text-gray-800 border-b pb-2">Schedule Consultation</h3>
      <form onSubmit={handleBook} className="space-y-5">
        <div>
          <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
          <select
            id="doctor"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>-- Choose Practitioner --</option>
            {practitioners.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.name} - {doc.specialization}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Appointment Date & Time</label>
          <input
            id="date"
            type="datetime-local"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={status === 'loading' || !selectedDoctor || !appointmentDate}
            className={`w-full text-white px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              status === 'success' 
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300'
            }`}
          >
            {status === 'loading' ? 'Booking...' : status === 'success' ? 'Appointment Booked! ✓' : 'Book Appointment'}
          </button>
        </div>
        
        {status === 'error' && (
          <p className="text-sm text-red-600 text-center mt-2">Failed to book appointment. Try again.</p>
        )}
      </form>
    </div>
  );
};

export default AppointmentScheduler;
