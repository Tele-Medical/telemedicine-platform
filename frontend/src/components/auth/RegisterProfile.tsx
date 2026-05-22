import React, { useState } from 'react';
import { authService } from '../../api/services';
import { User, Globe, AlertCircle } from 'lucide-react';

interface RegisterProfileProps {
  onComplete: () => void;
}

const RegisterProfile: React.FC<RegisterProfileProps> = ({ onComplete }) => {
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('pa'); // Default Punjabi
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
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Complete Your Profile</h2>
          <p className="text-neutral-500 text-sm max-w-xs mx-auto">
            Please enter your name to register your digital health account.
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
              Full Name
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
                placeholder="Enter your name (e.g. Aditya)"
                className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400 text-base"
                maxLength={50}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Preferred Language Input */}
          <div>
            <label htmlFor="language" className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Preferred Language
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
                <Globe size={18} />
              </span>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-base appearance-none cursor-pointer"
                disabled={loading}
              >
                <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
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
            {loading ? 'Completing Registration...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterProfile;
