import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SymptomIntakeWizard } from '../SymptomIntakeWizard';
import { vi } from 'vitest';

describe('SymptomIntakeWizard', () => {
  it('navigates through steps and extracts symptoms', async () => {
    const mockOnComplete = vi.fn();
    
    render(<SymptomIntakeWizard onComplete={mockOnComplete} />);

    // Step 1: Input
    expect(screen.getByText('What are your main symptoms? Please be descriptive.')).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/e.g. I have had a severe headache/);
    fireEvent.change(input, { target: { value: 'Severe chest pain and palpitations' } });
    
    const nextBtn = screen.getByText('Continue');
    fireEvent.click(nextBtn);

    // Step 2: Details
    expect(screen.getByText('How severe are your symptoms?')).toBeInTheDocument();
    const severeBtn = screen.getByText('Severe');
    fireEvent.click(severeBtn);

    const durationSelect = screen.getByRole('combobox');
    fireEvent.change(durationSelect, { target: { value: '1-3 days' } });
    
    const extractBtn = screen.getByText('Find Specialist');
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        raw_text: 'Severe chest pain and palpitations',
        symptoms: ['abdominal pain', 'nausea', 'chest pain', 'palpitations'],
        severity: 'Severe',
        duration: '1-3 days'
      });
    }, { timeout: 3000 });
  });
});
