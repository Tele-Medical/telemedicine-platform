import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FamilyDirectory from '../FamilyDirectory';
import { db } from '../../../db/db';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('phone=9876543210'), vi.fn()],
  };
});

global.fetch = vi.fn();

describe('FamilyDirectory Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.patients.clear();
    (global as any).mockFetchJson([]);
  });

  it('renders family directory with loading state initially', () => {
    render(
      <MemoryRouter>
        <FamilyDirectory />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading Family Hub/i)).toBeInTheDocument();
  });

  it('queries IndexedDB and renders matching family member profile cards', async () => {
    // Put mock patient
    await db.patients.put({
      id: 'patient-uuid-1',
      full_name: 'Sardar Singh',
      phone: '9876543210',
      gender: 'male',
      has_phone: true,
    });

    render(
      <MemoryRouter>
        <FamilyDirectory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Sardar Singh')).toBeInTheDocument();
    expect(screen.getByText('male')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Consult Patient/i })).toBeInTheDocument();
  });

  it('navigates to registration with prefilled phone when clicking add member', async () => {
    render(
      <MemoryRouter>
        <FamilyDirectory />
      </MemoryRouter>
    );

    const addBtn = await screen.findByText('Add a New Family Member');
    fireEvent.click(addBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/register?phone=9876543210');
  });

  it('navigates to consultation page when clicking consult patient', async () => {
    await db.patients.put({
      id: 'patient-uuid-2',
      full_name: 'Jeet Kaur',
      phone: '9876543210',
      gender: 'female',
      has_phone: true,
    });

    render(
      <MemoryRouter>
        <FamilyDirectory />
      </MemoryRouter>
    );

    const consultBtn = await screen.findByRole('button', { name: /Consult Patient/i });
    fireEvent.click(consultBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/consultation-flow/patient-uuid-2');
  });
});
