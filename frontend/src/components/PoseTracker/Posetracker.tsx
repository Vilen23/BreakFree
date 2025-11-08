import React, { useEffect, useRef, useState } from "react"
import * as tf from "@tensorflow/tfjs"
import * as posedetection from "@tensorflow-models/pose-detection"
import "@tensorflow/tfjs-backend-webgl"

type PosePoint = {
  x: number
  y: number
  score: number
  name: string
}

type PoseTrackerProps = {
  taskId: string
  backendUrl?: string
  captureFps?: number
  showHints?: boolean
  referenceVideoUrl?: string
}

export default function PoseTracker({
  taskId,
  backendUrl = "http://localhost:8000/api/pose/compare",
  captureFps = 10,
  showHints = true,
  referenceVideoUrl = "src/reference_videos/task_1.mp4",
}: PoseTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectorRef = useRef<any | null>(null)
  const rafRef = useRef<number | null>(null)

  // 🔥 Reference Tracking
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [referencePoses, setReferencePoses] = useState<PosePoint[][]>([])

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

  // Upper-body joints to capture (MoveNet names)
  const UPPER_BODY_JOINTS = [
    "nose",
    "left_eye",
    "right_eye",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
  ]

  const captureIntervalMs = Math.max(1, Math.round(1000 / captureFps))
  const lastCaptureTs = useRef<number>(0)

  // 🔥 Load Reference Pose JSON (auto-detect from video name)
  useEffect(() => {
    if (!referenceVideoUrl) return

    const jsonUrl = referenceVideoUrl
      .replace("/reference_videos/", "/reference_poses/")
      .replace(".mp4", "_pose.json")

    fetch(jsonUrl)
      .then((res) => res.json())
      .then((data) => {
        console.log(
          "[ReferencePose] Loaded",
          data.length,
          "frames from",
          jsonUrl
        )
        setReferencePoses(data)
      })
      .catch((err) => console.warn("Failed to load reference pose JSON:", err))
  }, [referenceVideoUrl])

  // 🔥 Draw reference skeleton frame
  const drawReferencePoseFrame = (time: number) => {
    if (!referencePoses.length || !refCanvasRef.current) return
    const ctx = refCanvasRef.current.getContext("2d")!
    const fps = 15 // your pose extraction rate
    const frameIndex = Math.floor(time * fps)
    if (frameIndex < 0 || frameIndex >= referencePoses.length) return

    const frame = referencePoses[frameIndex]
    ctx.clearRect(0, 0, 480, 360)

    frame.forEach((kp) => {
      if (kp.score > 0.3) {
        ctx.beginPath()
        ctx.arc(kp.x * 480, kp.y * 360, 5, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0, 255, 255, 0.8)" // cyan for reference
        ctx.fill()
      }
    })

    // draw simple connections
    const byName = new Map(frame.map((k) => [k.name, k]))
    const drawLine = (a: string, b: string) => {
      const A = byName.get(a)
      const B = byName.get(b)
      if (A && B && A.score > 0.3 && B.score > 0.3) {
        ctx.beginPath()
        ctx.moveTo(A.x * 480, A.y * 360)
        ctx.lineTo(B.x * 480, B.y * 360)
        ctx.strokeStyle = "rgba(0,255,255,0.6)"
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
    drawLine("left_shoulder", "left_elbow")
    drawLine("left_elbow", "left_wrist")
    drawLine("right_shoulder", "right_elbow")
    drawLine("right_elbow", "right_wrist")
  }

  // 🔥 Sync reference skeleton with video playback
  useEffect(() => {
    const refVideo = document.getElementById(
      "referenceVideo"
    ) as HTMLVideoElement
    if (!refVideo || !referencePoses.length) return

    const handleTimeUpdate = () => drawReferencePoseFrame(refVideo.currentTime)
    refVideo.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      refVideo.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [referencePoses])

  // Initialize detector + webcam
  useEffect(() => {
    let mounted = true

    async function setup() {
      try {
        await tf.ready()
        await tf.setBackend("webgl")

        const detector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        )
        detectorRef.current = detector

        const video = videoRef.current!
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        video.srcObject = stream
        await video.play()

        video.addEventListener("loadedmetadata", () => {
          if (canvasRef.current) {
            canvasRef.current.width = video.videoWidth
            canvasRef.current.height = video.videoHeight
          }
        })

        detectLoop()
        if (mounted) setInitialized(true)
      } catch (e: any) {
        console.error("PoseTracker init error:", e)
        setError(String(e.message || e))
      }
    }

    setup()

    return () => {
      mounted = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (detectorRef.current?.dispose) detectorRef.current.dispose()
      if (videoRef.current?.srcObject) {
        ;(videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop())
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
        const filtered: PosePoint[] = rawKps
          .filter((kp: any) => UPPER_BODY_JOINTS.includes(kp.name))
          .map((kp: any) => ({
            x: kp.x / (video.videoWidth || 1),
            y: kp.y / (video.videoHeight || 1),
            score: kp.score ?? 0,
            name: kp.name,
          }))

        drawKeypoints(ctx, filtered, video.videoWidth, video.videoHeight)

        const now = performance.now()
        if (
          recordingRef.current &&
          now - lastCaptureTs.current >= captureIntervalMs
        ) {
          posesBuffer.current.push(filtered.map((p) => ({ ...p })))
          lastCaptureTs.current = now
        }
      } else if (showHints) {
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
    ctx.fillStyle = "rgba(0,255,0,0.9)"
    ctx.strokeStyle = "rgba(0,255,0,0.9)"
    ctx.lineWidth = 2
    for (const kp of keypoints) {
      if (kp.score > 0.35) {
        ctx.beginPath()
        ctx.arc(kp.x * w, kp.y * h, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

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
    drawLineIf("left_shoulder", "left_elbow")
    drawLineIf("left_elbow", "left_wrist")
    drawLineIf("right_shoulder", "right_elbow")
    drawLineIf("right_elbow", "right_wrist")
  }

  const startRecording = () => {
    posesBuffer.current = [];
    recordingRef.current = true;
    setRecordStartTs(Date.now());
    setIsRecording(true);
    setScore(null);
    setError(null);
    lastCaptureTs.current = 0;
    console.log("🎥 Started recording poses...");
  
    // ✅ Play reference video
    const refVideo = refVideoRef.current;
    if (refVideo) {
      refVideo.currentTime = 0; // restart from beginning
      refVideo.muted = true; // autoplay rule compliance
      refVideo.play().catch((err) => {
        console.warn("⚠️ Autoplay blocked:", err);
      });
    }
  };
  
  const stopRecording = async () => {
    recordingRef.current = false;
    setIsRecording(false);
    const framesCaptured = posesBuffer.current.length;
    console.log("🧍 Frames captured:", framesCaptured);
  
    // ✅ Pause reference video
    const refVideo = refVideoRef.current;
    if (refVideo) refVideo.pause();
  
    if (framesCaptured === 0) {
      setError("No frames captured — try moving in front of the camera or increase captureFps.");
      return;
    }
  
    const payload = {
      task_id: taskId,
      user_pose_sequence: posesBuffer.current,
    };
  
    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      const data = await res.json();
      if (res.ok) setScore(typeof data.score === "number" ? data.score : null);
      else setError(data.error || JSON.stringify(data));
    } catch (e: any) {
      setError(String(e.message || e));
      console.error("send error:", e);
    }
  };
  

  const getElapsed = () => {
    if (!recordStartTs) return "00:00"
    const sec = Math.floor((Date.now() - recordStartTs) / 1000)
    const mm = String(Math.floor(sec / 60)).padStart(2, "0")
    const ss = String(sec % 60).padStart(2, "0")
    return `${mm}:${ss}`
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 pt-24 pb-16 px-4">
      {/* 🧠 Header */}
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Exercise Tracker <span className="text-green-600">– BreakFree AI</span>
      </h1>

      {/* 🎥 Videos Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* Reference Video */}
        {referenceVideoUrl && (
          <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden group">
            <video
              ref={refVideoRef} // 👈 ADD THIS REF
              src={referenceVideoUrl}
              width={480}
              height={360}
              muted // 👈 REQUIRED for autoplay
              className="w-full h-auto object-cover rounded-2xl"
              playsInline
              loop
              id="referenceVideo"
            />
            <canvas
              ref={refCanvasRef}
              width={480}
              height={360}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <div className="absolute bottom-3 left-3 text-white bg-black/60 px-3 py-1 rounded-lg text-sm font-semibold tracking-wide">
              Reference
            </div>
          </div>
        )}

        {/* User Video */}
        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden group">
          <video
            ref={videoRef}
            width={480}
            height={360}
            className="w-full h-auto object-cover bg-black rounded-2xl"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={480}
            height={360}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />

          {/* Recording HUD */}
          <div className="absolute top-3 left-3 text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-lg">
            {isRecording ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                {getElapsed()}
              </span>
            ) : initialized ? (
              "Ready"
            ) : (
              "Initializing..."
            )}
          </div>

          <div className="absolute bottom-3 left-3 text-white bg-black/60 px-3 py-1 rounded-lg text-sm font-semibold tracking-wide">
            You
          </div>

          <div className="absolute inset-0 border-2 border-transparent group-hover:border-green-400 rounded-2xl transition-all duration-300" />
        </div>
      </div>

      {/* 🎮 Control Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={startRecording}
          disabled={!initialized || isRecording}
          className={`px-6 py-3 rounded-xl font-semibold shadow-md transition-all duration-200 
            ${
              initialized && !isRecording
                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 hover:shadow-lg text-white"
                : "bg-gray-300 cursor-not-allowed text-gray-500"
            }`}
        >
          ▶ Start Exercise
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className={`px-6 py-3 rounded-xl font-semibold shadow-md transition-all duration-200 
            ${
              isRecording
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 hover:shadow-lg text-white"
                : "bg-gray-300 cursor-not-allowed text-gray-500"
            }`}
        >
          ⏹ Stop
        </button>
      </div>

      {/* 📈 Result + Info */}
      <div className="mt-6 text-center">
        {error && <div className="text-orange-500 font-medium">⚠ {error}</div>}
        {score !== null && !error && (
          <div className="text-xl font-semibold text-gray-800 mt-2">
            Score:{" "}
            <span className="text-green-600">{(score * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      <p className="mt-6 text-gray-500 text-sm max-w-lg text-center leading-relaxed">
        Tip: Keep your shoulders & hands visible. If the camera is close, try
        increasing <code>captureFps</code> for smoother tracking.
      </p>
    </div>
  )
}
