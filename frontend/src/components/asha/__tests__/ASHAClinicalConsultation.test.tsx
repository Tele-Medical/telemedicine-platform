import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ASHAClinicalConsultation from '../ASHAClinicalConsultation';
import { db } from '../../../db/db';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ patientId: 'test-patient-uuid' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
  console.log('--- MOCK FETCH:', url, options?.method || 'GET');
  if (url.includes('/practitioners/')) {
    return Promise.resolve({
      ok: true,
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: async () => [{ id: 'doc-uuid-1', full_name: 'Dr. Anita', specialty: 'Cardiology' }],
    });
  }
  if (url.includes('/appointments/')) {
    return Promise.resolve({
      ok: true,
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({
        triage_priority: 'Urgent',
        practitioner_id: 'doc-uuid-1',
      }),
    });
  }
  return Promise.resolve({
    ok: true,
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => ([]),
  });
});

describe('ASHAClinicalConsultation Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    await db.patients.clear();
    await db.observations.clear();
    await db.documents.clear();
    await db.symptoms.clear();
    
    // Seed patient details
    await db.patients.put({
      id: 'test-patient-uuid',
      full_name: 'Harpreet Singh',
      phone: '9876543210',
      gender: 'male',
      has_phone: true,
    });
  });

  it('renders clinical consultation page and toggles between tabs', async () => {
    render(
      <MemoryRouter>
        <ASHAClinicalConsultation />
      </MemoryRouter>
    );

    // Header name should load from Dexie patient details
    expect(await screen.findByText('Harpreet Singh')).toBeInTheDocument();

    // Verify Tab buttons render
    expect(screen.getByRole('button', { name: /Symptoms/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vitals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reports/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Booking/i })).toBeInTheDocument();

    // Symptoms tab should be active by default
    expect(screen.getByPlaceholderText(/Describe patient symptoms/i)).toBeInTheDocument();

    // Switch to Vitals Tab
    fireEvent.click(screen.getByRole('button', { name: /Vitals/i }));
    expect(screen.getByPlaceholderText('e.g. 98.6')).toBeInTheDocument(); // Temp input placeholder

    // Switch to Reports Tab
    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));
    expect(screen.getByText(/Drag and drop lab reports/i)).toBeInTheDocument();

    // Switch to Booking Tab
    fireEvent.click(screen.getByRole('button', { name: /Booking/i }));
    expect(screen.getByRole('button', { name: /Smart Triage Auto-Route/i })).toBeInTheDocument();
  });

  it('auto-calculates patient BMI dynamically when height and weight are entered', async () => {
    render(
      <MemoryRouter>
        <ASHAClinicalConsultation />
      </MemoryRouter>
    );

    // Go to Vitals Tab
    fireEvent.click(screen.getByRole('button', { name: /Vitals/i }));

    const heightInput = screen.getByLabelText(/Height/i);
    const weightInput = screen.getByLabelText(/Weight/i);

    fireEvent.change(heightInput, { target: { value: '180' } });
    fireEvent.change(weightInput, { target: { value: '80' } });

    // BMI = 80 / (1.8^2) = 24.69 (Normal weight classification)
    await waitFor(() => {
      expect(screen.getByText('24.69')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
    });
  });

  it('verifies off-range vitals validation and warnings', async () => {
    render(
      <MemoryRouter>
        <ASHAClinicalConsultation />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Vitals/i }));

    const spo2Input = screen.getByLabelText(/Oxygen Saturation/i);
    const bloodSugarInput = screen.getByLabelText(/Blood Glucose/i);

    // Input low oxygen SpO2 (triggers alert warning badge)
    fireEvent.change(spo2Input, { target: { value: '92' } });
    await waitFor(() => {
      expect(screen.getByText(/Hypoxic Alert/i)).toBeInTheDocument();
    });

    // Input high blood sugar (triggers alert warning badge)
    fireEvent.change(bloodSugarInput, { target: { value: '250' } });
    await waitFor(() => {
      expect(screen.getByText(/Hyperglycemia Alert/i)).toBeInTheDocument();
    });
  });

  it('serializes uploaded report documents to Base64 in IndexedDB when offline', async () => {
    // Set network to offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    render(
      <MemoryRouter>
        <ASHAClinicalConsultation />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

    const file = new File(['dummy content'], 'report.pdf', { type: 'application/pdf' });
    const uploaderInput = screen.getByTestId('reports-uploader-input') as HTMLInputElement;

    // Simulate file drop/change
    Object.defineProperty(uploaderInput, 'files', { value: [file] });
    fireEvent.change(uploaderInput);

    await waitFor(async () => {
      const dbDocs = await db.documents.toArray();
      expect(dbDocs.length).toBe(1);
      expect(dbDocs[0].file_name).toBe('report.pdf');
      expect(dbDocs[0].content_type).toBe('application/pdf');
      expect(dbDocs[0].base64_data).toContain('data:application/pdf;base64');
    });
  });

  it('integrates ML Auto-Route scheduling specialty matching', async () => {
    render(
      <MemoryRouter>
        <ASHAClinicalConsultation />
      </MemoryRouter>
    );

    // Go to Booking Tab
    fireEvent.click(screen.getByRole('button', { name: /Booking/i }));

    // Wait for practitioners to load into the dropdown
    await waitFor(() => {
      const select = screen.getByLabelText(/Select Doctor/i) as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });

    const mlTriageBtn = screen.getByRole('button', { name: /Smart Triage Auto-Route/i });
    fireEvent.click(mlTriageBtn);

    await waitFor(() => {
      expect(screen.getByText(/Recommended Specialty: Cardiology/i)).toBeInTheDocument();
      expect(screen.getByText(/Priority Level: Urgent/i)).toBeInTheDocument();
    });
  });
});
