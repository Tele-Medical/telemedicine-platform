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
        'nav.home': 'Home',
        'nav.records': 'Records',
        'nav.medicines': 'Medicines',
        'nav.profile': 'Profile',
        'nav.queue': 'Queue',
        'nav.consults': 'Consults',
        'nav.patients': 'Patients',
        'nav.prescriptions': 'Prescriptions',
        'nav.assisted': 'Assisted',
        'nav.appointments': 'Appts',
        'nav.sync': 'Sync',
        'nav.fulfill': 'Fulfill',
        'nav.inventory': 'Inventory',
        'nav.search': 'Search',
        'nav.overview': 'Overview',
        'nav.users': 'Users',
        'nav.clinics': 'Clinics',
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
}));


