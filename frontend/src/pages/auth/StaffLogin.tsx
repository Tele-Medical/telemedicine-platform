import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { authService } from '../../api/services';

interface StaffLoginProps {
  onLogin?: () => void;
}

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  
  const staffLoginSchema = z.object({
    username: z.string().min(1, t('auth.username_required')),
    password: z.string().min(1, t('auth.password_required')),
  });

  type StaffLoginForm = z.infer<typeof staffLoginSchema>;

  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffLoginForm>({
    resolver: zodResolver(staffLoginSchema),
  });

  const onSubmit = async (values: StaffLoginForm) => {
    setLoginError('');
    try {
      const data = await authService.loginStaff(values.username, values.password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      if (onLogin) {
        onLogin();
      }
      navigate('/');
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLoginError(e.message || 'Login failed. Please check your credentials.');
      } else {
        setLoginError('Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-900 font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-2xl border border-neutral-200">
        <h2 className="text-2xl font-bold mb-8 text-center text-neutral-900">{t('auth.staff_portal')}</h2>
        {loginError && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl text-xs font-bold text-danger text-center">
            {loginError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">
              {t('auth.username')}
            </label>
            <input
              id="username"
              type="text"
              {...register('username')}
              className="block w-full rounded-xl border border-neutral-300 px-4 py-3 shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              disabled={isSubmitting}
            />
            {errors.username && <p className="text-danger text-xs mt-1.5 font-bold">{errors.username.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="block w-full rounded-xl border border-neutral-300 px-4 py-3 shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              disabled={isSubmitting}
            />
            {errors.password && <p className="text-danger text-xs mt-1.5 font-bold">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('auth.verifying')}
              </div>
            ) : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffLogin;
