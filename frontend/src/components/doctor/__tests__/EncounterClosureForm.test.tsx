import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EncounterClosureForm from '../EncounterClosureForm';

global.fetch = vi.fn();

describe('EncounterClosureForm Component', () => {
  it('renders the summary and outcome text areas', () => {
    render(<EncounterClosureForm encounterId="enc-1" />);
    expect(screen.getByLabelText(/clinical summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/outcome/i)).toBeInTheDocument();
  });

  it('submits the encounter summary to the backend', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<EncounterClosureForm encounterId="enc-1" />);
    
    const summaryInput = screen.getByLabelText(/clinical summary/i);
    fireEvent.change(summaryInput, { target: { value: 'Patient is recovering well.' } });
    
    const finalizeButton = screen.getByRole('button', { name: /finalize encounter/i });
    fireEvent.click(finalizeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/encounters/enc-1/summary'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows validation error if summary is empty', async () => {
    render(<EncounterClosureForm encounterId="enc-1" />);
    
    const finalizeButton = screen.getByRole('button', { name: /finalize encounter/i });
    fireEvent.click(finalizeButton);

    await waitFor(() => {
      expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
    });
  });
});
