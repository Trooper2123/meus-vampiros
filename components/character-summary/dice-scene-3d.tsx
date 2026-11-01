'use client'

import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { useMemo } from 'react'
import * as THREE from 'three'

type Die = { value: number; hunger: boolean; key: string }

function makeD10Geometry() {
  // Corpo fechado com dez vértices equatoriais alternados, adequado ao casco convexo.
  const vertices: number[] = []
  const top = new THREE.Vector3(0, 0.88, 0)
  const bottom = new THREE.Vector3(0, -0.88, 0)
  const ring = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * 0.68, i % 2 === 0 ? 0.16 : -0.16, Math.sin(angle) * 0.68)
  })
  for (let i = 0; i < 10; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % 10]
    for (const tri of [[a, top, b], [b, bottom, a]]) {
      for (const p of tri) vertices.push(p.x, p.y, p.z)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  return geometry
}

function DieBody({ index, hunger, geometry }: { index: number; hunger: boolean; geometry: THREE.BufferGeometry }) {
  const column = index % 6
  const row = Math.floor(index / 6)
  return <RigidBody colliders="hull" restitution={0.42} friction={0.65} linearDamping={0.65} angularDamping={0.9}
    position={[(column - 2.5) * 1.22, 4 + row * 1.4 + index * 0.15, (index % 3 - 1) * 1.1]}
    rotation={[index * 0.61, index * 0.43, index * 0.29]}>
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={hunger ? '#9f2024' : '#242229'} metalness={0.25} roughness={0.38} flatShading />
    </mesh>
  </RigidBody>
}

export function DiceScene3D({ dice }: Readonly<{ dice: Die[] }>) {
  const geometry = useMemo(() => makeD10Geometry(), [])
  return <div className="h-64 w-full overflow-hidden rounded border border-border bg-background" aria-hidden="true">
    <Canvas shadows camera={{ position: [0, 10, 16], fov: 46 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'low-power' }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 10, 6]} intensity={2.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Physics gravity={[0, -15, 0]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[9, 0.3, 6]} position={[0, -0.4, 0]} />
          <CuboidCollider args={[0.3, 2, 6]} position={[-9, 1.5, 0]} />
          <CuboidCollider args={[0.3, 2, 6]} position={[9, 1.5, 0]} />
          <CuboidCollider args={[9, 2, 0.3]} position={[0, 1.5, -6]} />
          <CuboidCollider args={[9, 2, 0.3]} position={[0, 1.5, 6]} />
        </RigidBody>
        <mesh position={[0, -0.72, 0]} receiveShadow>
          <boxGeometry args={[18, 0.25, 12]} />
          <meshStandardMaterial color="#151519" roughness={0.95} />
        </mesh>
        {dice.map((die, index) => <DieBody key={die.key} index={index} hunger={die.hunger} geometry={geometry} />)}
      </Physics>
    </Canvas>
  </div>
}
