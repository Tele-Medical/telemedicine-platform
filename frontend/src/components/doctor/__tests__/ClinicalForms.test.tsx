import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClinicalForms from '../ClinicalForms';

// Mock useParams
vi.mock('react-router-dom', () => ({
  useParams: () => ({ patientId: 'patient-123' }),
}));

global.fetch = vi.fn();

describe('ClinicalForms Component', () => {
  it('renders tabs or sections', () => {
    render(<ClinicalForms />);
    expect(screen.getByRole('button', { name: 'clinical.vitals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'clinical.conditions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'clinical.allergies' })).toBeInTheDocument();
  });

  it('can submit new vitals data', async () => {
    (global as any).mockFetchJson({});

    render(<ClinicalForms />);
    
    fireEvent.change(screen.getByLabelText('clinical.heart_rate'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'clinical.save_vitals' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
