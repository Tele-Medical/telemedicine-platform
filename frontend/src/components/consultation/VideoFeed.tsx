import React, { useState } from 'react';

interface VideoFeedProps {
  practitionerName?: string;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ practitionerName = 'Practitioner' }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  return (
    <div className="relative w-full h-[40vh] bg-surface-dim overflow-hidden rounded-b-3xl shadow-md border-b border-black/10">
      {/* Remote Video (Doctor placeholder) */}
      <div className="absolute inset-0 bg-secondary/10 flex flex-col items-center justify-center">
        {!isVideoOff ? (
          <div className="text-secondary/50 text-center">
            <svg className="w-16 h-16 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z"/><rect x="3" y="6" width="12" height="12" rx="2" ry="2"/></svg>
            <p className="font-medium text-lg">{practitionerName}</p>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-2xl font-bold">
            {practitionerName.charAt(0)}
          </div>
        )}
      </div>

      {/* Network Status Badge */}
      <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-warning-offline animate-pulse"></div>
        <span className="text-xs font-semibold text-white tracking-wide">WEAK NETWORK</span>
      </div>

      {/* Local Video (Patient PIP) */}
      <div className="absolute top-4 right-4 w-24 h-32 bg-primary/20 rounded-xl border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
        <div className="text-primary/60 text-xs text-center font-medium">You</div>
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-md ${isMuted ? 'bg-white text-error' : 'bg-black/40 text-white hover:bg-black/60'}`}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path><path d="M5 10v2a7 7 0 0 0 12 5"></path><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path><path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path><line x1="12" y1="19" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          )}
        </button>

        <button 
          aria-label="End consultation call"
          className="w-14 h-14 rounded-full bg-error text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>
        </button>

        <button 
          onClick={() => setIsVideoOff(!isVideoOff)}
          aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-md ${isVideoOff ? 'bg-white text-error' : 'bg-black/40 text-white hover:bg-black/60'}`}
        >
          {isVideoOff ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" x2="23" y1="1" y2="23"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default VideoFeed;
