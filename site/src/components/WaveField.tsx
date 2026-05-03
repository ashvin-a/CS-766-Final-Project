import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;

void main() {
  vec2 p = vUv * 3.5 - 1.75;
  float r  = length(p + vec2(0.2, -0.3));
  float r2 = length(p - vec2(0.35, 0.15));

  // Three overlapping wave families: linear, radial, diagonal
  float w1 = sin(p.x * 4.8 + uTime * 0.28) * cos(p.y * 3.6 + uTime * 0.21);
  float w2 = sin(r  * 8.5  + uTime * 0.36);
  float w3 = sin(r2 * 11.0 - uTime * 0.30);
  float w4 = sin((p.x + p.y * 1.3) * 5.8 + uTime * 0.32);

  float field = (w1 * 0.5 + w2 * 0.35 + w3 * 0.3 + w4 * 0.4) * 0.018;

  // Very subtle blue-grey tint on white
  vec3 ink = vec3(0.12, 0.20, 0.42);
  vec3 col = vec3(1.0) + ink * field;

  // Feather out toward edges so it blends into fog
  float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x)
             * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
  col = mix(vec3(1.0), col, edge);

  gl_FragColor = vec4(col, 1.0);
}
`

export function WaveField() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  return (
    /* Large flat plane just below the beacon level. Tilted very slightly so
       perspective makes the waves read as a receding floor. */
    <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[90, 90, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  )
}
