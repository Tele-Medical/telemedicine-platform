import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppointmentScheduler from '../AppointmentScheduler';

global.fetch = vi.fn();

describe('AppointmentScheduler Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/v1/practitioners')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: '1', name: 'Dr. John Watson', specialization: 'General Physician' },
            { id: '2', name: 'Dr. House', specialization: 'Diagnostician' },
          ],
        });
      }
      if (url.includes('/api/v1/appointments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'appt-123' }),
        });
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });
  });

  it('fetches and displays the practitioner directory', async () => {
    render(<AppointmentScheduler patientId="patient-123" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Dr. John Watson/i)).toBeInTheDocument();
      expect(screen.getByText(/General Physician/i)).toBeInTheDocument();
    });
  });

  it('submits a new appointment booking', async () => {
    render(<AppointmentScheduler patientId="patient-123" />);
    
    // Wait for the practitioners dropdown to be populated with options
    await screen.findByText(/Dr. John Watson/i);
    
    // Select the doctor
    const doctorSelect = screen.getByLabelText(/select doctor/i);
    fireEvent.change(doctorSelect, { target: { value: '1' } });
    
    // Set the date
    const dateInput = screen.getByLabelText(/appointment date/i);
    fireEvent.change(dateInput, { target: { value: '2023-12-01T10:00' } });
    
    // Click the book button
    const bookButton = screen.getByRole('button', { name: /book appointment/i });
    expect(bookButton).not.toBeDisabled();
    
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/appointments'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
