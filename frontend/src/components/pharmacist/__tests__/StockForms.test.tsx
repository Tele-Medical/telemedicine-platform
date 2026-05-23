import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StockForms from '../StockForms';

global.fetch = vi.fn();

describe('StockForms Component', () => {
  it('renders intake and adjustment options', () => {
    render(<StockForms />);
    expect(screen.getByRole('button', { name: 'pharmacy.intake' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pharmacy.adjustment' })).toBeInTheDocument();
  });

  it('can submit a stock intake form', async () => {
    (global as any).mockFetchJson({});

    render(<StockForms />);
    
    fireEvent.change(screen.getByLabelText('pharmacy.medicine_name'), { target: { value: 'Ibuprofen' } });
    fireEvent.change(screen.getByLabelText('pharmacy.qty_received'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'nav.save' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
