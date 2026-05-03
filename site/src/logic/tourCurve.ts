import * as THREE from "three"

export interface CurveData {
  curve: THREE.CatmullRomCurve3
  /** Arc-free t values at which `curve.getPoint(t)` lands exactly on each beacon. */
  beaconTs: number[]
  beaconPositions: THREE.Vector3[]
}

/**
 * Place `stopCount` beacon stops in a sweeping 3D arc, wrap them in a
 * Catmull-Rom curve with lead-in and lead-out control points so the sphere
 * enters and exits smoothly.
 *
 * Because we use `curve.getPoint()` (segment-uniform, NOT arc-length), control
 * point `k` in an `n`-point curve sits exactly at t = k / (n-1). Our beacons
 * are control points 1…stopCount, so:
 *   beaconTs[i] = (i + 1) / (stopCount + 1)
 */
export function buildTourCurve(stopCount: number): CurveData {
  const n = Math.max(stopCount, 2)

  // Place beacons in a wide cinematic sweep through 3D space.
  // X: side-to-side sinusoidal drift
  // Y: gentle arc (rises then falls)
  // Z: moves from +z toward -z so camera flies "forward"
  const beaconPositions = Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0
    const side = Math.sin(t * Math.PI * 1.7 - 0.6) * 6.5
    const height = 2.2 + Math.sin(t * Math.PI) * 1.8
    const depth = 14 - t * 28 // z: +14 → -14
    return new THREE.Vector3(side, height, depth)
  })

  // Lead-in: directly behind first beacon along travel direction
  const first = beaconPositions[0]
  const second = beaconPositions[Math.min(1, n - 1)]
  const leadInDir = new THREE.Vector3()
    .subVectors(first, second)
    .normalize()
    .multiplyScalar(12)
  const leadIn = first.clone().add(leadInDir)

  // Lead-out: continuing past last beacon
  const last = beaconPositions[n - 1]
  const prev = beaconPositions[Math.max(0, n - 2)]
  const leadOutDir = new THREE.Vector3()
    .subVectors(last, prev)
    .normalize()
    .multiplyScalar(10)
  const leadOut = last.clone().add(leadOutDir)

  const pts = [leadIn, ...beaconPositions, leadOut]
  const totalPts = pts.length // n + 2

  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5)

  // Beacon i is control point i+1; with totalPts points t = (i+1)/(totalPts-1)
  const beaconTs = beaconPositions.map((_, i) => (i + 1) / (totalPts - 1))

  return { curve, beaconTs, beaconPositions }
}

/** Return the index of the most-recently-passed beacon (-1 if before any). */
export function currentStopIndex(progress: number, beaconTs: number[]): number {
  let active = -1
  for (let i = 0; i < beaconTs.length; i++) {
    if (progress >= beaconTs[i] - 0.045) active = i
  }
  return active
}
