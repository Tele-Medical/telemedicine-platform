import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PatientDashboard from './PatientDashboard';
import { BrowserRouter } from 'react-router-dom';

// Mock sub-components
vi.mock('./UpcomingAppointmentCard', () => ({
  default: () => <div data-testid="upcoming-appointment-card">Appointment Card</div>
}));

vi.mock('./VitalsWidget', () => ({
  default: () => <div data-testid="vitals-widget">Vitals Widget</div>
}));

vi.mock('./RecentRecordsList', () => ({
  default: () => <div data-testid="recent-records-list">Recent Records</div>
}));

vi.mock('../../api/services', () => {
  const mockAppointments = [
    {
      id: 'appt-123',
      practitioner_name: 'Dr. Sharma',
      practitioner_role: 'General Physician',
      scheduled_for: new Date(Date.now() + 3600000).toISOString(),
      status: 'confirmed'
    }
  ];
  return {
    authService: {
      getMe: vi.fn().mockResolvedValue({ full_name: 'Ajeet' }),
    },
    appointmentService: {
      getAppointments: vi.fn().mockResolvedValue(mockAppointments),
    }
  };
});

describe('PatientDashboard Component', () => {
  it('renders the dashboard with upcoming appointment, vitals, and records', async () => {
    render(
      <BrowserRouter>
        <PatientDashboard />
      </BrowserRouter>
    );
    
    // Check main title
    await waitFor(() => {
      expect(screen.getByText('Good morning, Ajeet')).toBeInTheDocument();
    });
    expect(screen.getByText('Here is your digital health overview.')).toBeInTheDocument();

    // Check subcomponents
    expect(screen.getByTestId('upcoming-appointment-card')).toBeInTheDocument();
    expect(screen.getByTestId('vitals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('recent-records-list')).toBeInTheDocument();
  });

  it('renders the dashboard with empty state when no appointments exist', async () => {
    const { appointmentService } = await import('../../api/services');
    vi.mocked(appointmentService.getAppointments).mockResolvedValueOnce([]);

    render(
      <BrowserRouter>
        <PatientDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Good morning, Ajeet')).toBeInTheDocument();
    });

    expect(screen.getByText('No upcoming consultations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book appointment/i })).toBeInTheDocument();
    expect(screen.queryByTestId('upcoming-appointment-card')).not.toBeInTheDocument();
  });

  it('covers the retryable error flow', async () => {
    const { appointmentService } = await import('../../api/services');
    const mockAppointments = [
      {
        id: 'appt-123',
        practitioner_name: 'Dr. Sharma',
        practitioner_role: 'General Physician',
        scheduled_for: new Date(Date.now() + 3600000).toISOString(),
        status: 'confirmed'
      }
    ];

    vi.mocked(appointmentService.getAppointments)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockAppointments);

    render(
      <BrowserRouter>
        <PatientDashboard />
      </BrowserRouter>
    );

    // Should show error banner
    await waitFor(() => {
      expect(screen.getByText('Failed to sync your health records. Please verify your connection.')).toBeInTheDocument();
    });

    // Click Retry
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    // Error banner should disappear and upcoming appointment should show
    await waitFor(() => {
      expect(screen.queryByText('Failed to sync your health records. Please verify your connection.')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('upcoming-appointment-card')).toBeInTheDocument();
  });
});
