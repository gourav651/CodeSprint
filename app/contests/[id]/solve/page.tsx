'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase/client';
import { Clock, Video, VideoOff, Mic, MicOff, Maximize, AlertCircle, LogOut } from 'lucide-react';
import { ProblemSolver } from '@/components/problem-solver/ProblemSolver';

const EMPTY_SUBMISSIONS: any[] = [];

export default function ContestSolvePage() {
  const params = useParams();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  
  const [contest, setContest] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [isEnded, setIsEnded] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // WebRTC State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // 1. Fetch Contest Data
    fetch(`/api/contests/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setContest(data.contest);
        setProblems(data.problems);
        setLoading(false);
      });
  }, [params.id]);

  // Timer logic
  useEffect(() => {
    if (!contest) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(contest.end_time).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        setIsEnded(true);
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  // WebRTC Setup
  useEffect(() => {
    if (!isLoaded || !userId || !contest || isEnded) return;

    const initWebRTC = async () => {
      try {
        // Request Camera & Mic
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Connect to Supabase Realtime for Signaling
        const channel = supabase.channel(`contest-${params.id}`);
        channelRef.current = channel;

        channel
          .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
            const { type, from, data } = payload;
            if (from === userId) return;

            let pc = peerConnections.current[from];
            
            // Create PC if it doesn't exist
            if (!pc && (type === 'offer' || type === 'join')) {
              pc = new RTCPeerConnection({
                iceServers: [
                  { urls: "stun:stun.relay.metered.ca:80" },
                  { urls: 'stun:stun.l.google.com:19302' },
                  {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "007698b76a95a55d77a12575",
                    credential: "cW393KVrjuYmicPq",
                  },
                  {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "007698b76a95a55d77a12575",
                    credential: "cW393KVrjuYmicPq",
                  },
                  {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "007698b76a95a55d77a12575",
                    credential: "cW393KVrjuYmicPq",
                  },
                  {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "007698b76a95a55d77a12575",
                    credential: "cW393KVrjuYmicPq",
                  },
                ],
              });
              peerConnections.current[from] = pc;

              // Add local tracks to PC
              stream.getTracks().forEach(track => pc.addTrack(track, stream));

              // Handle remote tracks
              pc.ontrack = (event) => {
                setRemoteStreams(prev => ({ ...prev, [from]: event.streams[0] }));
              };

              // Handle ICE candidates
              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  channel.send({
                    type: 'broadcast',
                    event: 'webrtc-signal',
                    payload: { type: 'candidate', from: userId, target: from, data: event.candidate }
                  });
                }
              };
            }

            // Handle signaling messages
            if (type === 'join') {
              // Create Offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: 'broadcast',
                event: 'webrtc-signal',
                payload: { type: 'offer', from: userId, target: from, data: offer }
              });
            } else if (type === 'offer' && payload.target === userId) {
              await pc.setRemoteDescription(new RTCSessionDescription(data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: 'broadcast',
                event: 'webrtc-signal',
                payload: { type: 'answer', from: userId, target: from, data: answer }
              });
            } else if (type === 'answer' && payload.target === userId) {
              await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (type === 'candidate' && payload.target === userId) {
              await pc.addIceCandidate(new RTCIceCandidate(data));
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Announce presence
              channel.send({
                type: 'broadcast',
                event: 'webrtc-signal',
                payload: { type: 'join', from: userId }
              });
            }
          });
      } catch (err) {
        console.error("Failed to access camera:", err);
      }
    };

    initWebRTC();

    return () => {
      // Cleanup
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isLoaded, userId, contest?.id, isEnded]);

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !videoEnabled);
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !audioEnabled);
      setAudioEnabled(!audioEnabled);
    }
  };

  // Handle exit contest
  const handleExitContest = () => {
    // Cleanup WebRTC before leaving
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    Object.values(peerConnections.current).forEach(pc => pc.close());
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    router.push(`/contests/${params.id}`);
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading contest environment...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      
      {/* Top Navbar */}
      <div className="h-14 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-6 shrink-0">
        <div className="font-bold text-lg flex items-center gap-3">
          <span className="text-purple-500">Live Contest</span>
          <span className="text-gray-400 text-sm">| {contest?.title}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xl font-bold">
            <Clock className={`w-5 h-5 ${timeLeft.startsWith('00:0') ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            <span className={timeLeft.startsWith('00:0') ? 'text-red-500' : 'text-white'}>{timeLeft}</span>
          </div>
          {isEnded ? (
            <button onClick={() => router.push(`/contests/${params.id}`)} className="bg-white text-black px-4 py-1.5 rounded-md font-bold text-sm hover:bg-gray-200 transition">
              Exit to Lobby
            </button>
          ) : (
            <button 
              onClick={() => setShowExitConfirm(true)} 
              className="flex items-center gap-2 bg-red-600/20 border border-red-500/50 text-red-400 px-4 py-1.5 rounded-md font-medium text-sm hover:bg-red-600/30 hover:text-red-300 transition"
            >
              <LogOut className="w-4 h-4" />
              Exit Contest
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Side - Coding Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800 relative">
          {/* Problem Tabs */}
          <div className="flex bg-gray-950 border-b border-gray-800 overflow-x-auto">
            {problems.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActiveTab(idx)}
                className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === idx ? 'border-purple-500 text-white bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
                }`}
              >
                Problem {idx + 1}
              </button>
            ))}
          </div>

          {/* Coding Environment */}
          <div className="flex-1 overflow-hidden relative">
            {isEnded && (
              <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                <h2 className="text-4xl font-bold text-white mb-4">Contest Ended!</h2>
                <p className="text-gray-400 mb-6">Head back to the lobby to see the final leaderboard.</p>
                <button onClick={() => router.push(`/contests/${params.id}`)} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition">
                  View Results
                </button>
              </div>
            )}
            
            {problems.length > 0 && (
              <div className="h-full w-full">
                {/* We use key to force re-render of ProblemSolver when tab changes so state is fresh */}
                <ProblemSolver 
                  key={problems[activeTab].id} 
                  problem={problems[activeTab]}
                  userSubmissions={EMPTY_SUBMISSIONS}
                  user={{ id: userId ?? null }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side - WebRTC Cameras (300px width) */}
        <div className="w-80 bg-gray-950 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Participants</span>
            <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{Object.keys(remoteStreams).length + 1} Online</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Local Video */}
            <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-950">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!videoEnabled && 'hidden'}`}
              />
              {!videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-300">YOU</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-semibold backdrop-blur-md">
                You
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1">
                <button onClick={toggleAudio} className={`p-1.5 rounded-md backdrop-blur-md ${audioEnabled ? 'bg-black/60 text-white' : 'bg-red-500 text-white'}`}>
                  {audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={toggleVideo} className={`p-1.5 rounded-md backdrop-blur-md ${videoEnabled ? 'bg-black/60 text-white' : 'bg-red-500 text-white'}`}>
                  {videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remote Videos */}
            {Object.entries(remoteStreams).map(([peerId, stream]) => (
              <div key={peerId} className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
                <VideoPlayer stream={stream} />
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-semibold backdrop-blur-md">
                  Peer {peerId.substring(0, 4)}
                </div>
              </div>
            ))}
            
            {Object.keys(remoteStreams).length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                Waiting for others to join...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Exit Contest?</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Are you sure you want to leave this contest? You will not be able to rejoin, and your submissions will be final.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-gray-800 text-gray-300 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition"
              >
                Continue Contest
              </button>
              <button
                onClick={handleExitContest}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-700 transition"
              >
                Exit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component to attach MediaStream to video tag
function VideoPlayer({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
}
