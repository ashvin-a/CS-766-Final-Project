import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

interface BeaconsProps {
  positions: THREE.Vector3[]
  activeIdx: number
}

export function Beacons({ positions, activeIdx }: BeaconsProps) {
  return (
    <>
      {positions.map((pos, idx) => (
        <Beacon key={idx} position={pos} active={idx === activeIdx} index={idx} />
      ))}
    </>
  )
}

interface BeaconProps {
  position: THREE.Vector3
  active: boolean
  index: number
}

const ACCENT_COLOR = new THREE.Color(0.22, 0.52, 1.0)
const PULSE_COLOR = new THREE.Color(0.55, 0.3, 0.98)
const IDLE_COLOR = new THREE.Color(0.65, 0.72, 0.88)

function Beacon({ position, active, index }: BeaconProps) {
  const elapsed = useRef(0)

  // Pre-create materials — mutated in useFrame without re-allocating
  const outerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: IDLE_COLOR.clone(),
        emissiveIntensity: 0.4,
        metalness: 0.2,
        roughness: 0.55,
      }),
    []
  )
  const innerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: IDLE_COLOR.clone(),
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.55,
      }),
    []
  )
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: IDLE_COLOR.clone(),
        emissiveIntensity: 1.0,
      }),
    []
  )
  const pulseMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: ACCENT_COLOR.clone(),
        transparent: true,
        opacity: 0.18,
        side: THREE.FrontSide,
        depthWrite: false,
      }),
    []
  )

  const pulseRingRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    elapsed.current += delta

    const t = elapsed.current
    const beat = Math.sin(t * 2.6 + index * 1.1) * 0.5 + 0.5

    const targetColor = active ? ACCENT_COLOR : IDLE_COLOR
    const targetOuter = active ? 2.2 + beat * 1.4 : 0.3 + beat * 0.12
    const targetInner = active ? 1.6 + beat * 1.0 : 0.2 + beat * 0.08
    const targetCore = active ? 4.0 + beat * 2.5 : 0.6 + beat * 0.25

    const ls = 0.06
    outerMat.emissiveIntensity += (targetOuter - outerMat.emissiveIntensity) * ls
    innerMat.emissiveIntensity += (targetInner - innerMat.emissiveIntensity) * ls
    coreMat.emissiveIntensity += (targetCore - coreMat.emissiveIntensity) * ls

    outerMat.emissive.lerp(targetColor, ls)
    innerMat.emissive.lerp(active ? PULSE_COLOR : IDLE_COLOR, ls)
    coreMat.emissive.lerp(active ? ACCENT_COLOR : IDLE_COLOR, ls * 1.5)

    if (pulseRingRef.current) {
      if (active) {
        const ringT = (t * 0.65) % 1
        pulseRingRef.current.scale.setScalar(1.0 + ringT * 0.9)
        pulseMat.opacity = (1 - ringT) * 0.22
      } else {
        pulseRingRef.current.scale.setScalar(1.0)
        pulseMat.opacity = 0.04
      }
    }
  })

  const rotY = (index * Math.PI) / 2.8
  const rotX = (index % 2) * 0.4

  return (
    <group position={position}>
      {/* Outer torus ring — reduced from 8,72 → 8,48 */}
      <mesh rotation={[rotX, rotY, 0]} material={outerMat}>
        <torusGeometry args={[1.05, 0.038, 8, 48]} />
      </mesh>

      {/* Inner torus — reduced from 8,56 → 6,40 */}
      <mesh rotation={[rotX + Math.PI / 2, rotY + 0.4, 0]} material={innerMat}>
        <torusGeometry args={[0.68, 0.025, 6, 40]} />
      </mesh>

      {/* Pulse ring — reduced from 6,64 → 4,48 */}
      <mesh ref={pulseRingRef} material={pulseMat}>
        <torusGeometry args={[1.15, 0.015, 4, 48]} />
      </mesh>

      {/* Core sphere — reduced from 20,20 → 12,12 */}
      <mesh material={coreMat}>
        <sphereGeometry args={[0.13, 12, 12]} />
      </mesh>
    </group>
  )
}
