import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../../api/services', () => ({
  authService: {
    getMe: vi.fn().mockResolvedValue({ full_name: 'Ajeet' }),
  },
  appointmentService: {
    getAppointments: vi.fn().mockResolvedValue([]),
  }
}));

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
    expect(screen.getByText('Here is your health overview.')).toBeInTheDocument();

    // Check subcomponents
    expect(screen.getByTestId('upcoming-appointment-card')).toBeInTheDocument();
    expect(screen.getByTestId('vitals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('recent-records-list')).toBeInTheDocument();
  });
});
