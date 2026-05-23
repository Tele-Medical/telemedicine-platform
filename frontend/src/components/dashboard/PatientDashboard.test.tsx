import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PatientDashboard from './PatientDashboard';
import { appointmentService, authService } from '../../api/services';

vi.mock('../../api/services', () => ({
  appointmentService: { getAppointments: vi.fn() },
  authService: { getMe: vi.fn() },
}));

describe('PatientDashboard Component', () => {
  it('renders the dashboard', async () => {
    (authService.getMe as any).mockResolvedValue({ full_name: 'Ajeet' });
    (appointmentService.getAppointments as any).mockResolvedValue([]);
    render(<PatientDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Ajeet/i)).toBeInTheDocument();
    });
    expect(screen.getByText('app.health_overview')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    (authService.getMe as any).mockResolvedValue({ full_name: 'Ajeet' });
    (appointmentService.getAppointments as any).mockResolvedValue([]);
    render(<PatientDashboard />);
    await waitFor(() => {
      expect(screen.getByText('clinical.no_appointments')).toBeInTheDocument();
    });
  });

  it('covers error flow', async () => {
    (authService.getMe as any).mockRejectedValue(new Error('API Error'));
    (appointmentService.getAppointments as any).mockResolvedValue([]);
    render(<PatientDashboard />);
    await waitFor(() => {
      expect(screen.getByText('app.sync_failed')).toBeInTheDocument();
    });
    (authService.getMe as any).mockResolvedValue({ full_name: 'Ajeet' });
    fireEvent.click(screen.getByRole('button', { name: 'app.retry' }));
    await waitFor(() => {
      expect(screen.getByText(/Ajeet/i)).toBeInTheDocument();
    });
  });
});
