import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClinicalForms from '../ClinicalForms';

global.fetch = vi.fn();

describe('ClinicalForms Component', () => {
  it('renders tabs or sections for Vitals, Conditions, and Allergies', () => {
    render(<ClinicalForms patientId="patient-123" />);
    expect(screen.getByRole('button', { name: 'clinical.vitals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'clinical.conditions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'clinical.allergies' })).toBeInTheDocument();
  });

  it('can submit new vitals data', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<ClinicalForms patientId="patient-123" />);
    
    const heartRateInput = screen.getByLabelText('clinical.heart_rate');
    fireEvent.change(heartRateInput, { target: { value: '75' } });
    
    const submitButton = screen.getByRole('button', { name: 'clinical.save_vitals' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/observations'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('can add a new allergy', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<ClinicalForms patientId="patient-123" />);
    
    // Switch to allergies section
    const allergiesTabButton = screen.getByRole('button', { name: 'clinical.allergies' });
    fireEvent.click(allergiesTabButton);
    
    const allergyInput = screen.getByLabelText('clinical.allergy_substance');
    fireEvent.change(allergyInput, { target: { value: 'Penicillin' } });
    
    const addButton = screen.getByRole('button', { name: 'clinical.add_allergy' });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/allergies'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
