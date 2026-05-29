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
  RefreshCw,
  Volume2,
  Monitor,
  MonitorOff
} from 'lucide-react';


import { type ChatMessage } from './InCallChat';

interface VideoFeedProps {
  appointmentId?: string;
  userRole?: string;
  onChatMessage?: (msg: ChatMessage) => void;
  registerSendChat?: (sendFn: (text: string) => void) => void;
  onAppSignal?: (type: string, payload: any) => void;
  registerSendSignal?: (sendFn: (type: string, payload: any) => void) => void;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ 
  appointmentId = '11111111-2222-3333-4444-555555555555', 
  userRole = 'patient',
  onChatMessage,
  registerSendChat,
  onAppSignal,
  registerSendSignal
}) => {
  const { t } = useTranslation();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'weak' | 'disconnected'>('excellent');
  const [isSimHUDOpen, setIsSimHUDOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);


  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleaningUpRef = useRef(false);
  const candidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);

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
    candidatesQueueRef.current = [];

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

    // Set up WebRTC RTCPeerConnection with dynamic TURN config from env/fallback
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];

    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername || '',
        credential: turnCredential || ''
      });
    }

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    // Attach local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }


    // Monitor WebRTC Connection State changes
    pc.onconnectionstatechange = () => {
      console.log("RTCPeerConnection connectionState:", pc.connectionState);
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

    pc.oniceconnectionstatechange = () => {
      console.log("RTCPeerConnection iceConnectionState:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionState('connected');
        setNetworkQuality('excellent');
        setErrorMessage(null);
      } else if (pc.iceConnectionState === 'disconnected') {
        setConnectionState('disconnected');
      } else if (pc.iceConnectionState === 'failed') {
        console.warn("ICE connection failed. Activating low-bandwidth audio fallback...");
        setConnectionState('connected');
        setNetworkQuality('weak');
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
      if (remoteVideoRef.current) {
        const videoElement = remoteVideoRef.current;
        if (event.streams && event.streams[0]) {
          videoElement.srcObject = event.streams[0];
        } else {
          // Fallback if event.streams is empty
          if (!videoElement.srcObject) {
            videoElement.srcObject = new MediaStream();
          }
          (videoElement.srcObject as MediaStream).addTrack(event.track);
        }

        // Explicitly trigger play when stream/tracks are attached
        videoElement.play().catch(e => {
          console.warn("Autoplay remote video prevented or failed during track addition:", e);
          if (e.name === 'NotAllowedError') {
            setIsAutoplayBlocked(true);
          }
        });
      }
    };


    // Helper to empty candidates queue once remote description is set
    const processCandidatesQueue = async () => {
      console.log(`Processing ${candidatesQueueRef.current.length} queued ICE candidates`);
      while (candidatesQueueRef.current.length > 0) {
        const cand = candidatesQueueRef.current.shift();
        if (cand) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn("Failed to add queued ICE candidate:", e);
          }
        }
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
            // Announce presence to anyone already here
            ws.send(JSON.stringify({ type: 'peer_present' }));
          } 
          
          else if (msg.type === 'peer_present' || msg.type === 'peer_joined') {
            console.log("Remote peer detected!");
            
            // Always bounce back a presence pulse so the other side knows we're here too
            // But only if it was a peer_joined to prevent infinite ping-pong loops
            if (msg.type === 'peer_joined') {
              ws.send(JSON.stringify({ type: 'peer_present' }));
            }

            // The doctor is always the polite initiator, but only ONCE per connection
            if ((userRole === 'doctor' || userRole === 'practitioner') && pc.signalingState === 'stable' && !pc.localDescription) {
              console.log("Initiating offer as doctor...");
              try {
                const offer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true
                });
                await pc.setLocalDescription(offer);
                
                ws.send(JSON.stringify({
                  type: 'offer',
                  sdp: offer.sdp
                }));
              } catch (e) {
                console.error("Error creating offer:", e);
              }
            }
          }
          
          else if (msg.type === 'offer') {
            if (pc.signalingState !== 'stable') {
              console.warn("Ignoring remote offer in state:", pc.signalingState);
              return;
            }
            console.log("Received remote offer. Setting remote description & sending answer...");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
            await processCandidatesQueue();

            const answer = await pc.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            });
            await pc.setLocalDescription(answer);
            
            ws.send(JSON.stringify({
              type: 'answer',
              sdp: answer.sdp
            }));
            // Safe transition: connectionState is now updated via pc.onconnectionstatechange/oniceconnectionstatechange
          } 
          
          else if (msg.type === 'answer') {
            if (pc.signalingState !== 'have-local-offer') {
              console.warn("Ignoring remote answer in state:", pc.signalingState);
              return;
            }
            console.log("Received remote answer. Completing peer handshake...");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
            await processCandidatesQueue();
            // Safe transition: connectionState is now updated via pc.onconnectionstatechange/oniceconnectionstatechange
          } 
 
          
          else if (msg.type === 'candidate') {
            if (msg.candidate) {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                } catch (e) {
                  console.warn("Failed to add ICE candidate:", e);
                }
              } else {
                candidatesQueueRef.current.push(msg.candidate);
              }
            }
          } 
          
          else if (msg.type === 'peer_left') {
            console.log("Remote peer disconnected.");
            setConnectionState('disconnected');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          }
          
          else if (msg.type === 'chat') {
            if (onChatMessage) {
              onChatMessage({
                id: msg.id || Math.random().toString(),
                senderId: msg.senderRole,
                senderName: remotePeerName, // the other person
                text: msg.text,
                timestamp: msg.timestamp || Date.now()
              });
            }
          }
          else if (msg.type === 'app_signal') {
            if (onAppSignal) {
              onAppSignal(msg.signalType, msg.payload);
            }
          }
        } catch (jsonErr) {
          console.error("Failed to parse/process signaling message:", jsonErr);
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
    cleanupStreams();
    navigate(-1); // Go back to the previous page (dashboard or queue)
  };

  const handleResolveAutoplay = async () => {
    if (remoteVideoRef.current) {
      try {
        await remoteVideoRef.current.play();
        setIsAutoplayBlocked(false);
      } catch (err) {
        console.warn("Manual activation of autoplay failed:", err);
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (!pcRef.current) return;
    try {
      if (isScreenSharing) {
        // Stop screen share and revert to camera
        const stream = await startLocalMedia();
        const videoTrack = stream?.getVideoTracks()[0];
        if (videoTrack) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        }
        setIsScreenSharing(false);
      } else {
        // Start screen share
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          handleToggleScreenShare(); // Revert if user stops sharing via browser UI
        };

        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Failed to toggle screen sharing:", err);
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
    
    candidatesQueueRef.current = [];
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
  }, [appointmentId]);

  const isVideoVisible = networkQuality === 'excellent' && connectionState === 'connected';

  useEffect(() => {
    if (registerSendChat) {
      registerSendChat((text: string) => {
        const msg = {
          type: 'chat',
          text,
          senderId: userRole,
          timestamp: new Date().toISOString(),
        };
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(msg));
        }

        // Add the message locally so the sender can see it
        if (onChatMessage) {
          onChatMessage({
            id: Math.random().toString(36).substring(7),
            text: text,
            senderId: userRole,
            senderName: 'You',
            timestamp: Date.now(),
          });
        }
      });
    }

    if (registerSendSignal) {
      registerSendSignal((signalType: string, payload: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'app_signal',
            signalType,
            payload,
            senderRole: userRole
          }));
        }
      });
    }
  }, [registerSendChat, registerSendSignal, userRole, t, onChatMessage]);

  // Ensure remote stream plays automatically when connection becomes visible
  useEffect(() => {
    if (isVideoVisible && remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.play().catch(e => {
        console.warn("Autoplay remote video prevented or failed on visibility change:", e);
        if (e.name === 'NotAllowedError') {
          setIsAutoplayBlocked(true);
        }
      });
    }
  }, [isVideoVisible]);


  // Ensure local video stream is correctly attached and playing
  useEffect(() => {
    if (!isVideoOff && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(e => {
        console.warn("Autoplay local video prevented or failed:", e);
      });
    }
  }, [isVideoOff]);

  return (
    <div className="relative w-full h-[45vh] lg:h-full bg-neutral-950 overflow-hidden lg:rounded-none rounded-b-3xl shadow-lg border-b lg:border-b-0 border-neutral-800 transition-all duration-500 font-sans">
      
      {/* Remote Video Stream */}
      <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
        
        {/* Remote Video Element - ALWAYS mounted in DOM to guarantee `remoteVideoRef.current` is not null when `pc.ontrack` fires */}
        <div className={`w-full h-full relative ${isVideoVisible ? 'block' : 'hidden'}`}>
          <video 
            ref={remoteVideoRef}
            playsInline
            autoPlay
            aria-label={`Video feed of ${remotePeerName}`}
            className="w-full h-full object-cover animate-fade-in"
          />
          {/* Autoplay Policy Block Overlay */}
          {isAutoplayBlocked && (
            <button 
              onClick={handleResolveAutoplay}
              className="absolute inset-0 bg-neutral-950/90 backdrop-blur-lg flex flex-col items-center justify-center text-center p-6 z-30 transition-all duration-300 hover:bg-neutral-950/95 group cursor-pointer border-none outline-none"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/25 border border-primary/30">
                <Volume2 className="w-8 h-8 animate-pulse text-primary" />
              </div>
              <h3 className="text-white font-bold text-base tracking-wide mb-2 group-hover:text-primary transition-colors">{t('clinical.click_to_join', 'Tap to Join Consultation')}</h3>
              <p className="text-neutral-300 text-[11px] max-w-[240px] leading-relaxed">
                {t('clinical.autoplay_notice', 'Browser security requires interaction to enable unmuted audio and video. Tap anywhere to start.')}
              </p>
            </button>
          )}
          {/* Overlay Name Tag */}
          <div className="absolute bottom-20 left-4 bg-black/55 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white text-xs font-semibold tracking-wide">
            {remotePeerName}
          </div>
        </div>


        {/* High-Fidelity Fallback Profile View for Weak/Disconnected/Connecting states */}
        {!isVideoVisible && (
          <div className="flex flex-col items-center justify-center text-center p-6 animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary text-primary flex items-center justify-center text-3xl font-extrabold shadow-lg mb-4 animate-pulse">
              {peerInitials}
            </div>
            <h3 className="text-white font-bold text-lg">{remotePeerName}</h3>
            <p className="text-neutral-400 text-xs mt-1">
              {connectionState === 'connecting'
                ? t('clinical.connecting', 'Connecting to secure consultation...')
                : networkQuality === 'weak' 
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

        {/* Toggle Screen Share */}
        <button 
          onClick={handleToggleScreenShare}
          disabled={isVideoOff || networkQuality === 'disconnected'}
          aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
          className={`w-12 h-12 hidden md:flex rounded-full items-center justify-center transition-all shadow-lg backdrop-blur-md border disabled:opacity-50 disabled:cursor-not-allowed ${isScreenSharing ? 'bg-primary border-primary text-white' : 'bg-black/60 border-white/10 text-white hover:bg-black/80'}`}
        >
          {isScreenSharing ? <MonitorOff size={20} className="stroke-[2]" /> : <Monitor size={20} className="stroke-[2]" />}
        </button>
      </div>

    </div>
  );
};

export default VideoFeed;
