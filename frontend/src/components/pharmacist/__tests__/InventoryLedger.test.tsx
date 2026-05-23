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
    expect(screen.getByText('app.loading')).toBeInTheDocument();
  });

  it('renders inventory items after loading', async () => {
    render(<InventoryLedger />);
    
    await waitFor(() => {
      expect(screen.getByText('Paracetamol 650mg')).toBeInTheDocument();
      expect(screen.getByText('1250')).toBeInTheDocument();
      expect(screen.getByText('Novamox 500mg')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
