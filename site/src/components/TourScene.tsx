import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type { MutableRefObject } from "react"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { CurveData } from "../logic/tourCurve"
import { WaveField } from "./WaveField"
import { TourSphere } from "./TourSphere"
import { Beacons } from "./Beacons"
import { ResultsBars } from "./ResultsBars"

// ─── Cinematic follow-cam ──────────────────────────────────────────────────
interface RigProps {
  curve: THREE.CatmullRomCurve3
  progressRef: MutableRefObject<number>
  /** Ref to the currently active section index (-1 = pre-tour) */
  activeIdxRef: MutableRefObject<number>
}

// Results section index where we zoom out to show all bars
const RESULTS_IDX = 6
// Zoom-out configuration
const NORMAL_BACK   = 9.5
const ZOOM_BACK     = 11.4  // 35% closer than the previous zoom-out (was 17.5)
const NORMAL_HEIGHT = 3.8
const ZOOM_HEIGHT   = 4.7   // 35% closer than the previous zoom-out (was 7.2)

function CameraRig({ curve, progressRef, activeIdxRef }: RigProps) {
  const { camera } = useThree()

  // Pre-allocated scratch objects — zero heap allocation inside useFrame
  const camPos      = useRef(new THREE.Vector3())
  const targetQuat  = useRef(new THREE.Quaternion())
  const tempMat     = useRef(new THREE.Matrix4())
  const _up         = useRef(new THREE.Vector3(0, 1, 0))
  const _forward    = useRef(new THREE.Vector3())
  const _right      = useRef(new THREE.Vector3())
  const _camUp      = useRef(new THREE.Vector3())
  const _desiredPos = useRef(new THREE.Vector3())
  const _lookAt     = useRef(new THREE.Vector3())
  const _spherePos  = useRef(new THREE.Vector3())
  const _sphereAhead= useRef(new THREE.Vector3())
  const initialised = useRef(false)

  // Smooth zoom lerp value — 0 = normal, 1 = zoomed out
  const zoomT = useRef(0)

  useFrame(() => {
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1)

    curve.getPoint(p, _spherePos.current)
    curve.getPoint(THREE.MathUtils.clamp(p + 0.018, 0, 1), _sphereAhead.current)

    _forward.current.subVectors(_sphereAhead.current, _spherePos.current)
    if (_forward.current.lengthSq() < 1e-8) return
    _forward.current.normalize()

    _right.current.crossVectors(_forward.current, _up.current).normalize()
    _camUp.current.crossVectors(_right.current, _forward.current).normalize()

    // Smoothly transition zoom factor (slower in than out for cinematic feel)
    const zoomTarget = activeIdxRef.current === RESULTS_IDX ? 1 : 0
    const zoomSpeed  = zoomTarget > zoomT.current ? 0.025 : 0.035
    zoomT.current += (zoomTarget - zoomT.current) * zoomSpeed

    // Smoothstep easing
    const zt     = zoomT.current
    const zEased = zt * zt * (3 - 2 * zt)

    const backOff   = THREE.MathUtils.lerp(NORMAL_BACK,   ZOOM_BACK,   zEased)
    const heightOff = THREE.MathUtils.lerp(NORMAL_HEIGHT, ZOOM_HEIGHT, zEased)

    _desiredPos.current
      .copy(_spherePos.current)
      .addScaledVector(_forward.current, -backOff)
      .addScaledVector(_camUp.current, heightOff)

    const lerpSpeed = initialised.current ? 0.04 : 1
    camPos.current.lerp(_desiredPos.current, lerpSpeed)
    camera.position.copy(camPos.current)

    _lookAt.current.copy(_sphereAhead.current).addScaledVector(_forward.current, 3.5)
    tempMat.current.lookAt(camera.position, _lookAt.current, _up.current)
    targetQuat.current.setFromRotationMatrix(tempMat.current)
    camera.quaternion.slerp(targetQuat.current, lerpSpeed)

    initialised.current = true
  })

  return null
}

// ─── Subtle ambient particles ──────────────────────────────────────────────
function ParticleField() {
  const geo = useMemo(() => {
    const positions = new Float32Array(480)
    for (let i = 0; i < 160; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 52
      positions[i * 3 + 1] = Math.random() * 10 - 1
      positions[i * 3 + 2] = (Math.random() - 0.5) * 52
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.045,
        color: new THREE.Color(0.4, 0.55, 0.9),
        transparent: true,
        opacity: 0.35,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    []
  )

  return <points geometry={geo} material={mat} />
}

// ─── Scene ─────────────────────────────────────────────────────────────────
interface Props {
  curveData: CurveData
  progressRef: MutableRefObject<number>
  activeIdx: number
}

export function TourScene({ curveData, progressRef, activeIdx }: Props) {
  const { curve, beaconPositions } = curveData

  // Keep activeIdx readable inside R3F closures without triggering re-renders
  const activeIdxRef = useRef(activeIdx)
  activeIdxRef.current = activeIdx

  return (
    <Canvas
      camera={{ position: [0, 4, 22], fov: 44 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#fafafa")
        scene.fog = new THREE.FogExp2("#f8f8f8", 0.022)
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 14, 6]} intensity={0.55} castShadow={false} />
      <directionalLight position={[-10, 6, -8]} intensity={0.22} />
      <pointLight position={[0, 8, 0]} intensity={0.35} color="#b8caff" />

      <WaveField />
      <ParticleField />
      <Beacons positions={beaconPositions} activeIdx={activeIdx} />
      <TourSphere curve={curve} progressRef={progressRef} />
      <CameraRig
        curve={curve}
        progressRef={progressRef}
        activeIdxRef={activeIdxRef}
      />

      {/* Results bar chart floats near the "Experimental results" beacon */}
      {beaconPositions[6] != null && (
        <ResultsBars position={beaconPositions[6]} active={activeIdx === 6} />
      )}
    </Canvas>
  )
}
