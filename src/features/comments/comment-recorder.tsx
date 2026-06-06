"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Mic, MonitorUp, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RecordMode = "audio" | "screen";

type CommentRecorderProps = {
  onRecorded: (file: File) => void;
  disabled?: boolean;
};

const formatClock = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Capture a voice note (`getUserMedia`) or screen recording (`getDisplayMedia`) via
 * `MediaRecorder`, producing a `File` the composer attaches like any upload. Fails
 * gracefully with a toast when capture is unavailable or denied.
 */
export const CommentRecorder = ({ onRecorded, disabled }: CommentRecorderProps) => {
  const [mode, setMode] = useState<RecordMode | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      cleanupStream();
    },
    [],
  );

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setMode(null);
  };

  const begin = async (kind: RecordMode) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      toast.error("Recording is not supported in this browser");
      return;
    }
    try {
      const stream =
        kind === "audio"
          ? await navigator.mediaDevices.getUserMedia({ audio: true })
          : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const type = kind === "audio" ? "audio/webm" : "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const label = kind === "audio" ? "voice-note" : "screen-recording";
        onRecorded(new File([blob], `${label}-${Date.now()}.webm`, { type }));
        cleanupStream();
      };
      recorder.start();
      recorderRef.current = recorder;
      setMode(kind);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
      // Stop when the user ends screen sharing from the browser's own control.
      stream.getVideoTracks()[0]?.addEventListener("ended", stop);
    } catch {
      cleanupStream();
      toast.error("Could not start recording");
    }
  };

  if (mode) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-rose-600 dark:text-rose-400"
        onClick={stop}
      >
        <span className="relative flex size-3 items-center justify-center">
          <Circle className="size-3 animate-pulse fill-current" />
        </span>
        <Square className="size-3.5" />
        <span className="tabular-nums">{formatClock(seconds)}</span>
        <span className="hidden sm:inline">Stop</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label="Record"
            className="text-muted-foreground"
          />
        }
      >
        <Mic />
        <span className="hidden sm:inline">Record</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuItem onClick={() => void begin("audio")}>
          <Mic />
          Record voice note
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void begin("screen")}>
          <MonitorUp />
          Record screen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
