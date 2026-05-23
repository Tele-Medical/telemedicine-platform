import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InventoryLedger from '../InventoryLedger';

global.fetch = vi.fn();

describe('InventoryLedger Component', () => {
  it('renders loading state initially', () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    
    render(<InventoryLedger />);
    expect(screen.getByText(/loading inventory/i)).toBeInTheDocument();
  });

  it('renders inventory items when data is fetched', async () => {
    const mockInventory = [
      { id: '1', medicineName: 'Paracetamol 500mg', stockQuantity: 250, unit: 'tablets' },
      { id: '2', medicineName: 'Amoxicillin 250mg', stockQuantity: 50, unit: 'capsules' },
    ];
    
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockInventory,
    });
    
    render(<InventoryLedger />);
    
    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.getByText('250')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
    });
  });
});
