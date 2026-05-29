import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Globe, Calendar, AlertCircle, ArrowLeft, Heart } from 'lucide-react';
import { PatientRepository } from '../../repositories/PatientRepository';

const schema = z.object({
  fullName: z.string().min(2, 'Please enter a valid full name (minimum 2 characters).'),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().optional(),
  language: z.string().default('pa'),
  noPhone: z.boolean().optional(),
  phone: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.noPhone) {
    if (!data.guardianName || data.guardianName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guardian Name is required',
        path: ['guardianName'],
      });
    }
    if (!data.guardianPhone || data.guardianPhone.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guardian Phone Number is required',
        path: ['guardianPhone'],
      });
    }
  } else {
    const cleaned = (data.phone || '').trim().replace(/[^0-9]/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A valid 10-digit mobile number starting with 6-9 is required',
        path: ['phone'],
      });
    }
  }
});

type FormData = z.infer<typeof schema>;

const AssistedOnboardingWizard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPhone = searchParams.get('phone') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      gender: 'male',
      dob: '',
      language: 'pa',
      noPhone: false,
      phone: queryPhone,
      guardianName: '',
      guardianPhone: '',
    },
  });

  const noPhone = watch('noPhone');
  const gender = watch('gender');
  const language = watch('language');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const patientId = crypto.randomUUID();
      
      const saved = await PatientRepository.save({
        id: patientId,
        full_name: data.fullName,
        gender: data.gender,
        date_of_birth: data.dob || null,
        phone: data.noPhone ? null : (data.phone || null),
        guardian_name: data.guardianName || null,
        guardian_phone: data.guardianPhone || null,
        preferred_language: data.language,
        has_phone: !data.noPhone,
        village: 'Nabha Sub-centre',
        created_at: new Date().toISOString()
      });

      // Auto-route straight into the Consultation intake flow for this patient
      navigate(`/consultation-flow/${saved.id || patientId}`);
    } catch (err) {
      console.error('Failed to register patient profile:', err);
      setErrorMsg('Failed to complete registration. Please check inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8 bg-white border border-neutral-200/60 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 font-sans text-neutral-800">
      
      {/* Navigation & Header */}
      <button 
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-neutral-700 transition-colors mb-6 outline-none"
      >
        <ArrowLeft size={14} className="stroke-[2.5]" />
        <span>Go Back</span>
      </button>

      <div className="flex items-center gap-3.5 border-b border-neutral-100 pb-5 mb-8">
        <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-sm border border-primary/20">
          <Heart size={20} className="stroke-[2.25] text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{t('asha.patient_registration', 'Register Digital Health Profile')}</h2>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Sanjeevani Partner Network</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-danger/10 text-danger border border-danger/20 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Full Name */}
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
              {...register('fullName')}
              placeholder="e.g. John Doe"
              disabled={isSubmitting}
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-950 placeholder-neutral-400 text-sm font-medium"
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12} /> {errors.fullName.message}</p>}
        </div>

        {/* Gender Segmented Selection */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
            {t('auth.gender')}
          </label>
          <div className="grid grid-cols-3 gap-2 bg-neutral-100/60 p-1 rounded-xl border border-neutral-200/50">
            {(['male', 'female', 'other'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isSubmitting}
                onClick={() => setValue('gender', opt)}
                className={`py-2 text-xs font-bold rounded-lg capitalize transition-all border border-transparent ${
                  gender === opt
                    ? 'bg-primary text-white shadow-sm font-black'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50/50'
                }`}
              >
                {t(`auth.${opt}`)}
              </button>
            ))}
          </div>
          {errors.gender && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12} /> {errors.gender.message}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dob" className="block text-sm font-semibold text-neutral-700 mb-1.5">
            {t('auth.dob')} <span className="text-neutral-400 font-normal text-xs">{t('auth.optional')}</span>
          </label>
          <div className="relative">
            <input
              id="dob"
              type="date"
              disabled={isSubmitting}
              {...register('dob')}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-950 text-sm font-medium cursor-pointer"
            />
          </div>
          {errors.dob && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12} /> {errors.dob.message}</p>}
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
              {...register('language')}
              onChange={(e) => {
                setValue('language', e.target.value);
                i18n.changeLanguage(e.target.value);
              }}
              className="w-full pl-11 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-950 text-sm font-bold appearance-none cursor-pointer"
              disabled={isSubmitting}
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
          {errors.language && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12} /> {errors.language.message}</p>}
        </div>

        {/* Phone Number Input (Only shown if patient has a phone) */}
        {!noPhone && (
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Phone Number <span className="text-danger">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              disabled={!!queryPhone || isSubmitting}
              readOnly={!!queryPhone}
              {...register('phone')}
              className={`w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-950 placeholder-neutral-400 text-sm font-medium ${
                queryPhone ? 'bg-neutral-100 cursor-not-allowed text-neutral-500 font-bold' : ''
              }`}
              placeholder="e.g. 9876543210"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12} /> {errors.phone.message}</p>}
          </div>
        )}

        {/* No Phone Checkbox Indicator */}
        <div className="flex items-center bg-neutral-50 p-4.5 rounded-2xl border border-neutral-200/50 hover:bg-neutral-100/40 transition-colors">
          <input
            id="noPhone"
            type="checkbox"
            disabled={!!queryPhone || isSubmitting}
            {...register('noPhone')}
            className="h-4.5 w-4.5 text-primary border-neutral-300 rounded focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
          />
          <label htmlFor="noPhone" className={`ml-3 block text-sm font-semibold text-neutral-700 cursor-pointer ${
            queryPhone ? 'text-neutral-400 cursor-not-allowed' : ''
          }`}>
            {t('asha.no_phone_notice')}
          </label>
        </div>

        {/* Guardian Info Fields */}
        {noPhone && (
          <div className="p-5 bg-amber-50/40 border border-amber-100 rounded-2xl space-y-4 animate-scale-in">
            <p className="text-[10px] text-amber-800 mb-1 font-black uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={12} />
              <span>{t('asha.guardian_required')}</span>
            </p>
            <div>
              <label htmlFor="guardianName" className="block text-xs font-bold text-neutral-600 mb-1">{t('asha.guardian_name')}</label>
              <input
                id="guardianName"
                type="text"
                disabled={isSubmitting}
                {...register('guardianName')}
                placeholder="e.g. Guardian Name"
                className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-950 placeholder-neutral-400 text-xs font-medium"
              />
              {errors.guardianName && <p className="text-red-500 text-[10px] mt-1 font-bold flex items-center gap-1"><AlertCircle size={10} /> {errors.guardianName.message}</p>}
            </div>
            <div>
              <label htmlFor="guardianPhone" className="block text-xs font-bold text-neutral-600 mb-1">{t('asha.guardian_phone')}</label>
              <input
                id="guardianPhone"
                type="tel"
                disabled={isSubmitting}
                {...register('guardianPhone')}
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-950 placeholder-neutral-400 text-xs font-medium"
              />
              {errors.guardianPhone && <p className="text-red-500 text-[10px] mt-1 font-bold flex items-center gap-1"><AlertCircle size={10} /> {errors.guardianPhone.message}</p>}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-100 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-700 active:scale-[0.98] text-white py-3.5 rounded-full font-semibold text-base shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary/30 flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Registering...' : t('nav.next', 'Next & Start Consult')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssistedOnboardingWizard;
