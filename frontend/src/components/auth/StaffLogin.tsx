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
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Staff Portal</h2>
        <p className="text-gray-500 text-sm">Enter your credentials to access your dashboard</p>
      </div>

      {error && (
        <div className="w-full mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center border border-red-100 transition-all duration-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (validationErrors.username) {
                setValidationErrors(prev => ({ ...prev, username: undefined }));
              }
            }}
            placeholder="Enter your username"
            className={`w-full px-4 py-3 bg-gray-50 border ${
              validationErrors.username ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-[#6B8E7B]'
            } rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-gray-800 placeholder-gray-400`}
            disabled={loading}
          />
          {validationErrors.username && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">{validationErrors.username}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) {
                setValidationErrors(prev => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="Enter your password"
            className={`w-full px-4 py-3 bg-gray-50 border ${
              validationErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-[#6B8E7B]'
            } rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-gray-800 placeholder-gray-400`}
            disabled={loading}
          />
          {validationErrors.password && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">{validationErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#6B8E7B] text-white py-3.5 rounded-full font-semibold text-lg shadow-md hover:bg-[#5a7a69] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default StaffLogin;
