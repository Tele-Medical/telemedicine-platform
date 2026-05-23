import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi, beforeEach } from 'vitest';

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

(global as any).mockFetchJson = (data: any, options: { ok?: boolean } = { ok: true }) => {
  return (global.fetch as any).mockResolvedValue({
    ok: options.ok !== undefined ? options.ok : true,
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => data,
  });
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// Use raw keys for tests - most stable approach for i18n unit testing
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn().mockImplementation(() => Promise.resolve()),
      language: 'en',
    },
  }),
}));
