import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Compute 32 perimeter coordinates
const boardStep = 2.4;
const halfBoard = 4 * boardStep;
const TILE_POSITIONS: [number, number, number][] = [];

for (let i = 0; i < 32; i++) {
  let x = 0, z = 0;
  if (i >= 0 && i <= 8) {
    x = -halfBoard + i * boardStep;
    z = -halfBoard;
  } else if (i > 8 && i <= 16) {
    x = halfBoard;
    z = -halfBoard + (i - 8) * boardStep;
  } else if (i > 16 && i <= 24) {
    x = halfBoard - (i - 16) * boardStep;
    z = halfBoard;
  } else {
    x = -halfBoard;
    z = halfBoard - (i - 24) * boardStep;
  }
  TILE_POSITIONS.push([x, 0, z]);
}

const TILE_COLORS = [
  0x10b981, 0xf59e0b, 0xec4899, 0xf59e0b, 0x06b6d4, 0xf59e0b, 0xef4444, 0xeab308,
  0x8b5cf6, 0xf59e0b, 0xf97316, 0xec4899, 0xf59e0b, 0x06b6d4, 0xf59e0b, 0x6366f1,
  0xd946ef, 0xf59e0b, 0xef4444, 0xec4899, 0xf59e0b, 0xeab308, 0x8b5cf6, 0xf59e0b,
  0xf97316, 0xf59e0b, 0x06b6d4, 0xec4899, 0xf59e0b, 0xef4444, 0x6366f1, 0xf59e0b
];

function VoxelBoard() {
  return (
    <group>
      {TILE_POSITIONS.map((pos, idx) => (
        <mesh key={idx} position={pos} receiveShadow castShadow>
          <boxGeometry args={[2.1, 0.5, 2.1]} />
          <meshLambertMaterial color={TILE_COLORS[idx]} />
        </mesh>
      ))}

      {/* Courtyard Floor */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[16.5, 0.3, 16.5]} />
        <meshLambertMaterial color={0x1e293b} />
      </mesh>
    </group>
  );
}

function TokenCharacter() {
  const currentTile = useGameStore(s => s.currentTile);
  const targetPos = TILE_POSITIONS[currentTile] || [0, 0, 0];
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPos[0], 0.15);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetPos[2], 0.15);
      groupRef.current.position.y = 0.4;
    }
  });

  return (
    <group ref={groupRef} position={[targetPos[0], 0.4, targetPos[2]]}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshLambertMaterial color={0xf97316} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshLambertMaterial color={0xfed7aa} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[0.8, 0.3, 0.8]} />
        <meshLambertMaterial color={0xfacc15} />
      </mesh>
    </group>
  );
}

const PLOT_COORDS: [number, number, number][] = [
  [0, 0, 0],
  [-4, 0, -2],
  [4, 0, -2],
  [-4, 0, 2],
  [4, 0, 2]
];

function Buildings() {
  const currentDistrict = useGameStore(s => s.currentDistrict);
  const dist = useGameStore(s => s.districts[currentDistrict]);

  return (
    <group>
      {dist.buildings.map((b, idx) => {
        const [px, , pz] = PLOT_COORDS[idx];
        return (
          <group key={b.id} position={[px, 0, pz]}>
            {b.tier === 0 && (
              <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[0.8, 0.1, 0.8]} />
                <meshLambertMaterial color={0x38bdf8} />
              </mesh>
            )}
            {b.tier >= 1 && (
              <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[1.8, 1.2, 1.8]} />
                <meshLambertMaterial color={b.damaged ? 0xef4444 : 0xfbbf24} />
              </mesh>
            )}
            {b.tier >= 2 && (
              <mesh position={[0, 1.8, 0]} castShadow>
                <boxGeometry args={[1.5, 1.2, 1.5]} />
                <meshLambertMaterial color={0xfef08a} />
              </mesh>
            )}
            {b.tier >= 3 && (
              <mesh position={[0, 2.7, 0]} castShadow>
                <boxGeometry args={[1.7, 0.6, 1.7]} />
                <meshLambertMaterial color={0x2563eb} />
              </mesh>
            )}
            {b.tier >= 4 && (
              <mesh position={[0, 3.4, 0]} castShadow>
                <boxGeometry args={[0.5, 0.8, 0.5]} />
                <meshLambertMaterial color={0xfacc15} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function PhysicalDice() {
  const isRolling = useGameStore(s => s.isRolling);
  const die1Ref = useRef<THREE.Mesh>(null);
  const die2Ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (isRolling) {
      if (die1Ref.current) {
        die1Ref.current.rotation.x += delta * 12;
        die1Ref.current.rotation.y += delta * 15;
        die1Ref.current.position.y = 2.5 + Math.sin(Date.now() * 0.01) * 0.8;
      }
      if (die2Ref.current) {
        die2Ref.current.rotation.y += delta * 14;
        die2Ref.current.rotation.z += delta * 10;
        die2Ref.current.position.y = 2.5 + Math.cos(Date.now() * 0.01) * 0.8;
      }
    } else {
      if (die1Ref.current) die1Ref.current.position.y = 1.0;
      if (die2Ref.current) die2Ref.current.position.y = 1.0;
    }
  });

  return (
    <group>
      <mesh ref={die1Ref} position={[-1.4, 1.0, 0]} castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshLambertMaterial color={0xfffbeb} />
      </mesh>
      <mesh ref={die2Ref} position={[1.4, 1.0, 0]} castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshLambertMaterial color={0xfffbeb} />
      </mesh>
    </group>
  );
}

export function VoxelScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [22, 28, 22], fov: 45 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[16, 32, 16]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <VoxelBoard />
      <TokenCharacter />
      <Buildings />
      <PhysicalDice />
      <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={14} maxDistance={50} />
    </Canvas>
  );
}
