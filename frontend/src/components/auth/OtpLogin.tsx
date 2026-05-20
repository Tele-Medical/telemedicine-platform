import React, { useState } from 'react';
import { authService } from '../../api/services';

interface OtpLoginProps {
  onLogin: (otp: string) => void;
}

const OtpLogin: React.FC<OtpLoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // Changed to 6 digits for backend matching
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setLoading(true);
      setError('');
      try {
        const fullPhone = `+91${phone}`;
        await authService.requestOtp(fullPhone);
        setStep('otp');
      } catch (err: any) {
        setError(err.message || 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
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
      } catch (err: any) {
        setError(err.message || 'Invalid OTP');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full border border-gray-100 transition-all duration-300 ease-in-out">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}
        
        {step === 'phone' ? (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Telemedicine</h2>
              <p className="text-gray-500 text-sm">Enter your phone number to continue</p>
            </div>
            
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-medium">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter your mobile number"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6B8E7B] focus:border-transparent outline-none transition-all text-lg tracking-wide"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={phone.length < 10 || loading}
                className="w-full bg-[#6B8E7B] text-white py-3.5 rounded-full font-semibold text-lg shadow-md hover:bg-[#5a7a69] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Request OTP'}
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter OTP</h2>
              <p className="text-gray-500 text-sm">
                We've sent a code to <span className="font-semibold text-gray-700">+91 {phone}</span>
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
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6B8E7B] focus:border-transparent outline-none transition-all"
                    maxLength={1}
                    required
                  />
                ))}
              </div>
              
              <button 
                type="submit"
                disabled={otp.join('').length < 6 || loading}
                className="w-full bg-[#6B8E7B] text-white py-3.5 rounded-full font-semibold text-lg shadow-md hover:bg-[#5a7a69] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setStep('phone')}
                  className="text-sm text-gray-500 hover:text-[#6B8E7B] transition-colors"
                >
                  Edit phone number
                </button>
              </div>
            </form>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default OtpLogin;
