import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import OtpLogin from './OtpLogin';
import StaffLogin from './StaffLogin';

interface LoginContainerProps {
  onLogin: (otpOrToken?: string) => void;
}

const LoginContainer: React.FC<LoginContainerProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'patient' | 'staff'>('patient');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 w-full max-w-md mx-auto py-8">
      {/* Tab Switcher */}
      <div role="tablist" className="flex w-full bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl mb-8 border border-gray-200/50">
        <button
          type="button"
          role="tab"
          id="tab-patient"
          aria-controls="panel-patient"
          aria-selected={activeTab === 'patient'}
          tabIndex={activeTab === 'patient' ? 0 : -1}
          onClick={() => setActiveTab('patient')}
          className={`flex-1 py-3 text-center rounded-xl font-semibold text-sm transition-all duration-300 ${
            activeTab === 'patient'
              ? 'bg-white text-gray-800 shadow-sm border-transparent'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/30'
          }`}
        >
          {t('auth.patient_portal')}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-staff"
          aria-controls="panel-staff"
          aria-selected={activeTab === 'staff'}
          tabIndex={activeTab === 'staff' ? 0 : -1}
          onClick={() => setActiveTab('staff')}
          className={`flex-1 py-3 text-center rounded-xl font-semibold text-sm transition-all duration-300 ${
            activeTab === 'staff'
              ? 'bg-white text-gray-800 shadow-sm border-transparent'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/30'
          }`}
        >
          {t('auth.staff_portal')}
        </button>
      </div>

      {/* Form Card Container */}
      <div 
        role="tabpanel"
        id={activeTab === 'patient' ? 'panel-patient' : 'panel-staff'}
        aria-labelledby={activeTab === 'patient' ? 'tab-patient' : 'tab-staff'}
        className="bg-white rounded-2xl shadow-lg p-8 w-full border border-gray-100/80 transition-all duration-300 ease-in-out min-h-[420px] flex flex-col justify-center"
      >
        {activeTab === 'patient' ? (
          <OtpLogin onLogin={onLogin} />
        ) : (
          <StaffLogin onLogin={() => onLogin()} />
        )}
      </div>
    </div>
  );
};

export default LoginContainer;
