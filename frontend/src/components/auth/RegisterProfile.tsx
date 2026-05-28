import React, { useState } from 'react';
import { authService } from '../../api/services';
import { apiClient } from '../../api/client';
import { User, Globe, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RegisterProfileProps {
  onComplete: () => void;
}

const RegisterProfile: React.FC<RegisterProfileProps> = ({ onComplete }) => {
  const { t, i18n } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('pa'); // Default Punjabi
  const [gender, setGender] = useState('male');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    
    if (trimmedName.length < 2) {
      setError('Please enter a valid full name (minimum 2 characters).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.updateProfile(trimmedName, language);
      
      const user = await authService.getMe();
      if (user.patient_id) {
        await apiClient(`/patients/${user.patient_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            full_name: trimmedName,
            gender: gender,
            date_of_birth: dob || null,
            phone: phone || null
          })
        });
      }

      onComplete();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to complete registration. Please try again.');
      } else {
        setError('Failed to complete registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 w-full max-w-md mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full border border-gray-100/80 transition-all duration-300 ease-in-out min-h-[420px] flex flex-col justify-center animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-inner">
            <User size={30} className="stroke-[2.25] animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.register_title')}</h2>
          <p className="text-neutral-500 text-sm max-w-xs mx-auto">
            {t('auth.enter_name', 'Please enter your name to register your digital health account.')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 text-danger border border-danger/20 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name Input */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('auth.full_name')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
                <User size={18} />
              </span>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('auth.full_name')}
                className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400 text-base"
                maxLength={50}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Gender Segmented Selection */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('auth.gender')} <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 bg-neutral-100/70 p-1 rounded-xl border border-neutral-200/50">
              {['male', 'female', 'other'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={loading}
                  onClick={() => setGender(opt)}
                  className={`py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                    gender === opt
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/50'
                  }`}
                >
                  {t(`auth.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dob" className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('auth.dob')} <span className="text-neutral-400 font-normal text-xs">{t('auth.optional')}</span>
            </label>
            <input
              id="dob"
              type="date"
              disabled={loading}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-base cursor-pointer"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('auth.phone_number')} <span className="text-neutral-400 font-normal text-xs">{t('auth.optional')}</span>
            </label>
            <input
              id="phone"
              type="tel"
              disabled={loading}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
              placeholder={t('auth.phone_placeholder')}
              className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400 text-base"
              maxLength={15}
            />
          </div>

          {/* Preferred Language Input */}
          <div>
            <label htmlFor="language" className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('profile.primary_language')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
                <Globe size={18} />
              </span>
              <select
                id="language"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  i18n.changeLanguage(e.target.value);
                }}
                className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-base appearance-none cursor-pointer font-bold"
                disabled={loading}
              >
                <option value="pa">{t('profile.lang_pa')}</option>
                <option value="hi">{t('profile.lang_hi')}</option>
                <option value="en">{t('profile.lang_en')}</option>
                <option value="bn">{t('profile.lang_bn')}</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-400">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={fullName.trim().length < 2 || loading}
            className="w-full bg-primary hover:bg-primary-700 active:scale-[0.98] text-white py-3.5 rounded-full font-semibold text-base shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {loading ? t('auth.sending') : t('auth.save_profile')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterProfile;
