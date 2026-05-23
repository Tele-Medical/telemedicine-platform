import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClinicalForms from '../ClinicalForms';

global.fetch = vi.fn();

describe('ClinicalForms Component', () => {
  it('renders tabs or sections for Vitals, Conditions, and Allergies', () => {
    render(<ClinicalForms patientId="patient-123" />);
    expect(screen.getByRole('button', { name: /^vitals$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^conditions$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^allergies$/i })).toBeInTheDocument();
  });

  it('can submit new vitals data', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<ClinicalForms patientId="patient-123" />);
    
    const heartRateInput = screen.getByLabelText(/heart rate/i);
    fireEvent.change(heartRateInput, { target: { value: '75' } });
    
    const submitButton = screen.getByRole('button', { name: /save vitals/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/observations'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('can add a new allergy', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<ClinicalForms patientId="patient-123" />);
    
    // Switch to allergies section
    const allergiesTabButton = screen.getByRole('button', { name: /allergies/i });
    fireEvent.click(allergiesTabButton);
    
    const allergyInput = screen.getByLabelText(/allergy substance/i);
    fireEvent.change(allergyInput, { target: { value: 'Penicillin' } });
    
    const addButton = screen.getByRole('button', { name: /add allergy/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/allergies'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
