import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrescriptionFulfillmentTable from '../PrescriptionFulfillmentTable';

global.fetch = vi.fn();

describe('PrescriptionFulfillmentTable Component', () => {
  it('renders pending prescriptions', async () => {
    const mockPrescriptions = [
      { id: 'presc-1', patientName: 'Alice', status: 'pending', medications: ['Aspirin'] },
    ];
    (global as any).mockFetchJson(mockPrescriptions);
    render(<PrescriptionFulfillmentTable />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });
  });

  it('allows fulfilling a prescription', async () => {
    const mockPrescriptions = [
      { id: 'presc-1', patientName: 'Alice', status: 'pending', medications: ['Aspirin'] },
    ];
    (global as any).mockFetchJson(mockPrescriptions);
    render(<PrescriptionFulfillmentTable />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'nav.fulfill' });
      fireEvent.click(btn);
    });
    expect(global.fetch).toHaveBeenCalled();
  });
});
