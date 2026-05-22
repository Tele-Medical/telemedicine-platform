import React, { useState } from 'react';
import { authService } from '../../api/services';

interface StaffLoginProps {
  onLogin: () => void;
}

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ username?: string; password?: string }>({});

  const validateForm = () => {
    const errors: { username?: string; password?: string } = {};
    if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await authService.loginStaff(username, password);
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        onLogin();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to login. Please try again.');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Staff Portal</h2>
        <p className="text-neutral-500 text-sm">Enter your credentials to access your dashboard</p>
      </div>

      {error && (
        <div className="w-full mb-6 p-4 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-semibold text-center transition-all duration-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-semibold text-neutral-700 mb-1.5">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (validationErrors.username) {
                setValidationErrors(prev => ({ ...prev, username: undefined }));
              }
            }}
            placeholder="Enter your username"
            className={`w-full px-4 py-3 bg-neutral-50 border ${
              validationErrors.username ? 'border-danger focus:ring-danger' : 'border-neutral-200 focus:ring-primary'
            } rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400`}
            disabled={loading}
          />
          {validationErrors.username && (
            <p className="mt-1.5 text-xs text-danger font-semibold">{validationErrors.username}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) {
                setValidationErrors(prev => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="Enter your password"
            className={`w-full px-4 py-3 bg-neutral-50 border ${
              validationErrors.password ? 'border-danger focus:ring-danger' : 'border-neutral-200 focus:ring-primary'
            } rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400`}
            disabled={loading}
          />
          {validationErrors.password && (
            <p className="mt-1.5 text-xs text-danger font-semibold">{validationErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-700 text-white py-3.5 rounded-full font-semibold text-lg shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default StaffLogin;
