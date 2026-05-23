import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';


const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

import { vi } from 'vitest';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.title': 'Telemedicine',
        'app.good_morning': 'Good morning',
        'app.health_overview': 'Here is your digital health overview.',
        'app.sync_failed': 'Failed to sync your health records. Please verify your connection.',
        'app.retry': 'Retry',
        'nav.home': 'Home',
        'nav.records': 'Records',
        'nav.medicines': 'Medicines',
        'nav.profile': 'Profile',
        'auth.patient_portal': 'Patient Portal',
        'auth.staff_portal': 'Staff Portal',
        'auth.welcome_title': 'Welcome to Telemedicine',
        'auth.enter_phone': 'Enter your phone number to continue',
        'auth.phone_label': 'Mobile Number',
        'auth.phone_placeholder': 'Enter your mobile number',
        'auth.request_otp': 'Request OTP',
        'auth.enter_otp': 'Enter OTP',
        'auth.sent_code': "We've sent a code to",
        'auth.verify_login': 'Verify & Login',
        'clinical.no_appointments': 'No upcoming consultations',
        'clinical.book_appointment': 'Book Appointment',
        'clinical.need_specialist': 'Need to speak with a medical specialist? Book a digital consult or contact your local assisted ASHA care worker.',
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
}));


