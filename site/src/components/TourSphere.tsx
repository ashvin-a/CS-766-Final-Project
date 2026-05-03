import { useFrame } from "@react-three/fiber"
import type { MutableRefObject } from "react"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { CatmullRomCurve3 } from "three"

/** UV shader: animated blue↔magenta hue weave */
const vert = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const frag = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 a = vec3(0.14, 0.38, 0.97);
  vec3 b = vec3(0.88, 0.22, 0.72);
  vec3 c = vec3(0.15, 0.85, 0.72);

  float flow =
    sin(vUv.x * 6.283 + uTime * 0.82) *
    cos(vUv.y * 9.425 + uTime * 0.61);
  float flow2 = cos((vUv.x + vUv.y) * 4.71 + uTime * 0.47);

  vec3 col = mix(a, mix(b, c, flow2 * 0.5 + 0.5), flow * 0.5 + 0.5);

  // Rim light
  float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
  col += rim * rim * 0.35 * vec3(0.5, 0.7, 1.0);

  // Weave highlight
  float weave = sin((vUv.x + vUv.y) * 22.0 + uTime * 1.6) * 0.06 + 1.0;
  col *= weave;

  gl_FragColor = vec4(col, 1.0);
}
`

interface Props {
  curve: CatmullRomCurve3
  progressRef: MutableRefObject<number>
}

export function TourSphere({ curve, progressRef }: Props) {
  const mesh = useRef<THREE.Mesh>(null)
  const glowMesh = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  // Pre-allocate scratch vectors — no heap allocation inside useFrame
  const _point = useRef(new THREE.Vector3())
  const _ahead = useRef(new THREE.Vector3())

  useFrame((_state, delta) => {
    uniforms.uTime.value += delta
    if (!mesh.current) return

    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1)
    curve.getPoint(p, _point.current)
    mesh.current.position.copy(_point.current)

    // Orient sphere toward travel direction
    curve.getPoint(THREE.MathUtils.clamp(p + 0.006, 0, 1), _ahead.current)
    mesh.current.lookAt(_ahead.current)

    // Subtle size pulse
    const pulse = Math.sin(uniforms.uTime.value * 3.2) * 0.025 + 1.0
    mesh.current.scale.setScalar(pulse)

    if (glowMesh.current) {
      glowMesh.current.position.copy(_point.current)
      glowMesh.current.scale.setScalar(pulse * 1.55)
      const mat = glowMesh.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.08 + Math.sin(uniforms.uTime.value * 2.1) * 0.03
    }
  })

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.3, 0.55, 1.0),
        transparent: true,
        opacity: 0.09,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  )

  return (
    <>
      {/* Glow halo (backside slightly larger sphere) */}
      <mesh ref={glowMesh} material={glowMat}>
        {/* 24×24 is visually identical to 44×44 at this scale */}
        <sphereGeometry args={[0.44, 24, 24]} />
      </mesh>
      {/* Main UV sphere — 32×32 saves ~75% triangles vs 64×64, imperceptible diff */}
      <mesh ref={mesh}>
        <sphereGeometry args={[0.44, 32, 32]} />
        <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} />
      </mesh>
    </>
  )
}
