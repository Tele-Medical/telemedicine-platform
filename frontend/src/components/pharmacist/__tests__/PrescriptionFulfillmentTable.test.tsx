import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrescriptionFulfillmentTable from '../PrescriptionFulfillmentTable';

global.fetch = vi.fn();

describe('PrescriptionFulfillmentTable Component', () => {
  it('renders pending prescriptions', async () => {
    const mockPrescriptions = [
      { id: 'presc-1', patientName: 'Alice', status: 'pending', medications: ['Aspirin'] },
    ];
    
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => mockPrescriptions });

    render(<PrescriptionFulfillmentTable />);
    
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });
  });

  it('allows a pharmacist to accept a prescription', async () => {
    const mockPrescriptions = [
      { id: 'presc-1', patientName: 'Alice', status: 'pending', medications: ['Aspirin'] },
    ];
    
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => mockPrescriptions });

    render(<PrescriptionFulfillmentTable />);
    
    await waitFor(() => {
      const acceptButton = screen.getByRole('button', { name: /accept/i });
      fireEvent.click(acceptButton);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/fulfillments/prescription/presc-1/accept'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
