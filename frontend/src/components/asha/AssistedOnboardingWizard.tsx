import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PatientRepository } from '../../repositories/PatientRepository';

const schema = z.object({
  fullName: z.string().min(1, 'Full Name is required'),
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
    // If patient has a phone, validate it is standard 10 digits
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPhone = searchParams.get('phone') || '';

  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      noPhone: false,
      phone: queryPhone,
      guardianName: '',
      guardianPhone: '',
    },
  });

  const noPhone = watch('noPhone');

  const onSubmit = async (data: FormData) => {
    const patientId = crypto.randomUUID();
    
    const saved = await PatientRepository.save({
      id: patientId,
      full_name: data.fullName,
      phone: data.noPhone ? null : (data.phone || null),
      guardian_name: data.guardianName || null,
      guardian_phone: data.guardianPhone || null,
      has_phone: !data.noPhone,
      created_at: new Date().toISOString()
    });

    // Auto-route straight into the Consultation intake flow for this patient
    navigate(`/consultation-flow/${saved.id || patientId}`);
  };

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white p-6 rounded shadow border border-gray-100 font-sans text-neutral-900">
      <h2 className="text-xl font-bold mb-6 text-gray-800">{t('asha.patient_registration')}</h2>
      {step === 1 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.full_name')}</label>
            <input
              id="fullName"
              type="text"
              {...register('fullName')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. John Doe"
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
          </div>

          {/* Phone Number Input (Only shown if patient has a phone) */}
          {!noPhone && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                disabled={!!queryPhone}
                readOnly={!!queryPhone}
                {...register('phone')}
                className={`block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  queryPhone ? 'bg-gray-100 cursor-not-allowed text-gray-500 font-bold' : ''
                }`}
                placeholder="e.g. 9876543210"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          )}

          {/* No Phone Checkbox Indicator */}
          <div className="flex items-center bg-gray-50 p-3 rounded border border-gray-200">
            <input
              id="noPhone"
              type="checkbox"
              disabled={!!queryPhone}
              {...register('noPhone')}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <label htmlFor="noPhone" className={`ml-2 block text-sm font-medium text-gray-700 cursor-pointer ${
              queryPhone ? 'text-gray-400 cursor-not-allowed' : ''
            }`}>
              {t('asha.no_phone_notice')}
            </label>
          </div>

          {/* Guardian Info Fields */}
          {noPhone && (
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-md space-y-4">
              <p className="text-xs text-yellow-800 mb-2 font-medium uppercase tracking-wide">{t('asha.guardian_required')}</p>
              <div>
                <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">{t('asha.guardian_name')}</label>
                <input
                  id="guardianName"
                  type="text"
                  {...register('guardianName')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
                {errors.guardianName && <p className="text-red-500 text-xs mt-1">{errors.guardianName.message}</p>}
              </div>
              <div>
                <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">{t('asha.guardian_phone')}</label>
                <input
                  id="guardianPhone"
                  type="tel"
                  {...register('guardianPhone')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
                {errors.guardianPhone && <p className="text-red-500 text-xs mt-1">{errors.guardianPhone.message}</p>}
              </div>
            </div>
          )}

          <div className="pt-4 border-t mt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {t('nav.next', 'Next')}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="text-center py-10 bg-green-50 rounded-lg border border-green-100">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('asha.reg_complete')}</h3>
          <p className="text-sm text-gray-500 mb-6">{t('asha.reg_success')}</p>
          <button
            onClick={() => { setStep(1); reset(); }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm underline transition-colors"
          >
            {t('asha.register_another', 'Register another patient')}
          </button>
        </div>
      )}
    </div>
  );
};

export default AssistedOnboardingWizard;
