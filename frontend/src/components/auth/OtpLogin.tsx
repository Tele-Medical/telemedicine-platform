import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../api/services';

interface OtpLoginProps {
  onLogin: (otp: string) => void;
}

const OtpLogin: React.FC<OtpLoginProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // Changed to 6 digits for backend matching
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setLoading(true);
      setError('');
      try {
        const fullPhone = `+91${phone}`;
        await authService.requestOtp(fullPhone);
        setStep('otp');
        startCooldown();
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || t('common.error'));
        } else {
          setError(t('common.error'));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const fullPhone = `+91${phone}`;
      await authService.requestOtp(fullPhone);
      startCooldown();
      const resendMsg = 'OTP resent successfully!';
      setError(resendMsg);
      setTimeout(() => {
        setError((prev) => (prev === resendMsg ? '' : prev));
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || t('common.error'));
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // limit to 1 char
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Auto-focus previous input on backspace
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      const chars = pastedData.split('');
      let focusIndex = 0;
      for (let i = 0; i < chars.length && i < 6; i++) {
        newOtp[i] = chars[i];
        focusIndex = Math.min(i, 5);
      }
      setOtp(newOtp);
      const nextInput = document.getElementById(`otp-input-${focusIndex}`);
      nextInput?.focus();
      e.preventDefault();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length === 6) { // Verify 6 digits
      setLoading(true);
      setError('');
      try {
        const fullPhone = `+91${phone}`;
        const response = await authService.verifyOtp(fullPhone, otpValue);
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          onLogin(otpValue);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || t('common.error'));
        } else {
          setError(t('common.error'));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-in">
      {error && (
        <div className="mb-6 p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-semibold text-center">
          {error}
        </div>
      )}
      
      {step === 'phone' ? (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.welcome_title')}</h2>
            <p className="text-neutral-500 text-sm">{t('auth.enter_phone')}</p>
          </div>
          
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-neutral-700 mb-1.5">{t('auth.phone_label')}</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500 font-semibold">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  aria-label={t('auth.phone_label')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={t('auth.phone_placeholder')}
                  className="w-full pl-14 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-lg tracking-wide text-neutral-900 placeholder-neutral-400"
                  maxLength={10}
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={phone.length < 10 || loading}
              className="w-full bg-primary hover:bg-primary-700 active:scale-[0.98] text-white py-3.5 rounded-full font-semibold text-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {loading ? t('auth.sending') : t('auth.request_otp')}
            </button>
          </form>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.enter_otp')}</h2>
            <p className="text-neutral-500 text-sm">
              {t('auth.sent_code')} <span className="font-semibold text-gray-700">+91 {phone}</span>
            </p>
          </div>

          
          <form onSubmit={handleVerify} className="space-y-8">
            <div className="flex justify-between gap-1 sm:gap-2 px-1">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  aria-label={`Digit ${index + 1} of 6`}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900"
                  maxLength={1}
                  required
                />
              ))}
            </div>
            
            <button 
              type="submit"
              disabled={otp.join('').length < 6 || loading}
              className="w-full bg-primary hover:bg-primary-700 active:scale-[0.98] text-white py-3.5 rounded-full font-semibold text-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {loading ? t('auth.verifying') : t('auth.verify_login')}
            </button>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <button 
                type="button" 
                onClick={() => {
                  setStep('phone');
                  setOtp(['', '', '', '', '', '']);
                  setError('');
                }}
                aria-label={t('auth.edit_phone')}
                className="text-sm text-neutral-500 hover:text-primary transition-colors font-medium"
              >
                {t('auth.edit_phone')}
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleResendOtp}
                className={`text-sm font-semibold transition-colors outline-none focus-visible:ring-1 focus-visible:ring-primary/30 ${
                  resendCooldown > 0 || loading
                    ? 'text-neutral-300 cursor-not-allowed'
                    : 'text-primary hover:text-primary-700'
                }`}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default OtpLogin;
