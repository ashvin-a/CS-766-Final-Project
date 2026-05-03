import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import rawContent from "./data/sections.json"
import type { SiteContent } from "./types/content"
import { buildTourCurve, currentStopIndex } from "./logic/tourCurve"
import { IntroSplash } from "./components/IntroSplash"
import { TourScene } from "./components/TourScene"
import { SectionDeck } from "./components/SectionDeck"
import { SectionNav } from "./components/SectionNav"

const content = rawContent as SiteContent

/** Intro animation duration — must match CSS `.intro-overlay` animation length. */
const INTRO_MS = 5400
/** Total auto-tour playback duration. */
const TOUR_DURATION_MS = 72_000
/**
 * React UI state update interval (ms).
 * The 3D scene reads `progressRef.current` every frame via refs (smooth at 60fps).
 * React state only updates at this rate — sidebar %, section card, progress bar.
 */
const UI_THROTTLE_MS = 100

export default function App() {
  const stopCount = content.sections.length + 1 // sections + thank-you
  const curveData = useMemo(() => buildTourCurve(stopCount), [stopCount])

  const [introVisible, setIntroVisible] = useState(true)
  const [tourLive, setTourLive] = useState(false)
  /** Throttled progress value — drives sidebar / progress bar / section detection. */
  const [uiProgress, setUiProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const modeRef = useRef<"auto" | "manual">("auto")
  const autoStartRef = useRef<number>(0)
  /** Saved progress when paused, or jump target; used to resume from mid-tour. */
  const autoProgressRef = useRef(0)
  const rafRef = useRef(0)
  /** Live source of truth for the 3D scene — updated every RAF frame. */
  const progressRef = useRef(0)
  const lastUiUpdateRef = useRef(0)

  // Derived active section index — updates at UI throttle rate (~10fps)
  const activeIdx = useMemo(
    () => currentStopIndex(uiProgress, curveData.beaconTs),
    [uiProgress, curveData.beaconTs]
  )

  /**
   * Push `t` to React UI state at most once per `UI_THROTTLE_MS`.
   * The 3D scene doesn't go through React state — it reads `progressRef` directly.
   */
  const updateUi = useCallback((t: number) => {
    const now = performance.now()
    if (now - lastUiUpdateRef.current >= UI_THROTTLE_MS) {
      lastUiUpdateRef.current = now
      setUiProgress(t)
    }
  }, [])

  /**
   * Launch (or re-launch) the auto-tour RAF loop.
   * Always cancels any existing loop first so there is never more than one running.
   */
  const startAutoTour = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    autoStartRef.current = performance.now() - autoProgressRef.current * TOUR_DURATION_MS

    const tick = () => {
      const elapsed = performance.now() - autoStartRef.current
      const t = Math.min(1, elapsed / TOUR_DURATION_MS)
      autoProgressRef.current = t
      progressRef.current = t
      updateUi(t)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [updateUi])

  // ── Intro timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setTimeout(() => {
      setIntroVisible(false)
      setTourLive(true)
    }, INTRO_MS)
    return () => clearTimeout(id)
  }, [])

  // ── Auto-tour loop — starts/stops when tourLive or isPaused change ────────
  useEffect(() => {
    if (!tourLive || isPaused || modeRef.current !== "auto") return
    startAutoTour()
    return () => cancelAnimationFrame(rafRef.current)
  }, [tourLive, isPaused, startAutoTour])

  // ── Manual section jump (smooth ease-to-target) ──────────────────────────
  const jumpTo = (idx: number) => {
    cancelAnimationFrame(rafRef.current)
    modeRef.current = "manual"

    const target =
      curveData.beaconTs[idx] ?? curveData.beaconTs[curveData.beaconTs.length - 1]
    autoProgressRef.current = target

    const animateJump = () => {
      const diff = target - progressRef.current
      if (Math.abs(diff) < 0.0008) {
        progressRef.current = target
        setUiProgress(target)
        lastUiUpdateRef.current = performance.now()
        return
      }
      progressRef.current += diff * 0.08
      updateUi(progressRef.current)
      rafRef.current = requestAnimationFrame(animateJump)
    }
    rafRef.current = requestAnimationFrame(animateJump)
  }

  const handleTogglePause = () => {
    setIsPaused((p) => {
      if (!p) {
        autoProgressRef.current = progressRef.current
        cancelAnimationFrame(rafRef.current)
      } else {
        modeRef.current = "auto"
      }
      return !p
    })
  }

  const handleRestart = () => {
    cancelAnimationFrame(rafRef.current)
    progressRef.current = 0
    autoProgressRef.current = 0
    lastUiUpdateRef.current = 0
    setUiProgress(0)
    modeRef.current = "auto"
    // Directly restart the loop — don't rely on useEffect deps changing
    // (tourLive and isPaused may already be true/false so effect won't re-fire)
    setIsPaused(false)
    startAutoTour()
  }

  const handleSkipIntro = () => {
    setIntroVisible(false)
    setTourLive(true)
  }

  return (
    <>
      {/* 3D canvas — fills the entire viewport */}
      <div className="canvas-root" aria-hidden="true">
        <TourScene curveData={curveData} progressRef={progressRef} activeIdx={activeIdx} />
      </div>

      {/* Intro fade overlay */}
      <IntroSplash visible={introVisible} onSkip={handleSkipIntro} />

      {/* Fixed left sidebar */}
      <SectionNav
        content={content}
        activeIdx={activeIdx}
        progress={uiProgress}
        isPaused={isPaused}
        onJump={jumpTo}
        onTogglePause={handleTogglePause}
        onRestart={handleRestart}
      />

      {/* Section content panel (right side) */}
      <SectionDeck content={content} activeIdx={activeIdx} />

      {/* Tour progress bar (fixed bottom) */}
      <div className="progress-bar" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${uiProgress * 100}%` }} />
      </div>

      {/* Hint before first section */}
      <div className="canvas-hint" data-hidden={activeIdx >= 0 ? "true" : "false"}>
        Tour in progress — sphere flies between stops
      </div>
    </>
  )
}
