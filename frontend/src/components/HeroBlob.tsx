import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshDistortMaterial, Sphere } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Animated distort blob that reacts to mouse position.
 * Slow base distort + mouse-driven intensity spike on hover.
 */
function Blob() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)
  const { mouse } = useThree()

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return

    const t = state.clock.getElapsedTime()

    // Slow idle rotation
    meshRef.current.rotation.x = Math.sin(t * 0.18) * 0.15
    meshRef.current.rotation.y = t * 0.12

    // Mouse-driven distort intensity
    const mouseInfluence = Math.sqrt(mouse.x ** 2 + mouse.y ** 2)
    materialRef.current.distort = THREE.MathUtils.lerp(
      materialRef.current.distort,
      0.35 + mouseInfluence * 0.25,
      0.04
    )

    // Subtle scale pulse
    const scale = 1 + Math.sin(t * 0.6) * 0.03
    meshRef.current.scale.setScalar(scale)
  })

  return (
    <Sphere ref={meshRef} args={[1, 128, 128]}>
      <MeshDistortMaterial
        ref={materialRef}
        color="#7c3aed"
        attach="material"
        distort={0.35}
        speed={1.8}
        roughness={0.1}
        metalness={0.05}
        transparent
        opacity={0.18}
      />
    </Sphere>
  )
}

/**
 * Full-screen Three.js canvas with the hero blob.
 * Rendered behind all content via absolute positioning.
 */
export function HeroBlob() {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} color="#a78bfa" />
        <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#818cf8" />
        <Blob />
      </Canvas>
    </div>
  )
}
