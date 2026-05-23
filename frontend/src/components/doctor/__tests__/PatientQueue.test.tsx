import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PatientQueue from '../PatientQueue';

global.fetch = vi.fn();

describe('PatientQueue Component', () => {
  it('displays loading state initially', () => {
    (global as any).mockFetchJson([]);
    render(<BrowserRouter><PatientQueue /></BrowserRouter>);
    expect(screen.getByText('app.loading')).toBeInTheDocument();
  });

  it('renders a list of appointments', async () => {
    const mockAppointments = [
      { id: '1', patientName: 'John Doe', time: new Date().toISOString(), status: 'waiting' },
    ];
    (global as any).mockFetchJson(mockAppointments);
    render(<BrowserRouter><PatientQueue /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows empty state', async () => {
    (global as any).mockFetchJson([]);
    render(<BrowserRouter><PatientQueue /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('clinical.no_patients_queue')).toBeInTheDocument();
    });
  });
});
