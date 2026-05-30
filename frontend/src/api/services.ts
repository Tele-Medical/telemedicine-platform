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
    const query = isValidId ? `?patient_id=${patientId}` : '';
    return apiClient(`/prescriptions${query}`, {
      method: 'GET'
    });
  },
  createPrescription: async (payload: any) => {
    return apiClient('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  uploadInventory: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient('/pharmacy/inventory/upload', {
      method: 'POST',
      body: formData
    });
  },
  checkAvailability: async (medicineId: string, lat: number, lng: number, radius = 2.0) => {
    return apiClient(`/medicines/${medicineId}/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  },
  updateInventoryStock: async (medicineId: string, quantity: number) => {
    return apiClient(`/pharmacy/inventory/${medicineId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    });
  },
  addToCatalog: async (name: string) => {
    return apiClient(`/pharmacy/catalog`, {
      method: 'POST',
      body: JSON.stringify({ name })
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
