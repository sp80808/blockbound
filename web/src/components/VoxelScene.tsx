import React, { useMemo, useRef } from 'react';
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

  useFrame(({ clock }, delta) => {
    const token = groupRef.current;
    if (!token) return;
    const dx = targetPos[0] - token.position.x;
    const dz = targetPos[2] - token.position.z;
    const distance = Math.hypot(dx, dz);
    const easing = 1 - Math.exp(-13 * delta);
    token.position.x = THREE.MathUtils.lerp(token.position.x, targetPos[0], easing);
    token.position.z = THREE.MathUtils.lerp(token.position.z, targetPos[2], easing);
    // Tiny tactile hop per tile. Never influences the logical board position.
    token.position.y = 0.4 + (distance > 0.08 ? Math.abs(Math.sin(clock.elapsedTime * 18)) * 0.4 : 0);
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

// Six consistent face numbers. Opposite faces total seven.
const DIE_FACES: Array<{
  value: number;
  position: [number, number, number];
  rotation: [number, number, number];
}> = [
  { value: 1, position: [0, 0, 0.755], rotation: [0, 0, 0] },
  { value: 6, position: [0, 0, -0.755], rotation: [0, Math.PI, 0] },
  { value: 2, position: [0, 0.755, 0], rotation: [-Math.PI / 2, 0, 0] },
  { value: 5, position: [0, -0.755, 0], rotation: [Math.PI / 2, 0, 0] },
  { value: 3, position: [0.755, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { value: 4, position: [-0.755, 0, 0], rotation: [0, -Math.PI / 2, 0] }
];

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-0.33, 0.33], [0.33, -0.33]],
  3: [[-0.33, 0.33], [0, 0], [0.33, -0.33]],
  4: [[-0.33, 0.33], [0.33, 0.33], [-0.33, -0.33], [0.33, -0.33]],
  5: [[-0.33, 0.33], [0.33, 0.33], [0, 0], [-0.33, -0.33], [0.33, -0.33]],
  6: [[-0.33, 0.38], [0.33, 0.38], [-0.33, 0], [0.33, 0], [-0.33, -0.38], [0.33, -0.38]]
};

const FACE_NORMALS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 0, 1),
  2: new THREE.Vector3(0, 1, 0),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  5: new THREE.Vector3(0, -1, 0),
  6: new THREE.Vector3(0, 0, -1)
};
const UP = new THREE.Vector3(0, 1, 0);

function DieFace({ face }: { face: typeof DIE_FACES[number] }) {
  return (
    <group position={face.position} rotation={face.rotation}>
      {(PIPS[face.value] || []).map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.018]}>
          <sphereGeometry args={[0.113, 10, 8]} />
          <meshStandardMaterial color="#172033" roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function DieBody({ value, isRolling, index }: { value: number; isRolling: boolean; index: number }) {
  const diceRef = useRef<THREE.Group>(null);
  const targetQuaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[value] || FACE_NORMALS[1], UP),
    [value]
  );

  useFrame(({ clock }, delta) => {
    const die = diceRef.current;
    if (!die) return;
    if (isRolling) {
      die.rotation.x += delta * (11 + index);
      die.rotation.y += delta * (14 + index * 2);
      die.rotation.z += delta * 7;
      die.position.y = 1.1 + Math.abs(Math.sin(clock.elapsedTime * 10 + index)) * 1.7;
    } else {
      die.quaternion.slerp(targetQuaternion, 1 - Math.exp(-11 * delta));
      die.position.y = THREE.MathUtils.damp(die.position.y, 1.0, 9, delta);
    }
  });

  return (
    <group ref={diceRef} position={[index === 0 ? -1.4 : 1.4, 1, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#fff9e5" roughness={0.36} metalness={0.05} />
      </mesh>
      {DIE_FACES.map(face => <DieFace key={face.value} face={face} />)}
    </group>
  );
}

function PhysicalDice() {
  const isRolling = useGameStore(s => s.isRolling);
  const lastRoll = useGameStore(s => s.lastRoll);
  return (
    <group>
      <DieBody index={0} value={lastRoll?.die1 ?? 3} isRolling={isRolling} />
      <DieBody index={1} value={lastRoll?.die2 ?? 4} isRolling={isRolling} />
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
