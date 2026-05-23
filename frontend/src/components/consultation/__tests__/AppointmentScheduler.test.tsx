import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppointmentScheduler from '../AppointmentScheduler';

global.fetch = vi.fn();

describe('AppointmentScheduler Component', () => {
  it('fetches and displays practitioner directory', async () => {
    (global as any).mockFetchJson([{ id: 'doc-1', name: 'Dr. Watson', specialization: 'GP' }]);
    render(<AppointmentScheduler patientId="p-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Dr. Watson/i)).toBeInTheDocument();
    });
  });

  it('can schedule an appointment', async () => {
    (global as any).mockFetchJson([{ id: 'doc-1', name: 'Dr. Watson', specialization: 'GP' }]);
    render(<AppointmentScheduler patientId="p-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Dr. Watson/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('clinical.select_doctor'), { target: { value: 'doc-1' } });
    fireEvent.change(screen.getByLabelText('clinical.appt_datetime'), { target: { value: '2026-10-30T10:00' } });
    (global as any).mockFetchJson({ id: 'appt-1' });
    fireEvent.click(screen.getByRole('button', { name: 'clinical.book_appointment' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
