"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, PhoneCall, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type CallType = "voice" | "video";
export type CallState = "outgoing" | "incoming" | "active";

interface CallModalProps {
  callType: CallType;
  callState: CallState;
  remoteUser: {
    display_name: string;
    username: string;
    avatar_url?: string | null;
  };
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
}

export function CallModal({
  callType,
  callState,
  remoteUser,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEndCall,
}: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Attach Local Stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff]);

  // Attach Remote Stream
  useEffect(() => {
    if (remoteStream) {
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (callType === "voice" && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  // Active Call Timer
  useEffect(() => {
    if (callState !== "active") {
      setCallDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callState]);

  // Synthesize Ringtone for outgoing/incoming calls
  useEffect(() => {
    if (callState === "active") return;

    let audioCtx: AudioContext | null = null;
    let intervalId: any = null;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(callState === "outgoing" ? 440 : 523.25, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      };

      playBeep();
      intervalId = setInterval(playBeep, 2000);
    } catch {
      // AudioContext unavailable
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [callState]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === "video") {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const initials = remoteUser.display_name
    ? remoteUser.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "S";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
      {/* Hidden Audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl flex flex-col items-center text-center p-8 space-y-6">
        {/* Remote Video Surface */}
        {callType === "video" && callState === "active" && (
          <div className="absolute inset-0 z-0 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local Picture-in-Picture Preview */}
            <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 bg-zinc-900 shadow-2xl z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraOff ? "hidden" : "block"}`}
              />
              {isCameraOff && (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                  <VideoOff className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header Avatar & Info Overlay */}
        <div className="relative z-10 space-y-4 flex flex-col items-center">
          <Avatar className="h-24 w-24 border-2 border-white/20 shadow-2xl ring-4 ring-white/5">
            <AvatarImage src={remoteUser.avatar_url || undefined} />
            <AvatarFallback className="bg-zinc-800 text-white font-bold text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">
              {remoteUser.display_name}
            </h3>
            <p className="text-xs text-[#8A8A8A] font-mono">@{remoteUser.username}</p>
          </div>

          {/* Status badge & Call timer */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-mono text-white">
            {callState === "outgoing" && (
              <span className="flex items-center gap-1.5 animate-pulse">
                <Volume2 className="h-3.5 w-3.5" />
                Calling...
              </span>
            )}
            {callState === "incoming" && (
              <span className="flex items-center gap-1.5 animate-pulse text-amber-300">
                <PhoneCall className="h-3.5 w-3.5" />
                Incoming {callType} call...
              </span>
            )}
            {callState === "active" && (
              <span className="text-emerald-400 font-semibold tracking-wider">
                {formatTimer(callDuration)}
              </span>
            )}
          </div>
        </div>

        {/* Interactive Controls Overlay */}
        <div className="relative z-10 flex items-center gap-4 pt-6">
          {callState === "incoming" ? (
            <>
              <Button
                size="lg"
                onClick={onAccept}
                className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl flex items-center justify-center"
              >
                <PhoneCall className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                onClick={onReject}
                className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl flex items-center justify-center"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </>
          ) : (
            <>
              {/* Mute Microphone */}
              <Button
                size="lg"
                variant="outline"
                onClick={toggleMute}
                className={`h-12 w-12 rounded-full border-white/20 text-white ${
                  isMuted ? "bg-rose-500/20 text-rose-400 border-rose-500/40" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {/* Camera Toggle (Video Call Only) */}
              {callType === "video" && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={toggleCamera}
                  className={`h-12 w-12 rounded-full border-white/20 text-white ${
                    isCameraOff ? "bg-rose-500/20 text-rose-400 border-rose-500/40" : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}

              {/* End Call Button */}
              <Button
                size="lg"
                onClick={onEndCall}
                className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl flex items-center justify-center"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
