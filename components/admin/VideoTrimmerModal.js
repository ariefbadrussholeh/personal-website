"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CircleNotch, Play, Pause, Scissors, UploadSimple, X, ArrowClockwise } from "@phosphor-icons/react";

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00.0";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
}

/**
 * Interactive client-side video trimmer modal.
 * Uses HTMLVideoElement + MediaRecorder to record and slice exact ranges in-browser.
 */
export default function VideoTrimmerModal({ open, file, onClose, onComplete }) {
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const previewTimer = useRef(null);

  // Load video file object URL
  useEffect(() => {
    if (!open || !file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
      setDuration(0);
      setStart(0);
      setEnd(0);
      setPlaying(false);
      setProcessing(false);
      setProgress(0);
      setError("");
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setError("");

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, file]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration || 0;
    setDuration(dur);
    setStart(0);
    // default end to either 15 seconds or full duration
    setEnd(Math.min(dur, Math.max(1, dur)));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < start || v.currentTime >= end) {
        v.currentTime = start;
      }
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);

    // Loop within [start, end] during manual playback
    if (!processing && playing && v.currentTime >= end) {
      v.pause();
      v.currentTime = start;
      setPlaying(false);
    }
  };

  const playPreviewRange = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;
    v.play();
    setPlaying(true);
  };

  // Perform client-side trim
  const executeTrim = async () => {
    const v = videoRef.current;
    if (!v || !file) return;

    if (end <= start) {
      setError("Waktu selesai harus lebih besar dari waktu mulai.");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError("");

    try {
      // Seek to start
      v.pause();
      setPlaying(false);
      v.currentTime = start;
      await new Promise((r) => {
        v.onseeked = () => {
          v.onseeked = null;
          r();
        };
      });

      const stream = v.captureStream ? v.captureStream() : v.mozCaptureStream?.();
      if (!stream) {
        throw new Error("Browser Anda belum mendukung pemotongan video langsung di browser.");
      }

      // Check supported MIME type
      let mimeType = "video/webm;codecs=vp9,opus";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/mp4";
          }
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const trimDuration = end - start;

      const finishRecording = async () => {
        v.ontimeupdate = null;
        v.pause();
        if (recorder.state === "recording") {
          recorder.stop();
        }
      };

      v.ontimeupdate = () => {
        const elapsed = v.currentTime - start;
        const pct = Math.min(100, Math.max(0, Math.round((elapsed / trimDuration) * 100)));
        setProgress(pct);
        if (v.currentTime >= end) {
          finishRecording();
        }
      };

      const resultPromise = new Promise((resolve, reject) => {
        recorder.onstop = () => {
          try {
            const ext = recorder.mimeType?.includes("mp4") ? "mp4" : "webm";
            const actualType = recorder.mimeType || "video/webm";
            const blob = new Blob(chunks, { type: actualType });
            const cleanBase = file.name.replace(/\.[^/.]+$/, "");
            const trimmedFile = new File([blob], `${cleanBase}-trimmed.${ext}`, { type: actualType });
            resolve({
              file: trimmedFile,
              width: v.videoWidth || 0,
              height: v.videoHeight || 0,
            });
          } catch (e) {
            reject(e);
          }
        };
        recorder.onerror = (e) => reject(e.error || new Error("Gagal merekam video"));
      });

      recorder.start();
      await v.play();

      const { file: trimmedFile, width, height } = await resultPromise;
      setProcessing(false);
      onComplete(trimmedFile, { width, height });
    } catch (err) {
      setProcessing(false);
      setError(err.message || "Gagal memotong video.");
      v.ontimeupdate = handleTimeUpdate;
    }
  };

  const uploadOriginalWithoutTrim = () => {
    const v = videoRef.current;
    onComplete(file, {
      width: v?.videoWidth || 0,
      height: v?.videoHeight || 0,
    });
  };

  if (!open) return null;

  const trimLength = Math.max(0, end - start);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pemotong Video"
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rise-in relative w-full max-w-xl rounded-[12px] border border-line bg-surface p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Scissors size={20} className="text-accent" />
            <h3 className="text-lg font-semibold tracking-tight text-ink">Trim & Potong Video</h3>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-icon border-transparent text-muted hover:text-ink"
            aria-label="Tutup"
            disabled={processing}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-[8px] border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Video Preview */}
        <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-[8px] border border-line-strong bg-black">
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="auto"
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              className="h-full w-full object-contain"
            />
          )}

          {processing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center">
              <CircleNotch size={36} className="animate-spin text-accent" />
              <p className="mt-3 text-sm font-medium text-ink">Memotong video... ({progress}%)</p>
              <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-line-strong">
                <div
                  className="h-full bg-accent transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!processing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-bg/80 text-white backdrop-blur transition-transform active:scale-95"
            >
              {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            </button>
          )}

          <div className="pointer-events-none absolute bottom-3 right-3 rounded-[6px] bg-bg/80 px-2.5 py-1 font-mono text-xs text-muted backdrop-blur">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Trimmer Controls */}
        <div className="mt-5 space-y-4 rounded-[10px] border border-line bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
            <span>Mulai: <strong className="text-ink">{formatTime(start)}</strong></span>
            <span>Durasi Potongan: <strong className="text-accent">{trimLength.toFixed(1)}s</strong></span>
            <span>Selesai: <strong className="text-ink">{formatTime(end)}</strong></span>
          </div>

          {/* Start Slider */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-faint">
              <label htmlFor="trim-start">Titik Mulai</label>
              <span>{formatTime(start)}</span>
            </div>
            <input
              id="trim-start"
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={start}
              disabled={processing}
              onChange={(e) => {
                const val = Math.min(Number(e.target.value), end - 0.2);
                setStart(Math.max(0, val));
                if (videoRef.current) videoRef.current.currentTime = Math.max(0, val);
              }}
              className="w-full accent-[#4a82ff]"
            />
          </div>

          {/* End Slider */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-faint">
              <label htmlFor="trim-end">Titik Selesai</label>
              <span>{formatTime(end)}</span>
            </div>
            <input
              id="trim-end"
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={end}
              disabled={processing}
              onChange={(e) => {
                const val = Math.max(Number(e.target.value), start + 0.2);
                setEnd(Math.min(duration, val));
                if (videoRef.current) videoRef.current.currentTime = Math.min(duration, val);
              }}
              className="w-full accent-[#4a82ff]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              className="btn btn-sm"
              disabled={processing}
              onClick={playPreviewRange}
            >
              <Play size={14} /> Preview Potongan
            </button>
            <button
              type="button"
              className="btn btn-sm border-transparent text-muted hover:text-ink"
              disabled={processing}
              onClick={() => {
                setStart(0);
                setEnd(duration);
                if (videoRef.current) videoRef.current.currentTime = 0;
              }}
            >
              <ArrowClockwise size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            className="btn btn-sm border-transparent text-muted hover:text-ink"
            disabled={processing}
            onClick={uploadOriginalWithoutTrim}
          >
            Upload Asli (Tanpa Trim)
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={processing}
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={processing || trimLength <= 0}
              onClick={executeTrim}
            >
              <Scissors size={15} /> Potong & Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

