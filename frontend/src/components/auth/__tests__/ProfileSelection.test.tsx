
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfileSelection } from '../ProfileSelection';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

global.fetch = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProfileSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-token');
  });

  it('renders family profiles and handles selection', async () => {
    localStorage.setItem('user_role', 'patient');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'p1', full_name: 'Parent' },
        { id: 'p2', full_name: 'Child' }
      ]
    } as any);

    render(
      <MemoryRouter>
        <ProfileSelection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Who is this appointment for?')).toBeInTheDocument();
    });

    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Child'));

    await waitFor(() => {
      expect(localStorage.getItem('active_patient_id')).toBe('p2');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/patient');
    });
  });

  it('redirects ASHA workers to /dashboard/asha after selection', async () => {
    localStorage.setItem('user_role', 'asha_worker');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'p1', full_name: 'ASHA Helper' }
      ]
    } as any);

    render(
      <MemoryRouter>
        <ProfileSelection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ASHA Helper')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ASHA Helper'));

    await waitFor(() => {
      expect(localStorage.getItem('active_patient_id')).toBe('p1');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/asha');
    });
  });
});
