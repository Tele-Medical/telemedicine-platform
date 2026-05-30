import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrescriptionFulfillmentTable from '../PrescriptionFulfillmentTable';

global.fetch = vi.fn();

describe('PrescriptionFulfillmentTable Component', () => {
  it('renders dynamic supply hub', async () => {
    const mockData = [
      { medicine_id: 'med-1', medicine_name: 'Aspirin', current_stock: 100, total_local_demand: 20 },
    ];
    (global as any).mockFetchJson(mockData);
    render(<PrescriptionFulfillmentTable />);
    await waitFor(() => {
      expect(screen.getByText('Dynamic Supply Hub')).toBeInTheDocument();
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });
  });
});
