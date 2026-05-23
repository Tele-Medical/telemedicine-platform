import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TeleconsultationRoom from './TeleconsultationRoom';

// Mock subcomponents to avoid complex side effects
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
  it('renders records panel by default', () => {
    render(
      <BrowserRouter>
        <TeleconsultationRoom userRole="practitioner" />
      </BrowserRouter>
    );
    expect(screen.getByTestId('patient-records')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'nav.records' })).toBeInTheDocument();
  });

  it('switches to Prescription tab when clicked', () => {
    render(
      <BrowserRouter>
        <TeleconsultationRoom userRole="practitioner" />
      </BrowserRouter>
    );
    const prescriptionTab = screen.getByRole('tab', { name: 'clinical.prescription' });
    fireEvent.click(prescriptionTab);
    expect(screen.getByTestId('prescription-composer')).toBeInTheDocument();
  });
});
