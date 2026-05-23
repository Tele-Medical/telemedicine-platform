import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientRepository } from '../../repositories/PatientRepository';

const schema = z.object({
  fullName: z.string().min(1, 'Full Name is required'),
  noPhone: z.boolean().optional(),
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
  }
});

type FormData = z.infer<typeof schema>;

const AssistedOnboardingWizard: React.FC = () => {
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
      guardianName: '',
      guardianPhone: '',
    },
  });

  const noPhone = watch('noPhone');

  const onSubmit = async (data: FormData) => {
    await PatientRepository.save({
      id: crypto.randomUUID(),
      full_name: data.fullName,
      guardian_name: data.guardianName,
      guardian_phone: data.guardianPhone,
      has_phone: !data.noPhone,
    });
    setStep(2);
  };

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white p-6 rounded shadow border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Patient Registration</h2>
      {step === 1 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              id="fullName"
              type="text"
              {...register('fullName')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. John Doe"
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
          </div>

          <div className="flex items-center bg-gray-50 p-3 rounded border border-gray-200">
            <input
              id="noPhone"
              type="checkbox"
              {...register('noPhone')}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="noPhone" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
              Patient does not have a personal phone
            </label>
          </div>

          {noPhone && (
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-md space-y-4">
              <p className="text-xs text-yellow-800 mb-2 font-medium uppercase tracking-wide">Guardian Details Required</p>
              <div>
                <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
                <input
                  id="guardianName"
                  type="text"
                  {...register('guardianName')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
                {errors.guardianName && <p className="text-red-500 text-xs mt-1">{errors.guardianName.message}</p>}
              </div>
              <div>
                <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone Number</label>
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
              Next
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Registration Complete!</h3>
          <p className="text-sm text-gray-500 mb-6">The patient has been added to the system.</p>
          <button
            onClick={() => { setStep(1); reset(); }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm underline transition-colors"
          >
            Register another patient
          </button>
        </div>
      )}
    </div>
  );
};

export default AssistedOnboardingWizard;
