import React from 'react';
import { Heart, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Assisted: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOpenRegistration = () => {
    navigate('/register');
  };

  const handleCollectVitals = () => {
    // In a real app, this would navigate to a patient list or scanner
    navigate('/patients');
  };

  return (
    <div className="animate-fade-in pb-12 text-neutral-900 font-sans">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('asha.assisted_title')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('asha.assisted_desc')}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button onClick={handleOpenRegistration} className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-4 active:scale-[0.98]">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserPlus size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">{t('asha.new_registration')}</h3>
            <p className="text-xs text-neutral-500 font-semibold mt-1">{t('asha.registration_desc')}</p>
          </div>
        </button>

        <button onClick={handleCollectVitals} className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-4 active:scale-[0.98]">
          <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <Heart size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">{t('asha.collect_vitals')}</h3>
            <p className="text-xs text-neutral-500 font-semibold mt-1">{t('asha.vitals_desc')}</p>
          </div>
        </button>
      </div>

      <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">{t('asha.active_checks')}</h2>
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 text-center text-neutral-500 text-xs shadow-sm">
        {t('asha.no_assisted_records', 'No assisted patient records registered yet today.')}
      </div>
    </div>
  );
};

export default Assisted;
