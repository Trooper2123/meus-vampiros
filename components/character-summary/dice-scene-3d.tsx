'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type Die = { value: number; hunger: boolean; key: string }

function makeD10Geometry() {
  const vertices = [new THREE.Vector3(0, 0.88, 0), new THREE.Vector3(0, -0.88, 0)]
  const ring = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * 0.68, i % 2 === 0 ? 0.16 : -0.16, Math.sin(angle) * 0.68)
  })
  const points: number[] = []
  for (let i = 0; i < ring.length; i++) {
    const next = ring[(i + 1) % ring.length]
    for (const vertex of [ring[i], vertices[0], next, next, vertices[1], ring[i]]) {
      points.push(vertex.x, vertex.y, vertex.z)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  geometry.computeVertexNormals()
  return geometry
}

function AnimatedDie({ die, position, geometry, edgeGeometry }: { die: Die; position: [number, number, number]; geometry: THREE.BufferGeometry; edgeGeometry: THREE.EdgesGeometry }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const throwMotion = useRef({ ready: false, offsetX: 0, offsetZ: 5, startHeight: 3, lift: 2, angularVelocity: new THREE.Vector3() })
  const motion = useRef({ launched: false, landed: false, bounces: 0, velocity: new THREE.Vector3() })
  useEffect(() => {
    const throwData = throwMotion.current
    throwData.offsetX = (Math.random() - 0.5) * 5
    throwData.offsetZ = 4 + Math.random() * 2
    throwData.startHeight = 3 + Math.random()
    throwData.lift = 1.5 + Math.random() * 2
    throwData.angularVelocity.set(
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 24,
    )
    throwData.ready = true
  }, [])
  const color = useMemo(() => {
    const token = die.hunger ? '--primary' : '--card'
    return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(token).trim())
  }, [die.hunger])
  const edgeColor = useMemo(() => {
    const token = die.hunger ? '--primary-foreground' : '--muted-foreground'
    return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(token).trim())
  }, [die.hunger])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const throwData = throwMotion.current
    if (!mesh || !throwData.ready) return
    const frameDelta = Math.min(delta, 0.05)
    const state = motion.current
    if (!state.launched) {
      mesh.position.set(position[0] + throwData.offsetX, throwData.startHeight, position[2] + throwData.offsetZ)
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      state.velocity.set(-throwData.offsetX * 1.7, throwData.lift, -throwData.offsetZ * 1.5)
      state.launched = true
    }

    if (!state.landed) {
      state.velocity.y -= 22 * frameDelta
      mesh.position.addScaledVector(state.velocity, frameDelta)
      if (mesh.position.y <= position[1] + 0.82) {
        mesh.position.y = position[1] + 0.82
        if (state.velocity.y < -1 && state.bounces < 2) {
          state.velocity.y = -state.velocity.y * 0.32
          state.velocity.x *= 0.72
          state.velocity.z *= 0.72
          throwData.angularVelocity.multiplyScalar(0.62)
          state.bounces++
        } else {
          state.velocity.y = 0
          state.landed = true
        }
      }
    } else {
      const friction = Math.exp(-3.5 * frameDelta)
      state.velocity.x *= friction
      state.velocity.z *= friction
      throwData.angularVelocity.multiplyScalar(Math.exp(-3 * frameDelta))
    }

    mesh.rotation.x += throwData.angularVelocity.x * frameDelta
    mesh.rotation.y += throwData.angularVelocity.y * frameDelta
    mesh.rotation.z += throwData.angularVelocity.z * frameDelta
  })

  return <mesh ref={meshRef} geometry={geometry} position={position} scale={1.4} castShadow>
    <meshStandardMaterial color={color} roughness={0.2} metalness={0.15} flatShading />
    <lineSegments geometry={edgeGeometry}>
      <lineBasicMaterial color={edgeColor} />
    </lineSegments>
  </mesh>
}

export function DiceScene3D({ dice, onSkip }: Readonly<{ dice: Die[]; onSkip: () => void }>) {
  const geometry = useMemo(() => makeD10Geometry(), [])
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 15), [geometry])
  const floorColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--background').trim()), [])
  const columns = Math.min(dice.length, 6)
  const rows = Math.ceil(dice.length / columns)
  const [isShaking, setIsShaking] = useState(false)
  useEffect(() => {
    const start = window.setTimeout(() => setIsShaking(true), 150)
    const stop = window.setTimeout(() => setIsShaking(false), 450)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(stop)
    }
  }, [])

  return <div className={`fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-background/35 ${isShaking ? 'motion-safe:animate-shake' : ''}`}>
    <button type="button" className="button-ghost absolute right-4 top-4 z-10" onClick={onSkip}>Pular animação</button>
    <div className="h-full w-full" aria-hidden="true">
      <Canvas shadows camera={{ position: [0, 12, 20], fov: 50 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[5, 8, 5]} intensity={1.8} castShadow />
        <directionalLight position={[-5, 5, -2]} intensity={0.4} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color={floorColor} transparent opacity={0.35} roughness={0.95} />
        </mesh>
        {dice.map((die, index) => <AnimatedDie
          key={die.key}
          die={die}
          geometry={geometry}
          edgeGeometry={edgeGeometry}
          position={[
            (index % columns - (columns - 1) / 2) * 2.2,
            0,
            (Math.floor(index / columns) - (rows - 1) / 2) * 1.7,
          ]}
        />)}
      </Canvas>
    </div>
  </div>
}
