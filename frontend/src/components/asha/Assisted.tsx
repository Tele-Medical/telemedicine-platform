import React from 'react';
import { Heart, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Assisted: React.FC = () => {
  const navigate = useNavigate();

  const handleOpenRegistration = () => {
    navigate('/asha/register');
  };

  const handleCollectVitals = () => {
    navigate('/asha/vitals');
  };
  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Assisted Checkups</h1>
        <p className="text-neutral-500 text-sm mt-1">Collect clinical patient vitals, register new rural digital health profiles, and coordinate teleconsultations.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button onClick={handleOpenRegistration} className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserPlus size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">New Patient Registration</h3>
            <p className="text-xs text-neutral-500 font-semibold mt-1">Register new offline profiles with E.164 phone linkage.</p>
          </div>
        </button>

        <button onClick={handleCollectVitals} className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <Heart size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Collect Vitals & Triage</h3>
            <p className="text-xs text-neutral-500 font-semibold mt-1">Measure blood pressure, temperature, and triage patient discomfort.</p>
          </div>
        </button>
      </div>

      <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">Today's Active Checks</h2>
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 text-center text-neutral-500 text-xs">
        No assisted patient records registered yet today. Click "Collect Vitals" above to start triage logs.
      </div>
    </div>
  );
};

export default Assisted;
