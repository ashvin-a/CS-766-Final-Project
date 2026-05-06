import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

// ─── Team members — equal visual weight, distinct accent colours ───────────
const MEMBERS = [
  {
    name: "Ashvin Anilkumar",
    color:    new THREE.Color(0.23, 0.51, 0.96),
    emissive: new THREE.Color(0.12, 0.28, 0.72),
    bg:       "rgba(37,99,235,0.88)",
  },
  {
    name: "Suramy Pidara",
    color:    new THREE.Color(0.54, 0.36, 0.98),
    emissive: new THREE.Color(0.30, 0.14, 0.70),
    bg:       "rgba(109,40,217,0.88)",
  },
  {
    name: "Ashish Das",
    color:    new THREE.Color(0.08, 0.72, 0.66),
    emissive: new THREE.Color(0.04, 0.42, 0.38),
    bg:       "rgba(13,148,136,0.88)",
  },
]

const ORBIT_R   = 1.85   // orbit radius
const SPHERE_R  = 0.28   // sphere radius
const ROT_SPEED = 0.22   // rad/s — one full orbit every ~28 s

// ─── Canvas sprite helper ──────────────────────────────────────────────────
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x, y,         r)
  ctx.lineTo(x,     y + r)
  ctx.arcTo(x, y,         x + w, y, r)
  ctx.closePath()
  ctx.fill()
}

function createNameSprite(name: string, bg: string): THREE.Sprite {
  const cw = 280, ch = 62
  const canvas = document.createElement("canvas")
  canvas.width  = cw
  canvas.height = ch
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = bg
  drawRoundedRect(ctx, 0, 0, cw, ch, ch / 2)

  ctx.fillStyle = "#ffffff"
  ctx.font      = "bold 24px DM Sans, system-ui, sans-serif"
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(name, cw / 2, ch / 2)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthTest: false,
    sizeAttenuation: true,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.95, 0.44, 1)
  return sprite
}

// ─── Component ─────────────────────────────────────────────────────────────
interface Props {
  position: THREE.Vector3
  active: boolean
}

export function TeamOrbs({ position, active }: Props) {
  const groupRef    = useRef<THREE.Group>(null)
  const subRefs     = useRef<(THREE.Group | null)[]>([null, null, null])
  const animRef     = useRef(0)    // 0→1 smoothstep
  const timeRef     = useRef(0)
  const rotYRef     = useRef(0)

  const { sphereMats, nameSpriteList, allSpriteMats, ringMat } = useMemo(() => {
    const sphereMats = MEMBERS.map((m) =>
      new THREE.MeshStandardMaterial({
        color:             m.color,
        emissive:          m.emissive,
        emissiveIntensity: 0.6,
        transparent:       true,
        opacity:           0,
        roughness:         0.25,
        metalness:         0.2,
      })
    )

    const ringMat = new THREE.MeshStandardMaterial({
      color:    new THREE.Color(0.75, 0.78, 0.95),
      emissive: new THREE.Color(0.22, 0.28, 0.75),
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0,
      roughness: 0.7,
      side: THREE.DoubleSide,
    })

    const nameSpriteList = MEMBERS.map((m) =>
      createNameSprite(m.name, m.bg)
    )

    const allSpriteMats = nameSpriteList.map(
      (s) => s.material as THREE.SpriteMaterial
    )

    return { sphereMats, nameSpriteList, allSpriteMats, ringMat }
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta
    rotYRef.current += delta * ROT_SPEED

    const target = active ? 1 : 0
    const speed  = active ? 1.4 : 2.2
    animRef.current += (target - animRef.current) * Math.min(1, delta * speed)

    const t     = animRef.current
    const eased = t * t * (3 - 2 * t)

    // Float the whole cluster
    if (groupRef.current) {
      groupRef.current.position.set(
        position.x,
        position.y + 2.6 + Math.sin(timeRef.current * 0.45) * 0.14,
        position.z - 0.5,
      )
      groupRef.current.rotation.y = rotYRef.current
    }

    // Individual bob + scale opacity per sub-group
    for (let i = 0; i < 3; i++) {
      const sg = subRefs.current[i]
      if (sg) {
        // Each orb bobs at a different phase for an organic feel
        sg.position.y = Math.sin(timeRef.current * 0.8 + i * 2.094) * 0.2
      }
    }

    // Sphere opacity + emissive pulse
    sphereMats.forEach((m, i) => {
      m.opacity            = eased * 0.92
      m.emissiveIntensity  = 0.5 + Math.sin(timeRef.current * 1.1 + i * 1.05) * 0.35
    })

    // Ring opacity
    ringMat.opacity = eased * 0.45

    // Labels fade in later, giving spheres a moment to appear first
    const labelEased = Math.max(0, (eased - 0.4) / 0.6)
    allSpriteMats.forEach((m) => { m.opacity = labelEased * 0.97 })
  })

  return (
    <group ref={groupRef} position={[position.x, position.y + 2.6, position.z - 0.5]}>
      {/* Flat guide ring at orbit level */}
      <mesh material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ORBIT_R - 0.05, ORBIT_R + 0.05, 64]} />
      </mesh>

      {/* Three orb groups equally spaced around the orbit */}
      {MEMBERS.map((_, i) => {
        const angle = (2 * Math.PI / 3) * i
        const x     = Math.cos(angle) * ORBIT_R
        const z     = Math.sin(angle) * ORBIT_R

        return (
          <group
            key={i}
            ref={(el) => { subRefs.current[i] = el }}
            position={[x, 0, z]}
          >
            {/* Glowing sphere */}
            <mesh material={sphereMats[i]} castShadow={false}>
              <sphereGeometry args={[SPHERE_R, 20, 20]} />
            </mesh>

            {/* Name label — Sprite always faces camera */}
            <primitive
              object={nameSpriteList[i]}
              position={[0, SPHERE_R + 0.42, 0]}
            />
          </group>
        )
      })}
    </group>
  )
}
