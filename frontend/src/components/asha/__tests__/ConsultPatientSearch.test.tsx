import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ConsultPatientSearch from '../ConsultPatientSearch';
import { db } from '../../../db/db';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

global.fetch = vi.fn();

describe('ConsultPatientSearch Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.patients.clear();
    (global as any).mockFetchJson([]);
  });

  it('renders lookup form elements correctly', () => {
    render(
      <MemoryRouter>
        <ConsultPatientSearch />
      </MemoryRouter>
    );

    expect(screen.getByText('Patient Lookup')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 9876543210')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search Profile/i })).toBeInTheDocument();
  });

  it('validates for standard 10-digit Indian phone numbers', async () => {
    render(
      <MemoryRouter>
        <ConsultPatientSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('e.g. 9876543210');
    const button = screen.getByRole('button', { name: /Search Profile/i });

    // Invalid: letters
    fireEvent.change(input, { target: { value: '999abc9999' } });
    // Should filter characters to numbers only
    expect(input).toHaveValue('9999999');

    // Invalid: starts with 5 (10 digits, button enabled but invalid format)
    fireEvent.change(input, { target: { value: '5555555555' } });
    fireEvent.click(button);
    expect(await screen.findByText('Please enter a valid 10-digit mobile number starting with 6-9.')).toBeInTheDocument();
  });

  it('executes Pathway A routing to family directory when results are found', async () => {
    // Write a local patient mock
    await db.patients.put({
      id: 'patient-uuid-1',
      full_name: 'Asha Singh',
      phone: '9876543210',
      has_phone: true,
    });

    render(
      <MemoryRouter>
        <ConsultPatientSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('e.g. 9876543210');
    const button = screen.getByRole('button', { name: /Search Profile/i });

    fireEvent.change(input, { target: { value: '9876543210' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/consult-patient/family?phone=9876543210');
    });
  });

  it('executes Pathway B warning and navigation when no matches are found', async () => {
    render(
      <MemoryRouter>
        <ConsultPatientSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('e.g. 9876543210');
    const button = screen.getByRole('button', { name: /Search Profile/i });

    fireEvent.change(input, { target: { value: '9123456789' } });
    fireEvent.click(button);

    // Should display warning
    expect(await screen.findByText('Number Not Registered')).toBeInTheDocument();
    
    // Clicking "Register New Patient" routes with prefilled number
    const registerBtn = screen.getByRole('button', { name: /Register New Patient/i });
    fireEvent.click(registerBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/register?phone=9123456789');
  });
});
