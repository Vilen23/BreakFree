"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import * as tf from "@tensorflow/tfjs"
import * as posedetection from "@tensorflow-models/pose-detection"
import "@tensorflow/tfjs-backend-webgl"

import {
  Play,
  Pause,
  Video,
  VideoOff,
  ChevronLeft,
  Info,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

type PosePoint = {
  x: number
  y: number
  score: number
  name: string
}

type PoseTrackerProps = {
  onClose: () => void
  taskId: string
  taskName: string
  backendUrl?: string
  captureFps?: number
  showHints?: boolean
  referenceVideoUrl?: string
  taskSteps: string[]
  showTrackingPoints?: boolean
  onExerciseComplete?: () => void // Callback when exercise is completed with score
  exerciseType?: string | null // Exercise type from backend (e.g., "physical")
  difficulty?: string | null // Difficulty level from backend (e.g., "easy", "medium", "hard")
}

export default function PoseTracker({
  onClose,
  taskId,
  taskName = "Push Down",
  backendUrl = "http://localhost:8000/api/pose/compare",
  captureFps = 10,
  showHints = true,
  referenceVideoUrl = "https://github.com/Vilen23/breakfree-assets/raw/refs/heads/main/DeepLung.mp4",
  taskSteps = [],
  showTrackingPoints = true,
  onExerciseComplete,
  exerciseType = null,
  difficulty = null,
}: PoseTrackerProps) {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectorRef = useRef<any | null>(null)
  const rafRef = useRef<number | null>(null)

  // Reference tracking - removed, backend handles reference pose extraction

  // Mutable buffers & flags
  const posesBuffer = useRef<PosePoint[][]>([])
  const recordingRef = useRef<boolean>(false)

  // UI state
  const [initialized, setInitialized] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordStartTs, setRecordStartTs] = useState<number | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const refVideoRef = useRef<HTMLVideoElement | null>(null)

  // New UI-only state (doesn't change core functionality)
  const [activeTab, setActiveTab] = useState<"instructions" | "tips">("instructions")
  const [isRefPlaying, setIsRefPlaying] = useState(false)

  console.log(score, error)

  // Track all available points - no filtering

  const captureIntervalMs = Math.max(1, Math.round(1000 / captureFps))
  const lastCaptureTs = useRef<number>(0)

  // Reference video pose extraction removed - backend handles this using pre-computed reference poses

  // Initialize detector + webcam
  useEffect(() => {
    let mounted = true
    let stream: MediaStream | null = null

    async function setup() {
      try {
        await tf.ready()
        await tf.setBackend("webgl")

        const detector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        )
        if (!mounted) {
          detector.dispose()
          return
        }
        detectorRef.current = detector

        const video = videoRef.current
        if (!video || !mounted) return

        // Get user media stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        // Pause video first to avoid interrupting play() promise
        video.pause()
        
        // Set srcObject
        video.srcObject = stream
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          const handleLoadedMetadata = () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata)
            if (canvasRef.current) {
              canvasRef.current.width = video.videoWidth
              canvasRef.current.height = video.videoHeight
            }
            resolve()
          }
          video.addEventListener("loadedmetadata", handleLoadedMetadata)
          // If metadata is already loaded
          if (video.readyState >= 1) {
            handleLoadedMetadata()
          }
        })

        if (!mounted) return

        // Play video with proper error handling
        try {
          const playPromise = video.play()
          if (playPromise !== undefined) {
            await playPromise
          }
        } catch (playError: any) {
          // Ignore play() interruption errors - they're usually harmless
          if (playError.name !== "AbortError" && playError.name !== "NotAllowedError") {
            console.warn("Video play error:", playError)
          }
        }

        if (mounted) {
          detectLoop()
          setInitialized(true)
        }
      } catch (e: any) {
        if (mounted) {
          console.error("PoseTracker init error:", e)
          setError(String(e.message || e))
        }
      }
    }

    setup()

    return () => {
      mounted = false
      
      // Cancel animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      
      // Dispose detector
      if (detectorRef.current?.dispose) {
        detectorRef.current.dispose()
        detectorRef.current = null
      }
      
      // Clean up video stream
      const video = videoRef.current
      if (video) {
        // Pause video first
        try {
          video.pause()
        } catch {
          // Ignore pause errors
        }
        
        // Clear srcObject
        if (video.srcObject) {
          const mediaStream = video.srcObject as MediaStream
          mediaStream.getTracks().forEach((track) => {
            track.stop()
          })
          video.srcObject = null
        }
      }
      
      // Also clean up stream reference
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Main detection loop
  const detectLoop = async () => {
    const det = detectorRef.current
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!det || !video || !canvas) {
      rafRef.current = requestAnimationFrame(detectLoop)
      return
    }

    try {
      const poses = await det.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
      })
      const ctx = canvas.getContext("2d")!
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (poses.length > 0) {
        const rawKps = poses[0].keypoints || []
        // Capture all detected points (only those with score > threshold)
        const filtered: PosePoint[] = rawKps
          .filter((kp: any) => (kp.score ?? 0) > 0.2) // Only track visible points
          .map((kp: any) => ({
            x: kp.x / (video.videoWidth || 1),
            y: kp.y / (video.videoHeight || 1),
            score: kp.score ?? 0,
            name: kp.name,
          }))

        if (showTrackingPoints) {
          drawKeypoints(ctx, filtered, video.videoWidth, video.videoHeight)
        }

        const now = performance.now()
        if (recordingRef.current && now - lastCaptureTs.current >= captureIntervalMs) {
          posesBuffer.current.push(filtered.map((p) => ({ ...p })))
          lastCaptureTs.current = now
        }
      } else if (showHints && showTrackingPoints) {
        ctx.font = "16px sans-serif"
        ctx.fillStyle = "rgba(255,255,255,0.9)"
        ctx.fillText("No pose detected — show upper body to camera", 10, 24)
      }
    } catch (e) {
      console.warn("detectLoop error:", e)
    } finally {
      rafRef.current = requestAnimationFrame(detectLoop)
    }
  }

  // Draw live keypoints
  function drawKeypoints(
    ctx: CanvasRenderingContext2D,
    keypoints: PosePoint[],
    w: number,
    h: number
  ) {
    ctx.fillStyle = "rgba(45, 212, 191, 1)"
    ctx.strokeStyle = "rgba(45, 212, 191, 0.9)"
    ctx.lineWidth = 2
    for (const kp of keypoints) {
      if (kp.score > 0.35) {
        ctx.beginPath()
        ctx.arc(kp.x * w, kp.y * h, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw skeleton connections for visualization
    const byName = new Map(keypoints.map((k) => [k.name, k]))
    const drawLineIf = (a: string, b: string) => {
      const A = byName.get(a)
      const B = byName.get(b)
      if (A && B && A.score > 0.3 && B.score > 0.3) {
        ctx.beginPath()
        ctx.moveTo(A.x * w, A.y * h)
        ctx.lineTo(B.x * w, B.y * h)
        ctx.stroke()
      }
    }
    // Draw common skeleton connections
    drawLineIf("left_shoulder", "right_shoulder")
    drawLineIf("left_shoulder", "left_elbow")
    drawLineIf("left_elbow", "left_wrist")
    drawLineIf("right_shoulder", "right_elbow")
    drawLineIf("right_elbow", "right_wrist")
    drawLineIf("left_shoulder", "left_hip")
    drawLineIf("right_shoulder", "right_hip")
    drawLineIf("left_hip", "right_hip")
    drawLineIf("left_hip", "left_knee")
    drawLineIf("left_knee", "left_ankle")
    drawLineIf("right_hip", "right_knee")
    drawLineIf("right_knee", "right_ankle")
  }

  const startRecording = () => {
    posesBuffer.current = []
    setRecordStartTs(Date.now())
    setIsRecording(true)
    setScore(null)
    setError(null)
    lastCaptureTs.current = 0
    console.log("🎥 Started recording user poses...")

    // Play reference video from start (for visual reference only, no pose tracking)
    const refVideo = refVideoRef.current
    if (refVideo) {
      refVideo.currentTime = 0
      refVideo.muted = true
      refVideo.loop = false // Disable loop during recording so we can detect when it ends
      
      refVideo.play()
        .then(() => {
          setIsRefPlaying(true)
          recordingRef.current = true
          console.log("✅ Recording active - backend will use pre-computed reference poses")
        })
        .catch((err) => {
          console.warn("⚠️ Reference video autoplay blocked:", err)
          // Still allow recording even if video doesn't autoplay
          recordingRef.current = true
          setIsRefPlaying(false)
        })
    } else {
      // Still allow recording even without reference video
      recordingRef.current = true
      console.log("⚠️ Reference video not found, but recording user poses anyway")
    }
  }

  const stopRecording = async () => {
    recordingRef.current = false
    setIsRecording(false)
    const framesCaptured = posesBuffer.current.length
    console.log("🧍 User frames captured:", framesCaptured)

    const refVideo = refVideoRef.current
    if (refVideo) {
      refVideo.pause()
      setIsRefPlaying(false)
      refVideo.loop = true // Re-enable loop after recording stops
    }

    if (framesCaptured === 0) {
      setError("No frames captured — try moving in front of the camera or increase captureFps.")
      return
    }

    // Backend will load reference poses from pre-computed JSON files
    // Send reference video URL so backend can find the correct exercise and reference pose
    const payload = {
      task_id: taskId,
      reference_video_url: referenceVideoUrl, // Send video URL to find matching exercise
      user_id: user?.id,
      user_pose_sequence: posesBuffer.current,
    }

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("access_token")
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(backendUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        const newScore = typeof data.score === "number" ? data.score : null
        setScore(newScore)
        // Call callback if score was successfully received
        if (newScore !== null && onExerciseComplete) {
          onExerciseComplete()
        }
      } else {
        setError(data.error || JSON.stringify(data))
      }
    } catch (e: any) {
      setError(String(e.message || e))
      console.error("send error:", e)
    }
  }

  const handleReset = () => {
    posesBuffer.current = []
    setScore(null)
    setError(null)
    setRecordStartTs(null)
  }

  const getElapsed = () => {
    if (!recordStartTs) return "00:00"
    const sec = Math.floor((Date.now() - recordStartTs) / 1000)
    const mm = String(Math.floor(sec / 60)).padStart(2, "0")
    const ss = String(sec % 60).padStart(2, "0")
    return `${mm}:${ss}`
  }

  const prettyTaskId = taskId.replace(/-/g, " ")

  return (
    <div className="flex min-h-screen w-full overflow-y-hidden bg-slate-50 font-sans">
      {/* LEFT SIDEBAR */}
      <div className="relative hidden w-1/3 flex-col border-r border-slate-800 bg-[#0f172a] text-slate-300 lg:flex">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-teal-900/10 blur-3xl" />
          <div className="absolute bottom-[10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-blue-900/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex h-full flex-col p-8">
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={onClose}
              className="group mb-6 flex cursor-pointer items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Plan
            </button>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-bold text-teal-500/20">
                <Sparkles className="h-10 w-10" />
              </span>
              <div>
                <h1 className="text-3xl font-bold text-white capitalize">{prettyTaskId}</h1>
                <p className="mt-1 text-sm text-slate-400">{taskName}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {exerciseType && (
                <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-400 capitalize">
                  {exerciseType === "physical" ? "Physical" : exerciseType}
                </span>
              )}
              {difficulty && (
                <span className="rounded-full border border-slate-700 bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-300 capitalize">
                  {difficulty}
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-6 border-b border-slate-800">
            <button
              onClick={() => setActiveTab("instructions")}
              className={cn(
                "relative cursor-pointer pb-3 text-sm font-medium transition-all",
                activeTab === "instructions"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Instructions
              {activeTab === "instructions" && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-teal-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("tips")}
              className={cn(
                "relative cursor-pointer pb-3 text-sm font-medium transition-all",
                activeTab === "tips"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Tips & Safety
              {activeTab === "tips" && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-teal-500" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
            {activeTab === "instructions" ? (
              <div className="space-y-8">
                {taskSteps.map((step, index) => (
                  <div key={index} className="relative border-l-2 border-slate-800 pl-6">
                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 ${
                      index === 0 ? 'border-teal-500' : 'border-slate-600'
                    } bg-[#0f172a]`} />
                    <h2 className="font-bold text-3xl">Step {index + 1}</h2>
                    <h3 className="my-2 max-w-[500px] text-gray opacity-80">{step}</h3>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
                    <div>
                      <h4 className="mb-1 text-sm font-medium text-orange-200">Watch your back</h4>
                      <p className="text-xs leading-relaxed text-orange-200/70">
                        Don&apos;t let your lower back sag. Keep your core tight throughout the movement to
                        protect your spine.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                    <div>
                      <h4 className="mb-1 text-sm font-medium text-blue-200">Breathing</h4>
                      <p className="text-xs leading-relaxed text-blue-200/70">
                        Inhale as you lower yourself down, and exhale forcefully as you push yourself back up.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="mt-6 border-t border-slate-800 pt-6">
            <button className="w-full cursor-pointer rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
              View Reference Guide
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="relative flex h-full flex-1 flex-col bg-slate-50">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b bg-white p-4 lg:hidden">
          <h1 className="font-bold text-slate-900 capitalize">{prettyTaskId}</h1>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            Step 1/3
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto flex h-full justify-center max-w-6xl  flex-col gap-6">
            <div className="flex flex-col  justify-center gap-5">
            <h1 className="text-5xl font-bold text-slate-900">Follow the instructions and start the exercise to get your score</h1>
            <p className="text-slate-600 text-xl">Complete all reps with proper form to earn points and build your streak</p>
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 font-medium uppercase tracking-wide mb-1">Duration</p>
                  <p className="text-2xl font-bold text-slate-900">10 seconds</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 font-medium uppercase tracking-wide mb-1">Difficulty</p>
                  <p className="text-2xl font-bold text-teal-600 capitalize">
                    {difficulty || "N/A"}
                  </p>
                </div>

              </div>
            </div>
            {/* GRID: Reference guide + AI camera */}
            <div className="grid min-h-[500px] gap-6 b lg:grid-cols-2">
              {/* Reference Video Card */}
              <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Play className="h-4 w-4 fill-current text-teal-500" />
                    Reference Guide
                  </h3>
                  {/* simple static duration label (you can make dynamic later) */}
                  <span className="font-mono text-xs text-slate-400">00:08</span>
                </div>
                <div className="relative flex-1 bg-slate-900">
                  {referenceVideoUrl ? (
                    <>
                      <video
                        ref={refVideoRef}
                        id="referenceVideo"
                        src={referenceVideoUrl}
                        width={480}
                        height={360}
                        muted
                        playsInline
                        loop
                        controls
                        className="h-full w-full object-cover opacity-85"
                        onPlay={() => setIsRefPlaying(true)}
                        onPause={() => setIsRefPlaying(false)}
                        onEnded={() => {
                          // Auto-stop recording when reference video ends
                          if (isRecording && recordingRef.current) {
                            console.log("📹 Reference video ended, auto-stopping recording...")
                            stopRecording()
                          }
                        }}
                        onError={(e) => {
                          console.error("Reference video error:", e)
                          const video = e.currentTarget
                          if (video.error) {
                            console.error("Video error code:", video.error.code, "message:", video.error.message)
                            setError(`Reference video failed to load: ${video.error.message}. Please check the video URL.`)
                          }
                        }}
                        onLoadedData={() => {
                          console.log("✅ Reference video loaded successfully")
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={() => {
                            const v = refVideoRef.current
                            if (!v) return
                            if (v.paused) {
                              v.play().catch((err) =>
                                console.warn("Reference video play error:", err)
                              )
                            } else {
                              v.pause()
                            }
                          }}
                          className="pointer-events-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30"
                        >
                          {isRefPlaying ? (
                            <Pause className="h-8 w-8 fill-current" />
                          ) : (
                            <Play className="ml-1 h-8 w-8 fill-current" />
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                      <VideoOff className="h-10 w-10" />
                      <p className="text-sm">No reference video configured.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Camera Card */}
              <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-900 bg-black shadow-2xl">
                {/* Status pill */}
                <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isRecording ? "bg-green-500 animate-pulse" : "bg-yellow-400"
                    )}
                  />
                  {initialized
                    ? isRecording
                      ? "AI Tracking Active"
                      : "Camera Ready"
                    : "Initializing camera..."}
                </div>

                {/* Camera view */}
                <div className="relative flex flex-1 items-center justify-center p-4">
                  <div className="relative h-full w-full max-h-[360px] overflow-hidden rounded-2xl border border-slate-800 bg-black">
                    <video
                      ref={videoRef}
                      width={480}
                      height={360}
                      className="h-full w-full object-cover opacity-90"
                      playsInline
                      muted
                    />
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={360}
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    />

                    {!initialized && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
                          <VideoOff className="h-8 w-8 text-slate-500" />
                        </div>
                        <p className="text-lg font-medium">Camera Off</p>
                        <p className="text-sm opacity-70">
                          Allow camera access to begin tracking.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls + Score & Error */}
                <div className="border-t border-white/5 bg-slate-900/60 px-6 py-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={startRecording}
                        disabled={!initialized || isRecording}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all cursor-pointer",
                          initialized && !isRecording
                            ? "bg-teal-600 text-white hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-900/30 active:scale-95"
                            : "cursor-not-allowed bg-slate-800 text-slate-500"
                        )}
                      >
                        <Video className="h-5 w-5" />
                        Start Exercise
                      </button>
                      <button
                        onClick={stopRecording}
                        disabled={!isRecording}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors cursor-pointer",
                          isRecording
                            ? "border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500"
                        )}
                      >
                        <VideoOff className="h-5 w-5" />
                        Stop
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col items-start gap-1 text-xs text-slate-300 md:items-end">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-800 px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-slate-300">
                          {isRecording ? `Recording ${getElapsed()}` : "Idle"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Score Display - Prominent */}
                  {score !== null && !error && (
                    <div className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/30 px-6 py-4">
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Exercise Accuracy</p>
                        <p className="mt-1 text-4xl font-bold text-emerald-400">
                          {(score * 100).toFixed(0)}%
                        </p>
                        <p className="mt-2 text-xs text-slate-300">
                          {score >= 0.8 ? "Excellent form! 🎉" : score >= 0.6 ? "Good job! Keep practicing 💪" : "Keep practicing to improve 📈"}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {error && (
                    <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

