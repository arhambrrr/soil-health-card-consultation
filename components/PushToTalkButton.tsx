"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Translations } from "@/lib/i18n";

type BtnState = "idle" | "recording";

interface Props {
  onAudio: (blob: Blob) => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
  t?: Translations;
}

export default function PushToTalkButton({ onAudio, onError, disabled, t }: Props) {
  const [btnState, setBtnState] = useState<BtnState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const mimeTypeRef      = useRef<string>("");

  // Acquire mic once on mount — stream stays alive so every press starts instantly
  useEffect(() => {
    mimeTypeRef.current = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => { streamRef.current = stream; })
      .catch(() => { /* permission denied — handled in startRecording */ });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (btnState !== "idle" || disabled) return;

    // Re-acquire if stream was revoked
    if (!streamRef.current || streamRef.current.getTracks().every((t) => t.readyState === "ended")) {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        alert("Microphone access denied. Please allow microphone access and try again.");
        return;
      }
    }

    try {
      const mimeType = mimeTypeRef.current;
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setBtnState("recording");
    } catch {
      alert("Could not start recording. Please try again.");
    }
  }, [btnState, disabled]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || btnState !== "recording") return;

    recorder.stop();
    setBtnState("idle");
    // Stream stays alive — do NOT stop tracks here

    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    const blob = new Blob(chunksRef.current, {
      type: mediaRecorderRef.current?.mimeType || "audio/webm",
    });

    if (blob.size < 500) {
      onError?.(t ? t.releaseToSendShort : "Recording too short — hold the button longer while speaking.");
      return;
    }

    onAudio(blob);
  }, [btnState, onAudio, onError, t]);

  const label = btnState === "recording"
    ? (t?.releaseToSendShort ?? "Release to Send")
    : (t?.holdToSpeak ?? "Hold to Speak");

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
      onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
      disabled={disabled}
      className={`
        relative select-none w-48 h-16 rounded-full font-semibold text-sm transition-all duration-150
        flex items-center justify-center gap-2.5
        ${btnState === "recording"
          ? "bg-neutral-900 text-white scale-105 border-2 border-neutral-900"
          : disabled
          ? "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"
          : "bg-white text-neutral-900 border-2 border-neutral-900 hover:bg-neutral-900 hover:text-white active:scale-95"
        }
      `}
    >
      {btnState === "recording" && (
        <span className="absolute inset-0 rounded-full border-2 border-neutral-900 animate-ping opacity-30" />
      )}
      <MicIcon recording={btnState === "recording"} />
      <span>{label}</span>
    </button>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {recording ? (
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
      ) : (
        <>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
