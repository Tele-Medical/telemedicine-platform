import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VideoFeed from '../VideoFeed';
import { BrowserRouter } from 'react-router-dom';

// Mock apiClient
vi.mock('../../api/client', () => ({
  apiClient: vi.fn().mockResolvedValue({
    practitioner_name: 'Dr. Nabha',
    patient_name: 'Rajesh Kumar'
  })
}));

// Mock WebRTC and WebSocket
let websocketInstance: any = null;
const MockWebSocket = vi.fn().mockImplementation(() => {
  const ws = {
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    readyState: 1, // WebSocket.OPEN
  };
  websocketInstance = ws;
  return ws;
});
(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CONNECTING = 0;
(MockWebSocket as any).CLOSING = 2;
(MockWebSocket as any).CLOSED = 3;
global.WebSocket = MockWebSocket as unknown as any;

let peerConnectionInstance: any = null;
global.RTCPeerConnection = vi.fn().mockImplementation((config) => {
  const pc = {
    config,
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn(),
    close: vi.fn(),
    connectionState: 'new',
    iceConnectionState: 'new',
    onconnectionstatechange: null,
    oniceconnectionstatechange: null,
    onicecandidate: null,
    ontrack: null,
  };
  peerConnectionInstance = pc;
  return pc;
}) as unknown as any;

global.RTCSessionDescription = vi.fn().mockImplementation((init) => init) as any;
global.RTCIceCandidate = vi.fn().mockImplementation((init) => init) as any;

// Mock MediaDevices
const mockTrack = { id: 'track-1', kind: 'video', stop: vi.fn(), enabled: true };
const mockAudioTrack = { id: 'track-2', kind: 'audio', stop: vi.fn(), enabled: true };
const mockStream = {
  getTracks: () => [mockTrack, mockAudioTrack],
  getAudioTracks: () => [mockAudioTrack],
  getVideoTracks: () => [mockTrack],
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  configurable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  },
});

const playMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: playMock,
});

