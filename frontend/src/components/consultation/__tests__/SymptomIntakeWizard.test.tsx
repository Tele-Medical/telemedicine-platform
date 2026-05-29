import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SymptomIntakeWizard } from '../SymptomIntakeWizard';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const texts: Record<string, string> = {
        'clinical.main_symptoms': 'What are your main symptoms? Please be descriptive.',
        'clinical.severity_q': 'How severe are your symptoms?',
        'clinical.symptoms_placeholder': 'e.g. I have had a severe headache and dizziness since yesterday morning...',
        'clinical.find_specialist': 'Find Specialist',
        'nav.continue': 'Continue',
        'clinical.severe': 'Severe'
      };
      return texts[key] || key;
    }
  })
}));

describe('SymptomIntakeWizard', () => {
  it('navigates through steps and extracts symptoms', async () => {
    const mockOnComplete = vi.fn();
    
    render(<SymptomIntakeWizard onComplete={mockOnComplete} onCancel={vi.fn()} />);

    // Step 1: Input
    expect(screen.getByText(/What are your main symptoms\? Please be descriptive\./)).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/e.g. I have had a severe headache/);
    fireEvent.change(input, { target: { value: 'Severe chest pain and palpitations' } });
    // Step 2: Details
    expect(screen.getByText(/How severe are your symptoms\?/)).toBeInTheDocument();
    const severeBtn = screen.getByText('Severe');
    fireEvent.click(severeBtn);

    const durationSelect = screen.getByRole('combobox');
    fireEvent.change(durationSelect, { target: { value: '1-3 days' } });
    
    const extractBtn = screen.getByText('Find Specialist');
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        raw_text: 'Severe chest pain and palpitations',
        symptoms: ['chest pain', 'palpitations'],
        severity: 'Severe',
        duration: '1-3 days'
      });
    }, { timeout: 3000 });
  });
});
