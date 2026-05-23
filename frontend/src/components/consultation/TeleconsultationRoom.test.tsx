import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TeleconsultationRoom from './TeleconsultationRoom';
import { BrowserRouter } from 'react-router-dom';

// Mock WebRTC and WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn(),
  addEventListener: vi.fn(),
  close: vi.fn(),
})) as any;

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
        <TeleconsultationRoom appointmentId="123" />
      </BrowserRouter>
    );

    expect(screen.getByTestId('video-feed')).toBeInTheDocument();
    expect(screen.getByTestId('patient-records')).toBeVisible();
    expect(screen.queryByTestId('prescription-composer')).not.toBeInTheDocument();
  });

  it('switches to Prescription tab when clicked', () => {
    render(
      <BrowserRouter>
        <TeleconsultationRoom appointmentId="123" />
      </BrowserRouter>
    );

    const prescriptionTab = screen.getByText('Prescription');
    fireEvent.click(prescriptionTab);

    // After switching tabs, records should not be in document, and composer should be visible
    expect(screen.queryByTestId('patient-records')).not.toBeInTheDocument();
    expect(screen.getByTestId('prescription-composer')).toBeVisible();
  });

  it('hides Prescription tab entirely for users with patient role', () => {
    render(
      <BrowserRouter>
        <TeleconsultationRoom appointmentId="123" userRole="patient" />
      </BrowserRouter>
    );

    expect(screen.getByTestId('video-feed')).toBeInTheDocument();
    expect(screen.getByTestId('patient-records')).toBeVisible();
    
    // Prescription tab and composer should not be accessible
    expect(screen.queryByText('Prescription')).not.toBeInTheDocument();
    expect(screen.queryByTestId('prescription-composer')).not.toBeInTheDocument();
  });
});
