"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { progressApi } from "@/lib/api/progress";
import type { ProgressHeartbeatResponse } from "@/lib/types";

const HEARTBEAT_INTERVAL_MS = 5000;

export function VideoPlayer({
  lessonId,
  startPosition,
  maxWatchedPosition,
  onProgress,
}: {
  lessonId: string;
  startPosition: number;
  maxWatchedPosition: number;
  onProgress: (result: ProgressHeartbeatResponse) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maxWatchedRef = useRef(maxWatchedPosition);
  const lastSentRef = useRef(0);
  const lastTimeRef = useRef(startPosition);

  useEffect(() => {
    let cancelled = false;
    progressApi
      .getVideoUrl(lessonId)
      .then((res) => {
        if (!cancelled) setVideoUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this video. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    maxWatchedRef.current = maxWatchedPosition;
  }, [maxWatchedPosition]);

  const sendHeartbeat = async (position: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    try {
      const result = await progressApi.sendHeartbeat(lessonId, position, video.duration);
      maxWatchedRef.current = result.max_watched_position;
      onProgress(result);
    } catch {
      // Heartbeat failures are silent -- the server remains authoritative and
      // will simply reconcile on the next successful heartbeat.
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && startPosition > 0) {
      video.currentTime = startPosition;
    }
    lastTimeRef.current = startPosition;
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Client-side guardrail: only a real jump (a seek/drag) counts as a skip.
    // Ordinary playback advances a couple of seconds between ticks -- that's
    // not a skip, so let it continue and track it as newly watched. This is a
    // UX convenience only -- the server clamps and validates independently.
    const delta = video.currentTime - lastTimeRef.current;
    if (delta > 2 && video.currentTime > maxWatchedRef.current + 2) {
      video.currentTime = maxWatchedRef.current;
      toast.info("You can't skip ahead of content you haven't watched yet.");
    } else {
      maxWatchedRef.current = Math.max(maxWatchedRef.current, video.currentTime);
    }
    lastTimeRef.current = video.currentTime;

    const now = Date.now();
    if (now - lastSentRef.current > HEARTBEAT_INTERVAL_MS) {
      lastSentRef.current = now;
      sendHeartbeat(video.currentTime);
    }
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (video) sendHeartbeat(video.currentTime);
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (video) sendHeartbeat(video.duration);
  };

  if (error) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!videoUrl) {
    return <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />;
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={videoRef}
      key={lessonId}
      src={videoUrl}
      controls
      controlsList="nodownload"
      className="aspect-video w-full rounded-lg bg-black"
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onPause={handlePause}
      onEnded={handleEnded}
      onSeeked={() => {
        const video = videoRef.current;
        if (video && video.currentTime > maxWatchedRef.current + 2) {
          video.currentTime = maxWatchedRef.current;
        }
      }}
    />
  );
}
