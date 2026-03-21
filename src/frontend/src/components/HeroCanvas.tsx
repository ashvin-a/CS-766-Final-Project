import { Suspense, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei"
import * as THREE from "three"

function FloatingTiles() {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  const tiles = [
    { position: [2, 1, -3] as [number, number, number], scale: 0.8 },
    { position: [-2.5, -0.5, -4] as [number, number, number], scale: 0.6 },
    { position: [0, 2, -5] as [number, number, number], scale: 0.5 },
    { position: [-1, -1.5, -2] as [number, number, number], scale: 0.7 },
    { position: [1.5, -0.8, -3.5] as [number, number, number], scale: 0.55 },
  ]

  return (
    <group ref={group}>
      {tiles.map((tile, i) => (
        <Float key={i} speed={1.5 + i * 0.2} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={tile.position} scale={tile.scale}>
            <planeGeometry args={[1.2, 1.2]} />
            <meshBasicMaterial
              color="rgba(100, 150, 255, 0.25)"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function GridBackground() {
  const gridRef = useRef<THREE.GridHelper>(null)
  return (
    <gridHelper
      ref={gridRef}
      args={[20, 20, "rgba(100, 150, 255, 0.15)", "rgba(100, 150, 255, 0.05)"]}
      position={[0, 0, -8]}
    />
  )
}

export function HeroCanvas() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
    )
  }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <GridBackground />
          <FloatingTiles />
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
    </div>
  )
}
