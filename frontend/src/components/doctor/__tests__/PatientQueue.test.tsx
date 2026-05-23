import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PatientQueue from '../PatientQueue';

// Mock the global fetch
global.fetch = vi.fn();

describe('PatientQueue Component', () => {
  it('displays loading state initially', () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    
    render(<PatientQueue />);
    expect(screen.getByText(/loading queue/i)).toBeInTheDocument();
  });

  it('renders a list of appointments when fetched successfully', async () => {
    const mockAppointments = [
      { id: '1', patientName: 'John Doe', time: '10:00 AM', status: 'waiting' },
      { id: '2', patientName: 'Jane Smith', time: '10:30 AM', status: 'waiting' },
    ];
    
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    });
    
    render(<PatientQueue />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows empty state message if no appointments exist', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    
    render(<PatientQueue />);
    
    await waitFor(() => {
      expect(screen.getByText(/no patients in queue/i)).toBeInTheDocument();
    });
  });
});