describe('VideoFeed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playMock.mockResolvedValue(undefined);
    localStorage.setItem('token', 'mock-token');
  });

  it('renders initial connecting states and initiates connection', async () => {
    render(
      <BrowserRouter>
        <VideoFeed appointmentId="appt-123" userRole="patient" />
      </BrowserRouter>
    );

    // Initial connection state badge should show connecting
    expect(screen.getAllByText(/clinical.connecting/i)[0]).toBeInTheDocument();

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(global.RTCPeerConnection).toHaveBeenCalled();
      expect(global.WebSocket).toHaveBeenCalled();
    });
  });

  it('correctly passes TURN configurations in RTCPeerConnection options', async () => {
    // Inject mock VITE_TURN_URL
    import.meta.env.VITE_TURN_URL = 'turn:turn.nabha.in:443';
    import.meta.env.VITE_TURN_USERNAME = 'nabha-user';
    import.meta.env.VITE_TURN_CREDENTIAL = 'nabha-pass';

    render(
      <BrowserRouter>
        <VideoFeed appointmentId="appt-123" userRole="patient" />
      </BrowserRouter>
    );

    await waitFor(() => {
      const pcCallConfig = (global.RTCPeerConnection as any).mock.calls[0][0];
      const iceServers = pcCallConfig.iceServers;
      
      // Google STUN servers + our mock VITE_TURN_URL
      expect(iceServers.length).toBe(3);
      expect(iceServers[2]).toEqual({
        urls: 'turn:turn.nabha.in:443',
        username: 'nabha-user',
        credential: 'nabha-pass',
      });
    });

    // Reset env
    delete import.meta.env.VITE_TURN_URL;
    delete import.meta.env.VITE_TURN_USERNAME;
    delete import.meta.env.VITE_TURN_CREDENTIAL;
  });

  it('handles remote track addition and plays it', async () => {
    render(
      <BrowserRouter>
        <VideoFeed appointmentId="appt-123" userRole="patient" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(peerConnectionInstance).not.toBeNull();
    });

    // Trigger ontrack event
    const dummyTrack = { id: 'remote-track', kind: 'video', stop: vi.fn(), enabled: true };
    const dummyStream = { id: 'remote-stream', addTrack: vi.fn() };
    
    peerConnectionInstance.ontrack({
      track: dummyTrack,
      streams: [dummyStream],
    });

    // Play should be called immediately on track addition
    expect(playMock).toHaveBeenCalled();
  });

  it('displays premium autoplay overlay and handles user resolution click', async () => {
    // Make play() fail with a NotAllowedError to simulate browser autoplay policy blocking unmuted stream
    const error = new DOMException('Autoplay prevented', 'NotAllowedError');
    playMock.mockRejectedValue(error);

    render(
      <BrowserRouter>
        <VideoFeed appointmentId="appt-123" userRole="patient" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(peerConnectionInstance).not.toBeNull();
    });

    // Trigger remote track addition which will attempt to play and catch NotAllowedError
    const dummyTrack = { id: 'remote-track', kind: 'video', stop: vi.fn(), enabled: true };
    const dummyStream = { id: 'remote-stream', addTrack: vi.fn() };
    
    peerConnectionInstance.ontrack({
      track: dummyTrack,
      streams: [dummyStream],
    });

    // Wait for the blocked overlay to appear
    await waitFor(() => {
      expect(screen.getByText('clinical.click_to_join')).toBeInTheDocument();
    });

    // Reset playMock to succeed for the manual unblock gesture
    playMock.mockResolvedValueOnce(undefined);

    // Click the overlay to manual-play and unmute
    const overlayButton = screen.getByText('clinical.click_to_join').closest('button');
    fireEvent.click(overlayButton!);

    // Play should be called again and overlay should disappear
    expect(playMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('clinical.click_to_join')).not.toBeInTheDocument();
    });
  });

  it('does not transition connectionState on premature offer/answer messages', async () => {
    render(
      <BrowserRouter>
        <VideoFeed appointmentId="appt-123" userRole="patient" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(websocketInstance).not.toBeNull();
    });

    // Simulate receiving an offer signaling message
    websocketInstance.onmessage({
      data: JSON.stringify({
        type: 'offer',
        sdp: 'remote-sdp',
      }),
    });

    // Premature state change is removed, so it should stay connecting until actual connectionStateChange event
    expect(screen.getAllByText(/clinical.connecting/i)[0]).toBeInTheDocument();

    // Trigger actual connection change event
    peerConnectionInstance.connectionState = 'connected';
    peerConnectionInstance.onconnectionstatechange();

    await waitFor(() => {
      expect(screen.getByText('clinical.excellent_signal')).toBeInTheDocument();
    });
  });

  it('handles ping-pong handshake and doctor initiates exactly one offer', async () => {
    render(
      <BrowserRouter>
        <VideoFeed appointmentId="appt-123" userRole="doctor" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(websocketInstance).not.toBeNull();
    });

    // Simulate welcome -> should send peer_present
    websocketInstance.onmessage({
      data: JSON.stringify({ type: 'welcome' }),
    });

    await waitFor(() => {
      expect(websocketInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'peer_present' }));
    });

    // Reset mocks to test offer creation
    vi.clearAllMocks();
    peerConnectionInstance.signalingState = 'stable';

    // Simulate peer_joined -> doctor should send peer_present AND an offer
    websocketInstance.onmessage({
      data: JSON.stringify({ type: 'peer_joined' }),
    });

    await waitFor(() => {
      expect(websocketInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'peer_present' }));
      expect(peerConnectionInstance.createOffer).toHaveBeenCalled();
    });
  });

  it('prevents multiple offers from rapid peer_present messages', async () => {
    render(
      <BrowserRouter>
        <VideoFeed appointmentId="appt-123" userRole="doctor" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(websocketInstance).not.toBeNull();
    });
    
    peerConnectionInstance.signalingState = 'stable';

    // Simulate peer_present, which triggers an offer
    websocketInstance.onmessage({ data: JSON.stringify({ type: 'peer_present' }) });

    await waitFor(() => {
      expect(peerConnectionInstance.createOffer).toHaveBeenCalled();
    });

    // Set local description to simulate the first offer completed
    peerConnectionInstance.localDescription = { type: 'offer', sdp: 'fake-sdp' };
    vi.clearAllMocks();

    // Fire another peer_present -> should NOT trigger another createOffer
    websocketInstance.onmessage({ data: JSON.stringify({ type: 'peer_present' }) });

    // Wait a bit to ensure it wasn't called
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(peerConnectionInstance.createOffer).not.toHaveBeenCalled();
  });

  it('updates local chat on registerSendChat invocation', async () => {
    let mockRegisterChat: any = null;
    const mockOnChatMessage = vi.fn();

    render(
      <BrowserRouter>
        <VideoFeed 
          appointmentId="appt-123" 
          userRole="doctor" 
          registerSendChat={(fn) => { mockRegisterChat = fn; }}
          onChatMessage={mockOnChatMessage}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockRegisterChat).not.toBeNull();
      expect(websocketInstance).not.toBeNull();
    });

    // Simulate sending a message
    mockRegisterChat("Hello World");

    // Expect it to be sent over WS
    await waitFor(() => {
      expect(websocketInstance.send).toHaveBeenCalledWith(expect.stringContaining("Hello World"));
    });

    // Expect it to trigger the local onChatMessage callback
    expect(mockOnChatMessage).toHaveBeenCalledWith(expect.objectContaining({
      text: "Hello World",
      sender: "me",
    }));
  });
});
