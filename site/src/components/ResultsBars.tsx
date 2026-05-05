import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

// ─── Run data ──────────────────────────────────────────────────────────────
const RUNS = [
  { baseline: 30.29, finetuned: 62.86 }, // ResNet-50
  { baseline: 29.14, finetuned: 71.43 }, // MobileNet-V3 ★
  { baseline: 30.86, finetuned: 68.00 }, // EfficientNet-B0
  { baseline: 38.29, finetuned: 68.57 }, // ConvNeXt-Tiny
  { baseline: 35.37, finetuned: 67.35 }, // ResNet-50 + Aug
  { baseline: 29.93, finetuned: 65.31 }, // ResNet-50 + Diff
  { baseline: 37.29, finetuned: 62.86 }, // ResNet-50 + CLIP
  { baseline: 26.40, finetuned: 60.43 }, // ResNet-50 + All
]

const HEIGHT_SCALE = 0.035  // 100% → 3.5 world units
const SPACING      = 0.88   // gap between run groups
const BAR_R        = 0.10   // cylinder radius
const MAX_HEIGHT   = 71.43 * HEIGHT_SCALE

// ─── Canvas-sprite helpers ─────────────────────────────────────────────────
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}

function createLabelSprite(
  text: string,
  bgColor: string,
  scaleX: number,
  scaleY: number,
): THREE.Sprite {
  const cw = 128, ch = 44
  const canvas = document.createElement("canvas")
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = bgColor
  drawRoundedRect(ctx, 2, 2, cw - 4, ch - 4, (ch - 4) / 2)

  ctx.fillStyle = "#ffffff"
  ctx.font = `bold 20px DM Sans, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, cw / 2, ch / 2)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthTest: false,
    sizeAttenuation: true,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(scaleX, scaleY, 1)
  return sprite
}

function createHeadingSprite(): THREE.Sprite {
  const cw = 520, ch = 56
  const canvas = document.createElement("canvas")
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "rgba(30,41,59,0.78)"
  drawRoundedRect(ctx, 0, 0, cw, ch, ch / 2)

  // Left legend — blue dot
  ctx.fillStyle = "rgba(59,130,246,0.9)"
  ctx.beginPath()
  ctx.arc(36, ch / 2, 9, 0, Math.PI * 2)
  ctx.fill()

  // Right legend — purple dot
  ctx.fillStyle = "rgba(139,92,246,0.9)"
  ctx.beginPath()
  ctx.arc(cw - 36, ch / 2, 9, 0, Math.PI * 2)
  ctx.fill()

  // Title
  ctx.fillStyle = "#f8fafc"
  ctx.font = "bold 19px DM Sans, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Baseline  ·  Fine-tuned Accuracy — 8 Runs", cw / 2, ch / 2)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthTest: false,
    sizeAttenuation: true,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(4.8, 0.52, 1)
  return sprite
}

// ─── Component ─────────────────────────────────────────────────────────────
interface Props {
  position: THREE.Vector3
  active: boolean
}

export function ResultsBars({ position, active }: Props) {
  const groupRef  = useRef<THREE.Group>(null)
  const animRef   = useRef(0)
  const timeRef   = useRef(0)

  const { bMats, fMats, platMat, fineSprites, baseSprites, headingSprite, allSpriteMats } =
    useMemo(() => {
      // Bar materials
      const bMats = RUNS.map(() =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.2, 0.42, 0.9),
          emissive: new THREE.Color(0.08, 0.22, 0.6),
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0,
          roughness: 0.5,
          metalness: 0.1,
        })
      )

      const fMats = RUNS.map((run) => {
        const t = Math.max(0, Math.min(1, (run.finetuned - 60) / 12))
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.22 + t * 0.12, 0.12, 0.58 + t * 0.38),
          emissive: new THREE.Color(0.28 + t * 0.18, 0.08, 0.65 + t * 0.28),
          emissiveIntensity: 0.45 + t * 0.7,
          transparent: true,
          opacity: 0,
          roughness: 0.28,
          metalness: 0.2,
        })
      })

      const platMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.85, 0.88, 0.98),
        emissive: new THREE.Color(0.18, 0.25, 0.75),
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 0,
        roughness: 0.6,
      })

      // Percentage label sprites — fine-tuned (purple pill)
      const fineSprites = RUNS.map((run) =>
        createLabelSprite(
          `${run.finetuned.toFixed(1)}%`,
          "rgba(109,40,217,0.82)",
          0.56,
          0.195,
        )
      )

      // Percentage label sprites — baseline (blue pill, slightly smaller/dimmer)
      const baseSprites = RUNS.map((run) =>
        createLabelSprite(
          `${run.baseline.toFixed(1)}%`,
          "rgba(37,99,235,0.72)",
          0.48,
          0.17,
        )
      )

      const headingSprite = createHeadingSprite()

      const allSpriteMats = [
        ...fineSprites.map((s) => s.material as THREE.SpriteMaterial),
        ...baseSprites.map((s) => s.material as THREE.SpriteMaterial),
        headingSprite.material as THREE.SpriteMaterial,
      ]

      return { bMats, fMats, platMat, fineSprites, baseSprites, headingSprite, allSpriteMats }
    }, [])

  useFrame((_, delta) => {
    timeRef.current += delta
    const target = active ? 1 : 0
    const speed  = active ? 1.6 : 2.5
    animRef.current += (target - animRef.current) * Math.min(1, delta * speed)

    const t     = animRef.current
    const eased = t * t * (3 - 2 * t)  // smoothstep

    if (groupRef.current) {
      groupRef.current.position.set(
        position.x,
        position.y + 2 + Math.sin(timeRef.current * 0.55) * 0.18,
        position.z - 0.8,
      )
      const s = 0.15 + eased * 0.85
      groupRef.current.scale.setScalar(s)
    }

    bMats.forEach((m) => { m.opacity = eased * 0.5 })
    fMats.forEach((m) => { m.opacity = eased * 0.85 })
    platMat.opacity = eased * 0.6

    // Labels fade in slightly later (feels like they "pop" on after bars appear)
    const labelEased = Math.max(0, (eased - 0.35) / 0.65)
    allSpriteMats.forEach((m) => { m.opacity = labelEased * 0.95 })
  })

  return (
    <group ref={groupRef} position={[position.x, position.y + 2.8, position.z - 0.8]}>
      {/* Chart heading */}
      <primitive
        object={headingSprite}
        position={[0, MAX_HEIGHT + 0.88, 0.1]}
      />

      {/* Per-run bar groups */}
      {RUNS.map((run, i) => {
        const x     = (i - (RUNS.length - 1) / 2) * SPACING
        const baseH = run.baseline  * HEIGHT_SCALE
        const fineH = run.finetuned * HEIGHT_SCALE

        return (
          <group key={i} position={[x, 0, 0]}>
            {/* Baseline bar — blue, thinner */}
            <mesh
              position={[-0.19, baseH / 2, 0]}
              material={bMats[i]}
              castShadow={false}
              receiveShadow={false}
            >
              <cylinderGeometry args={[BAR_R * 0.75, BAR_R * 0.75, baseH, 6, 1]} />
            </mesh>

            {/* Fine-tuned bar — purple gradient, slightly wider */}
            <mesh
              position={[0.19, fineH / 2, 0]}
              material={fMats[i]}
              castShadow={false}
              receiveShadow={false}
            >
              <cylinderGeometry args={[BAR_R, BAR_R * 1.18, fineH, 6, 1]} />
            </mesh>

            {/* Platform base */}
            <mesh
              position={[0, 0.025, 0]}
              material={platMat}
              castShadow={false}
              receiveShadow={false}
            >
              <cylinderGeometry args={[0.34, 0.34, 0.05, 8, 1]} />
            </mesh>

            {/* Fine-tuned % label — above purple bar */}
            <primitive
              object={fineSprites[i]}
              position={[0.19, fineH + 0.32, 0.1]}
            />

            {/* Baseline % label — above blue bar */}
            <primitive
              object={baseSprites[i]}
              position={[-0.19, baseH + 0.28, 0.1]}
            />
          </group>
        )
      })}
    </group>
  )
}
