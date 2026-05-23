import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InventoryLedger from '../InventoryLedger';

global.fetch = vi.fn();

const mockFetchJson = (data: any) => {
  return (global.fetch as any).mockResolvedValue({
    ok: true,
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => data,
  });
};

describe('InventoryLedger Component', () => {
  it('renders loading state initially', () => {
    mockFetchJson([]);
    
    render(<InventoryLedger />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders inventory items after loading', async () => {
    mockFetchJson([
      { id: '1', name: 'Paracetamol 650mg', current_stock: 1250, min_required_stock: 500 },
      { id: '2', name: 'Novamox 500mg', current_stock: 800, min_required_stock: 200 },
    ]);

    render(<InventoryLedger />);
    
    await waitFor(() => {
      expect(screen.getByText('Paracetamol 650mg')).toBeInTheDocument();
      expect(screen.getByText('1250')).toBeInTheDocument();
      expect(screen.getByText('Novamox 500mg')).toBeInTheDocument();
    });
  });
});
