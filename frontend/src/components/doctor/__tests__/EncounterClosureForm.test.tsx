import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EncounterClosureForm from '../EncounterClosureForm';

global.fetch = vi.fn();

describe('EncounterClosureForm Component', () => {
  const renderWithRouter = (id: string) => {
    return render(
      <MemoryRouter initialEntries={[`/encounter/${id}`]}>
        <Routes>
          <Route path="/encounter/:encounterId" element={<EncounterClosureForm />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the summary and outcome text areas', () => {
    renderWithRouter('enc-1');
    expect(screen.getByLabelText(/clinical.summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinical.outcome/i)).toBeInTheDocument();
  });

  it('submits the encounter summary', async () => {
    (global as any).mockFetchJson({});

    renderWithRouter('enc-1');
    
    fireEvent.change(screen.getByLabelText(/clinical.summary/i), { target: { value: 'Recovering' } });
    fireEvent.click(screen.getByRole('button', { name: 'clinical.finalize_encounter' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
