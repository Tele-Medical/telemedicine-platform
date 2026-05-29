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

  loginStaff: async (username: string, password: string) => {
    return apiClient('/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getMe: async () => {
    return apiClient('/auth/me', {
      method: 'GET',
    });
  },

  updateProfile: async (fullName: string, preferredLanguage: string = 'pa') => {
    return apiClient('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ full_name: fullName, preferred_language: preferredLanguage }),
    });
  },
};

export const appointmentService = {
  getAppointments: async (patientId?: string) => {
    const isValidId = patientId && patientId !== 'undefined' && patientId !== 'null';
    const url = isValidId ? `/appointments/?patient_id=${patientId}` : '/appointments/';
    return apiClient(url, {
      method: 'GET',
    });
  }
};

export const pharmacyService = {
  getPrescriptions: async (patientId?: string) => {
    const isValidId = patientId && patientId !== 'undefined' && patientId !== 'null';
    const url = isValidId ? `/prescriptions?patient_id=${patientId}` : '/prescriptions';
    return apiClient(url, {
      method: 'GET',
    });
  }
};

export const encounterService = {
  getEncounters: async (patientId: string) => {
    return apiClient(`/encounters/?patient_id=${patientId}`, {
      method: 'GET',
    });
  }
};
