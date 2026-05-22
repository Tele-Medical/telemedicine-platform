import React, { useState } from 'react';
import { Heart, Phone, MapPin, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

const Care: React.FC = () => {
  const [subscribedPrograms, setSubscribedPrograms] = useState<string[]>(['hypertension']);

  const toggleProgram = (id: string) => {
    if (subscribedPrograms.includes(id)) {
      setSubscribedPrograms(subscribedPrograms.filter(p => p !== id));
    } else {
      setSubscribedPrograms([...subscribedPrograms, id]);
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Care Programs</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage your active village health programs and community support.</p>
      </header>

      {/* Primary ASHA Worker Contact Card */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-neutral-200/60 mb-6">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">Assigned Community Health Worker</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            SK
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-neutral-900">Sunita Kumari</h3>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-primary" />
              <span>Rampur Village ASHA Activist</span>
            </p>
          </div>
          <a 
            href="tel:+919876543210" 
            className="w-11 h-11 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
            title="Call Sunita Kumari"
          >
            <Phone size={18} className="stroke-[2.25]" />
          </a>
        </div>
      </section>

      {/* Upcoming Village Health Camp */}
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 border border-primary/15 mb-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex flex-col items-center justify-center font-bold text-xs uppercase shadow-sm">
            <span className="text-[10px] opacity-90">Oct</span>
            <span className="text-lg leading-none -mt-0.5">30</span>
          </div>
          <div className="flex-1">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-primary text-white">
              Upcoming Camp
            </span>
            <h3 className="text-base font-bold text-neutral-900 mt-2">Maternal & General Health Screening Drive</h3>
            <p className="text-xs text-neutral-600 mt-1">Free doctor consultations, vital checks, and medicine distribution.</p>
            <div className="flex items-center gap-4 text-xs text-neutral-500 mt-3 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                <span>10:00 AM - 4:00 PM</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                <span>Panchayat Hall, Rampur</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Community Health Programs */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Available Health Subscriptions</h2>
        <div className="grid gap-4">
          
          {/* Program 1 */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] border border-neutral-200/60 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
              <Heart size={20} className="stroke-[2.25]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-neutral-900">Hypertension Management Program</h3>
              <p className="text-xs text-neutral-500 mt-1">Weekly BP monitoring by ASHA, diet tracking, and automated refill alerts.</p>
              <button 
                onClick={() => toggleProgram('hypertension')}
                className={`mt-3 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subscribedPrograms.includes('hypertension')
                    ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    : 'bg-primary text-white hover:bg-primary-700'
                }`}
              >
                {subscribedPrograms.includes('hypertension') ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <span>Subscribe Program</span>
                )}
              </button>
            </div>
          </div>

          {/* Program 2 */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] border border-neutral-200/60 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <ShieldAlert size={20} className="stroke-[2.25]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-neutral-900">Diabetes Wellness Plan</h3>
              <p className="text-xs text-neutral-500 mt-1">Monthly blood glucose screenings, lifestyle coaching, and medication compliance check-ins.</p>
              <button 
                onClick={() => toggleProgram('diabetes')}
                className={`mt-3 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subscribedPrograms.includes('diabetes')
                    ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    : 'bg-primary text-white hover:bg-primary-700'
                }`}
              >
                {subscribedPrograms.includes('diabetes') ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <span>Subscribe Program</span>
                )}
              </button>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Care;
