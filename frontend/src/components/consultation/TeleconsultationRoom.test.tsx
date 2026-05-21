import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TeleconsultationRoom from './TeleconsultationRoom';
import { BrowserRouter } from 'react-router-dom';

vi.mock('./VideoFeed', () => ({
  default: () => <div data-testid="video-feed">Video Feed</div>
}));

vi.mock('./PatientRecordsPanel', () => ({
  default: () => <div data-testid="patient-records">Patient Records</div>
}));

vi.mock('./PrescriptionComposer', () => ({
  default: () => <div data-testid="prescription-composer">Prescription Composer</div>
}));

describe('TeleconsultationRoom Component', () => {
  it('renders video feed and default active tab (Records)', () => {
    render(
      <BrowserRouter>
        <TeleconsultationRoom />
      </BrowserRouter>
    );

    expect(screen.getByTestId('video-feed')).toBeInTheDocument();
    expect(screen.getByTestId('patient-records')).toBeVisible();
    expect(screen.getByTestId('prescription-composer')).not.toBeVisible();
  });

  it('switches to Prescription tab when clicked', () => {
    render(
      <BrowserRouter>
        <TeleconsultationRoom />
      </BrowserRouter>
    );

    const prescriptionTab = screen.getByText('Prescription');
    fireEvent.click(prescriptionTab);

    expect(screen.getByTestId('patient-records')).not.toBeVisible();
    expect(screen.getByTestId('prescription-composer')).toBeVisible();
  });
});
