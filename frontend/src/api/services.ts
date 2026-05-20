import { apiClient } from './client';

export const authService = {
  requestOtp: async (phone: string) => {
    return apiClient('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
  
  verifyOtp: async (phone: string, otp: string) => {
    return apiClient('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code: otp }), // Backend schema expects 'code', not 'otp'
    });
  },

  getMe: async () => {
    return apiClient('/auth/me', {
      method: 'GET',
    });
  },
};

export const appointmentService = {
  getAppointments: async () => {
    return apiClient('/appointments', {
      method: 'GET',
    });
  }
};
