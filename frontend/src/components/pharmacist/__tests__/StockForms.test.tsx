import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StockForms from '../StockForms';

global.fetch = vi.fn();

describe('StockForms Component', () => {
  it('renders intake and adjustment options', () => {
    render(<StockForms />);
    expect(screen.getByRole('button', { name: /stock intake/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stock adjustment/i })).toBeInTheDocument();
  });

  it('can submit a stock intake form', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<StockForms />);
    
    fireEvent.click(screen.getByRole('button', { name: /stock intake/i }));
    
    const medicineInput = screen.getByLabelText(/medicine name/i);
    fireEvent.change(medicineInput, { target: { value: 'Ibuprofen' } });
    
    const quantityInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(quantityInput, { target: { value: '100' } });
    
    const submitButton = screen.getByRole('button', { name: /submit intake/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/inventory/stock-intake'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
