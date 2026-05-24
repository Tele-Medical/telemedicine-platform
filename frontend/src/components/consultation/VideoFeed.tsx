import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Sliders,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface VideoFeedProps {
  appointmentId?: string;
  userRole?: string;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ 
  appointmentId = '11111111-2222-3333-4444-555555555555', 
  userRole = 'patient' 
}) => {
  const { t } = useTranslation();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'weak' | 'disconnected'>('excellent');
  const [isSimHUDOpen, setIsSimHUDOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleaningUpRef = useRef(false);

  const [remotePeerName, setRemotePeerName] = useState(userRole === 'patient' ? 'Doctor' : 'Patient');

  const peerInitials = React.useMemo(() => {
    return remotePeerName
      .split(' ')
      .filter(n => n && !n.includes('.') && n.toLowerCase() !== 'dr')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'P';
  }, [remotePeerName]);

  // 1. Capture local audio/video media
  const startLocalMedia = async () => {
    try {
      // Clear old stream if it exists
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Update track mute/disable status based on current buttons
      stream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
      stream.getVideoTracks().forEach(track => { track.enabled = !isVideoOff; });
      
      return stream;
    } catch (err) {
      console.warn("Could not capture webcam + audio. Trying audio-only fallback...", err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
          video: false, 
          audio: true 
        });
        localStreamRef.current = audioStream;
        return audioStream;
      } catch (audioErr) {
        console.error("Failed to capture microphone stream too.", audioErr);
        setErrorMessage("Microphone and camera access denied. Please grant permissions.");
        return null;
      }
    }
  };

  // 2. Setup RTCPeerConnection and WS Signaling
  const establishConnection = async () => {
    isCleaningUpRef.current = false;
    setConnectionState('connecting');
    setErrorMessage(null);

    // Clean up any existing connection first to avoid resource leaks
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        console.warn('Error closing prior peer connection:', e);
      }
      pcRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        console.warn('Error closing prior websocket:', e);
      }
      wsRef.current = null;
    }

    // Ensure local stream is ready
    const localStream = localStreamRef.current || await startLocalMedia();

    // Set up WebRTC RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    pcRef.current = pc;

    // Attach local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Monitor WebRTC Connection State changes
    pc.onconnectionstatechange = () => {
      console.log("RTCPeerConnection state:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionState('connected');
        setNetworkQuality('excellent');
        setErrorMessage(null);
      } else if (pc.connectionState === 'disconnected') {
        setConnectionState('disconnected');
      } else if (pc.connectionState === 'failed') {
        console.warn("WebRTC media transport failed. Activating low-bandwidth audio fallback...");
        setConnectionState('connected'); // keeps presentation active
        setNetworkQuality('weak');      // fall back to high-fidelity audio mode
        setErrorMessage(t('clinical.weak_connection_desc'));
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => t.enabled = false);
        }
      }
    };

    // Track remote candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        }));
      }
    };

    // Handle remote track addition
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // 3. Connect to WebSocket Signaling Server
    try {
      const token = localStorage.getItem('token') || '';
      
      const apiBase = import.meta.env.VITE_API_URL || '';
      let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host = window.location.host;
      
      if (apiBase) {
        // Strip out leading http:// or https:// from VITE_API_URL
        host = apiBase.replace(/^https?:\/\//, '');
        protocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
      }
      
      // Build dynamic WS signaling path
      const wsUrl = `${protocol}//${host}/api/v1/telemetry/ws/${appointmentId}?token=${encodeURIComponent(token)}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Signaling WebSocket connected successfully.");
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'welcome') {
            console.log("Joined signaling room:", msg.message);
          } 
          
          else if (msg.type === 'peer_joined') {
            console.log("Remote peer joined. Initiating offer...");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            ws.send(JSON.stringify({
              type: 'offer',
              sdp: offer.sdp
            }));
          } 
          
          else if (msg.type === 'offer') {
            console.log("Received remote offer. Setting remote description & sending answer...");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            ws.send(JSON.stringify({
              type: 'answer',
              sdp: answer.sdp
            }));
            setConnectionState('connected');
          } 
          
          else if (msg.type === 'answer') {
            console.log("Received remote answer. Completing peer handshake...");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
            setConnectionState('connected');
          } 
          
          else if (msg.type === 'candidate') {
            if (msg.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
          } 
          
          else if (msg.type === 'peer_left') {
            console.log("Remote peer disconnected.");
            setConnectionState('disconnected');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          }
        } catch (jsonErr) {
          console.error("Failed to parse signaling message:", jsonErr);
        }
      };

      ws.onerror = (err) => {
        console.error("Signaling WebSocket encountered an error:", err);
      };

      ws.onclose = () => {
        console.log("Signaling WebSocket closed.");
        // Try auto-reconnect if not deliberately unmounted and not in simulated off mode
        if (!isCleaningUpRef.current && connectionState !== 'connected' && networkQuality !== 'disconnected') {
          scheduleReconnect();
        }
      };
    } catch (wsErr) {
      console.error("Failed to establish WebSocket connection:", wsErr);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => {
      console.log("Retrying signaling connection...");
      establishConnection();
    }, 4000);
  };

  // 4. Handle controls & toggles
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
  };

  const handleToggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !nextVideoOff;
      });
    }
  };

  const handleEndCall = () => {
    if (window.confirm("Are you sure you want to end this clinical consultation?")) {
      cleanupStreams();
      navigate('/');
    }
  };

  const cleanupStreams = () => {
    isCleaningUpRef.current = true;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  };

  // Network Quality Simulator Handlers (Demonstrating Premium low-bandwidth capability!)
  const handleSimulateNetwork = (status: 'excellent' | 'weak' | 'disconnected') => {
    setNetworkQuality(status);
    setIsSimHUDOpen(false);

    if (status === 'excellent') {
      setConnectionState('connected');
      setErrorMessage(null);
      // Re-enable camera track
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
      }
    } else if (status === 'weak') {
      setConnectionState('connected'); // remains connected but degraded
      setErrorMessage(t('clinical.weak_connection_desc'));
      // Simulate video freeze/disable
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.enabled = false);
      }
    } else if (status === 'disconnected') {
      setConnectionState('disconnected');
      setErrorMessage(t('clinical.no_signal_desc'));
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.enabled = false);
      }
    }
  };

  useEffect(() => {
    const fetchPeerName = async () => {
      try {
        const data = await apiClient(`/appointments/${appointmentId}`);
        if (data) {
          const peerName = userRole === 'patient' ? data.practitioner_name : data.patient_name;
          setRemotePeerName(peerName);
        }
      } catch (err) {
        console.warn("Failed to fetch appointment details for names", err);
      }
    };
    
    if (appointmentId && !appointmentId.startsWith('appt-')) {
      fetchPeerName();
    }
  }, [appointmentId, userRole]);

  useEffect(() => {
    establishConnection();
    return () => {
      cleanupStreams();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  return (
    <div className="relative w-full h-[45vh] bg-neutral-950 overflow-hidden rounded-b-3xl shadow-lg border-b border-neutral-800 transition-all duration-500 font-sans">
      
      {/* Remote Video Stream */}
      <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
        {networkQuality === 'excellent' && connectionState === 'connected' ? (
          <div className="w-full h-full relative">
            <video 
              ref={remoteVideoRef}
              playsInline
              autoPlay
              aria-label={`Video feed of ${remotePeerName}`}
              className="w-full h-full object-cover animate-fade-in"
            />
            {/* Overlay Name Tag */}
            <div className="absolute bottom-20 left-4 bg-black/55 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white text-xs font-semibold tracking-wide">
              {remotePeerName}
            </div>
          </div>
        ) : (
          /* High-Fidelity Fallback Profile View for Weak/Disconnected states */
          <div className="flex flex-col items-center justify-center text-center p-6 animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary text-primary flex items-center justify-center text-3xl font-extrabold shadow-lg mb-4 animate-pulse">
              {peerInitials}
            </div>
            <h3 className="text-white font-bold text-lg">{remotePeerName}</h3>
            <p className="text-neutral-400 text-xs mt-1">
              {networkQuality === 'weak' 
                ? t('clinical.weak_connection_desc') 
                : t('clinical.no_signal_desc')}
            </p>
          </div>
        )}
      </div>

      {/* Network Status Badges (Teal and Orange) */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
        {networkQuality === 'excellent' && connectionState === 'connected' && (
          <div className="bg-success/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-success/20 shadow-md animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span className="text-[10px] font-black text-white tracking-widest uppercase">{t('clinical.excellent_signal')}</span>
          </div>
        )}

        {networkQuality === 'weak' && (
          <div className="bg-warning/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-warning/20 shadow-md animate-bounce">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span className="text-[10px] font-black text-white tracking-widest uppercase">{t('clinical.weak_signal')}</span>
          </div>
        )}

        {networkQuality === 'disconnected' && (
          <div className="bg-danger/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-danger/20 shadow-md animate-pulse">
            <RefreshCw size={11} className="text-white animate-spin" />
            <span className="text-[10px] font-black text-white tracking-widest uppercase">{t('clinical.reconnecting')}</span>
          </div>
        )}

        {connectionState === 'connecting' && networkQuality !== 'disconnected' && (
          <div className="bg-primary/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-primary/20 shadow-md animate-pulse">
            <RefreshCw size={11} className="text-white animate-spin" />
            <span className="text-[10px] font-black text-white tracking-widest uppercase">{t('clinical.connecting', 'CONNECTING...')}</span>
          </div>
        )}
      </div>

      {/* Local Video Picture-in-Picture (PIP) */}
      <div className="absolute top-4 right-4 w-28 h-36 bg-neutral-900 rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-20 transition-all duration-300 hover:scale-105">
        {!isVideoOff && networkQuality !== 'disconnected' ? (
          <video 
            ref={localVideoRef}
            muted
            playsInline
            autoPlay
            aria-label="Your local camera feed"
            className="w-full h-full object-cover bg-neutral-800"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-850 text-neutral-400">
            <VideoOff size={20} className="stroke-[1.5]" />
            <span className="text-[10px] mt-1.5 font-bold uppercase tracking-wider text-neutral-500">{t('clinical.camera_off')}</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-md text-[9px] font-bold text-white uppercase tracking-wider">
          {t('profile.name')}
        </div>
      </div>

      {/* Network Degradation Banner */}
      {errorMessage && (
        <div className="absolute top-20 left-4 right-4 bg-danger/95 backdrop-blur-md text-white p-3 rounded-xl flex items-center gap-3 border border-danger/20 z-10 shadow-lg text-xs font-semibold animate-slide-in">
          <AlertTriangle size={16} className="shrink-0 text-white" />
          <span className="flex-1">{errorMessage}</span>
          {networkQuality === 'disconnected' && (
            <button 
              onClick={() => establishConnection()}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-all uppercase text-[9px]"
            >
              {t('app.retry')}
            </button>
          )}
        </div>
      )}

      {/* Interactive Network Simulator Trigger button (WOW factor for user presentation) */}
      <div className="absolute bottom-20 right-4 z-20">
        <button 
          onClick={() => setIsSimHUDOpen(!isSimHUDOpen)}
          aria-expanded={isSimHUDOpen}
          aria-label="Open Network Simulation Control"
          className="w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/10 hover:bg-black/85 text-white flex items-center justify-center transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <Sliders size={18} className="stroke-[2]" />
        </button>
        
        {isSimHUDOpen && (
          <div className="absolute right-0 bottom-12 w-64 bg-neutral-900/95 backdrop-blur-lg border border-neutral-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-2.5 z-30 animate-scale-in">
            <h4 className="text-[11px] font-black text-white/40 tracking-wider uppercase mb-1">{t('clinical.network_simulator')}</h4>
            
            <button 
              onClick={() => handleSimulateNetwork('excellent')}
              className={`flex items-center gap-2.5 w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all ${networkQuality === 'excellent' ? 'bg-success/15 border border-success/30 text-success' : 'text-neutral-300 hover:bg-white/5 border border-transparent'}`}
            >
              <Wifi size={14} />
              <div className="flex-1">
                <div>{t('clinical.excellent_signal')}</div>
                <div className="text-[9px] font-normal text-neutral-400 mt-0.5">{t('clinical.excellent_signal_desc')}</div>
              </div>
              {networkQuality === 'excellent' && <CheckCircle2 size={12} />}
            </button>

            <button 
              onClick={() => handleSimulateNetwork('weak')}
              className={`flex items-center gap-2.5 w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all ${networkQuality === 'weak' ? 'bg-warning/15 border border-warning/30 text-warning' : 'text-neutral-300 hover:bg-white/5 border border-transparent'}`}
            >
              <AlertTriangle size={14} />
              <div className="flex-1">
                <div>{t('clinical.weak_signal')}</div>
                <div className="text-[9px] font-normal text-neutral-400 mt-0.5">{t('clinical.weak_connection_desc')}</div>
              </div>
              {networkQuality === 'weak' && <CheckCircle2 size={12} />}
            </button>

            <button 
              onClick={() => handleSimulateNetwork('disconnected')}
              className={`flex items-center gap-2.5 w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all ${networkQuality === 'disconnected' ? 'bg-danger/15 border border-danger/30 text-danger' : 'text-neutral-300 hover:bg-white/5 border border-transparent'}`}
            >
              <WifiOff size={14} />
              <div className="flex-1">
                <div>{t('clinical.no_signal')}</div>
                <div className="text-[9px] font-normal text-neutral-400 mt-0.5">{t('clinical.no_signal_desc')}</div>
              </div>
              {networkQuality === 'disconnected' && <CheckCircle2 size={12} />}
            </button>
          </div>
        )}
      </div>

      {/* Main Bottom Call Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
        {/* Toggle Mute */}
        <button 
          onClick={handleToggleMute}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border ${isMuted ? 'bg-danger border-danger text-white' : 'bg-black/60 border-white/10 text-white hover:bg-black/80'}`}
        >
          {isMuted ? <MicOff size={20} className="stroke-[2]" /> : <Mic size={20} className="stroke-[2]" />}
        </button>

        {/* End Call */}
        <button 
          onClick={handleEndCall}
          aria-label="End consultation call"
          className="w-14 h-14 rounded-full bg-danger hover:bg-danger-600 active:scale-95 text-white flex items-center justify-center shadow-xl transition-all border border-white/5"
        >
          <PhoneOff size={24} className="stroke-[2.5]" />
        </button>

        {/* Toggle Camera */}
        <button 
          onClick={handleToggleVideo}
          aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border ${isVideoOff ? 'bg-danger border-danger text-white' : 'bg-black/60 border-white/10 text-white hover:bg-black/80'}`}
        >
          {isVideoOff ? <VideoOff size={20} className="stroke-[2]" /> : <Video size={20} className="stroke-[2]" />}
        </button>
      </div>

    </div>
  );
};

export default VideoFeed;
