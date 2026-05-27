import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PrescriptionComposer from '../PrescriptionComposer';
import { vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../api/client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '../../../api/client';

describe('PrescriptionComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('allows adding medicines and submitting', async () => {
    vi.mocked(apiClient).mockResolvedValue({});

    render(<PrescriptionComposer patientId="p1" />);

    // Add a medicine
    const medInput = screen.getByPlaceholderText('e.g. Paracetamol 500mg');
    fireEvent.change(medInput, { target: { value: 'Custom Syrup' } });
    
    // Dosage select
    const doseSelect = screen.getByRole('combobox');
    fireEvent.change(doseSelect, { target: { value: '1-1-1 (Three times)' } });

    // Duration input
    const durationInput = screen.getByPlaceholderText('5');
    fireEvent.change(durationInput, { target: { value: '3' } });

    // Click Add
    fireEvent.click(screen.getByText('pharmacy.add_medicine', { selector: 'button span' }));

    // Check if added
    expect(screen.getByText('Custom Syrup')).toBeInTheDocument();

    // Notes
    const notesInput = screen.getByPlaceholderText('Rest, drink plenty of fluids...');
    fireEvent.change(notesInput, { target: { value: 'Take with water' } });

    // Save
    fireEvent.click(screen.getByText('pharmacy.save_prescription'));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith('/prescriptions', {
        method: 'POST',
        body: expect.stringContaining('"medicine_name":"Custom Syrup"')
      });
      expect(apiClient).toHaveBeenCalledWith('/prescriptions', {
        method: 'POST',
        body: expect.stringContaining('"notes":"Take with water"')
      });
      expect(screen.getByText('pharmacy.draft_saved')).toBeInTheDocument();
    });
  });
});
