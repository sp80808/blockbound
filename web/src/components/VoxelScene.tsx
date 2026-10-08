import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { BOARD_TILES, type TileKind } from '../game/rollRules';

// Compute 32 perimeter coordinates
const boardStep = 2.4;
const halfBoard = 4 * boardStep;
export const TILE_POSITIONS: [number, number, number][] = [];

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

const IMPORTANT_TILES = new Set<TileKind>(['go', 'raid', 'heist', 'jackpot', 'mystery', 'district']);
const CORNERS = new Set([0, 8, 16, 24]);

function reducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Readable 3D glyph per tile kind — 2-3 cheap meshes each. */
function TileGlyph({ kind }: { kind: TileKind }) {
  const disc = (
    <mesh receiveShadow>
      <cylinderGeometry args={[0.43, 0.43, 0.1, 12]} />
      <meshStandardMaterial color="#20314c" roughness={0.58} />
    </mesh>
  );
  switch (kind) {
    case 'go':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.12, 0.75, 0.12]} />
            <meshStandardMaterial color="#e8eef7" roughness={0.5} />
          </mesh>
          <mesh position={[0.3, 0.62, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.06]} />
            <meshStandardMaterial color="#10b981" roughness={0.5} />
          </mesh>
          <mesh position={[0.3, 0.62, 0.045]}>
            <boxGeometry args={[0.12, 0.3, 0.02]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
        </group>
      );
    case 'coin-small':
    case 'coin-medium':
    case 'coin-large': {
      const stacks = kind === 'coin-small' ? 1 : kind === 'coin-medium' ? 2 : 3;
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          {Array.from({ length: stacks }, (_, i) => (
            <mesh key={i} position={[(i - (stacks - 1) / 2) * 0.34, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.14, kind === 'coin-large' ? 0.3 : 0.2, 10]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.45} roughness={0.3} />
            </mesh>
          ))}
        </group>
      );
    }
    case 'materials':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[-0.14, 0.13, 0]} castShadow>
            <boxGeometry args={[0.3, 0.2, 0.3]} />
            <meshStandardMaterial color="#f472b6" roughness={0.6} />
          </mesh>
          <mesh position={[0.16, 0.28, 0.05]} castShadow>
            <boxGeometry args={[0.3, 0.2, 0.3]} />
            <meshStandardMaterial color="#fb9ec9" roughness={0.6} />
          </mesh>
        </group>
      );
    case 'shield':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[0, 0.3, 0]} castShadow>
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial color="#06b6d4" emissive="#0e7490" emissiveIntensity={0.45} roughness={0.3} />
          </mesh>
        </group>
      );
    case 'energy':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[0, 0.32, 0]} castShadow>
            <coneGeometry args={[0.24, 0.5, 4]} />
            <meshStandardMaterial color="#fde047" emissive="#a16207" emissiveIntensity={0.4} flatShading />
          </mesh>
        </group>
      );
    case 'raid':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh rotation={[0, 0, Math.PI / 4]} position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.62, 0.12, 0.12]} />
            <meshStandardMaterial color="#ef4444" roughness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]} position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.62, 0.12, 0.12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
        </group>
      );
    case 'heist':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[0, 0.26, 0]} castShadow>
            <boxGeometry args={[0.5, 0.42, 0.28]} />
            <meshStandardMaterial color="#8b5cf6" roughness={0.45} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.26, 0.16]}>
            <cylinderGeometry args={[0.09, 0.09, 0.06, 10]} />
            <meshStandardMaterial color="#fde68a" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      );
    case 'mystery':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.44, 0.34, 0.44]} />
            <meshStandardMaterial color="#f97316" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.5, 0.1, 0.5]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.5} />
          </mesh>
        </group>
      );
    case 'district':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.44, 0.3, 0.4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <coneGeometry args={[0.36, 0.26, 4]} />
            <meshStandardMaterial color="#6366f1" roughness={0.55} flatShading />
          </mesh>
        </group>
      );
    case 'jackpot':
      return (
        <group position={[0, 0.335, 0]}>
          {disc}
          <mesh position={[0, 0.34, 0]} castShadow>
            <octahedronGeometry args={[0.32]} />
            <meshStandardMaterial color="#fde047" emissive="#b45309" emissiveIntensity={0.55} flatShading />
          </mesh>
        </group>
      );
    default:
      return <group position={[0, 0.335, 0]}>{disc}</group>;
  }
}

/** Expanding shockwave ring where the token lands. */
function LandingPulse() {
  const pulse = useGameStore(s => s.landingPulse);
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const anim = useRef({ t: 1, key: -1 });
  useFrame((_, delta) => {
    const ring = ringRef.current;
    const mat = matRef.current;
    if (!ring || !mat) return;
    if (pulse && pulse.key !== anim.current.key) {
      anim.current = { t: 0, key: pulse.key };
    }
    if (anim.current.t >= 1) {
      ring.visible = false;
      return;
    }
    anim.current.t = Math.min(1, anim.current.t + delta * (reducedMotion() ? 3 : 1.4));
    const t = anim.current.t;
    const pos = TILE_POSITIONS[pulse?.tile ?? 0] ?? [0, 0, 0];
    ring.visible = true;
    ring.position.set(pos[0], 0.45, pos[2]);
    const s = 0.8 + t * 2.6;
    ring.scale.set(s, s, s);
    mat.opacity = 0.85 * (1 - t);
  });
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.72, 0.9, 28]} />
      <meshBasicMaterial ref={matRef} color="#fff7c2" side={THREE.DoubleSide} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

const TREE_SPOTS: ReadonlyArray<[number, number, number]> = [
  [-6.8, -5.6, 1.1], [-6.3, 5.7, 0.75], [6.1, 5.3, 1.1],
  [6.7, -5.4, 0.9], [-2.5, 5.1, 1], [2.2, 5.1, 0.75]
];

function MiniTree({ x, z, scale }: { x: number; z: number; scale: number }) {
  return (
    <group position={[x, 0.06, z]} scale={scale}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 0.9, 6]} />
        <meshStandardMaterial color="#9b6744" />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <coneGeometry args={[0.75, 1.7, 5]} />
        <meshStandardMaterial color="#3aa885" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <coneGeometry args={[0.52, 1.1, 5]} />
        <meshStandardMaterial color="#73ce93" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

function LampPost({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 1.1, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#fef9c3" emissive="#ca8a04" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function VoxelBoard() {
  const currentTile = useGameStore(state => state.visualTile);
  const isRolling = useGameStore(state => state.isRolling);
  return (
    <group>
      {/* Floating, grassy toy-world foundation. */}
      <mesh position={[0, -0.65, 0]} receiveShadow>
        <boxGeometry args={[24, 1.05, 24]} />
        <meshStandardMaterial color="#345f66" roughness={0.86} />
      </mesh>
      <mesh position={[0, -0.085, 0]} receiveShadow>
        <boxGeometry args={[19.2, 0.13, 19.2]} />
        <meshStandardMaterial color="#7bb6a0" roughness={0.91} />
      </mesh>
      {/* A subtle cross of cobblestones helps the centre read as a town. */}
      <mesh position={[0, -0.009, 0]} receiveShadow>
        <boxGeometry args={[2.15, 0.09, 16.4]} />
        <meshStandardMaterial color="#d4c8b3" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.004, 0]} receiveShadow>
        <boxGeometry args={[16.4, 0.09, 1.9]} />
        <meshStandardMaterial color="#d4c8b3" roughness={0.95} />
      </mesh>

      {TILE_POSITIONS.map((pos, idx) => {
        const kind = BOARD_TILES[idx];
        const isCurrent = idx === currentTile;
        const isCorner = CORNERS.has(idx);
        return (
          <group key={idx} position={pos}>
            {/* Chunky, but not monolithic: dark border / coloured face / token marker. */}
            <mesh position={[0, -0.13, 0]} receiveShadow>
              <boxGeometry args={[2.21, 0.42, 2.21]} />
              <meshStandardMaterial color="#263956" roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.02, 0]} receiveShadow castShadow>
              <boxGeometry args={[2.08, 0.37, 2.08]} />
              <meshStandardMaterial color={TILE_COLORS[idx]} roughness={0.68} />
            </mesh>
            {IMPORTANT_TILES.has(kind) && (
              <mesh position={[0, 0.235, 0]}>
                <boxGeometry args={[1.83, 0.05, 1.83]} />
                <meshStandardMaterial color={kind === 'jackpot' ? '#fef08a' : '#e6eeff'} transparent opacity={0.35} />
              </mesh>
            )}
            <TileGlyph kind={kind} />
            {isCorner && (
              <mesh position={[0, 1.35, 0]} castShadow>
                <boxGeometry args={[0.22, 1.1, 0.22]} />
                <meshStandardMaterial
                  color={kind === 'jackpot' ? '#fde047' : kind === 'go' ? '#34d399' : '#f8fafc'}
                  emissive={kind === 'jackpot' ? '#b45309' : '#000000'}
                  emissiveIntensity={kind === 'jackpot' ? 0.5 : 0}
                />
              </mesh>
            )}
            {isCurrent && !isRolling && (
              <mesh position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.72, 0.89, 24]} />
                <meshBasicMaterial color="#fffac8" side={THREE.DoubleSide} transparent opacity={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
      {TREE_SPOTS.map(([x, z, scale], i) => <MiniTree key={i} x={x} z={z} scale={scale} />)}
      <LampPost x={-1.6} z={-1.6} />
      <LampPost x={1.6} z={1.6} />
      <LampPost x={-1.6} z={1.6} />
      <LampPost x={1.6} z={-1.6} />
      <LandingPulse />
    </group>
  );
}

/** Toy builder token: boots, overalls, head, helmet + backpack. Hops tile to tile. */
function TokenCharacter() {
  const currentTile = useGameStore(s => s.visualTile);
  const targetPos = TILE_POSITIONS[currentTile] || [0, 0, 0];
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const token = groupRef.current;
    if (!token) return;
    const dx = targetPos[0] - token.position.x;
    const dz = targetPos[2] - token.position.z;
    const distance = Math.hypot(dx, dz);
    const calm = reducedMotion();
    const easing = calm ? 1 : 1 - Math.exp(-13 * delta);
    token.position.x = THREE.MathUtils.lerp(token.position.x, targetPos[0], easing);
    token.position.z = THREE.MathUtils.lerp(token.position.z, targetPos[2], easing);
    if (distance > 0.05) {
      token.rotation.y = Math.atan2(dx, dz);
    }
    const hop = calm || distance <= 0.08 ? 0 : Math.abs(Math.sin(clock.elapsedTime * 18)) * 0.4;
    token.position.y = 0.4 + hop;
    if (bodyRef.current && !calm) {
      const squash = distance > 0.08 ? 1 + Math.sin(clock.elapsedTime * 18) * 0.04 : 1;
      bodyRef.current.scale.set(1, squash, 1);
    }
  });

  return (
    <group ref={groupRef} position={[targetPos[0], 0.4, targetPos[2]]}>
      {/* Soft blob shadow */}
      <mesh position={[0, -0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.62, 20]} />
        <meshBasicMaterial color="#0b1526" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <group ref={bodyRef}>
        <mesh position={[-0.22, 0.15, 0]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.42]} />
          <meshStandardMaterial color="#7c4a2d" roughness={0.8} />
        </mesh>
        <mesh position={[0.22, 0.15, 0]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.42]} />
          <meshStandardMaterial color="#7c4a2d" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[0.8, 0.85, 0.62]} />
          <meshStandardMaterial color="#f97316" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.75, -0.4]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.22]} />
          <meshStandardMaterial color="#8b5cf6" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[0.66, 0.62, 0.6]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.65} />
        </mesh>
        <mesh position={[-0.18, 1.52, 0.31]}>
          <boxGeometry args={[0.12, 0.12, 0.05]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.18, 1.52, 0.31]}>
          <boxGeometry args={[0.12, 0.12, 0.05]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 1.95, 0]} castShadow>
          <boxGeometry args={[0.8, 0.28, 0.72]} />
          <meshStandardMaterial color="#facc15" roughness={0.55} />
        </mesh>
        <mesh position={[0, 2.12, 0]} castShadow>
          <boxGeometry args={[0.4, 0.18, 0.36]} />
          <meshStandardMaterial color="#facc15" roughness={0.55} />
        </mesh>
      </group>
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

const BUILDING_COLOURS = [
  { wall: '#dfefef', roof: '#4075a9', trim: '#e7c877' },
  { wall: '#ffd5ac', roof: '#d96567', trim: '#f6b95c' },
  { wall: '#e2ffe0', roof: '#6a9b70', trim: '#f4c78b' },
  { wall: '#f5deb0', roof: '#b88b6d', trim: '#dfc697' },
  { wall: '#cbeaf0', roof: '#76b8c3', trim: '#e5caff' }
];

/** Golden construction glint that flashes over an upgraded plot. */
function BuildGlint({ plot }: { plot: number }) {
  const pulse = useGameStore(s => s.buildPulse);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const anim = useRef({ t: 1, key: -1 });
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    if (pulse && pulse.plot === plot && pulse.key !== anim.current.key) {
      anim.current = { t: 0, key: pulse.key };
    }
    if (anim.current.t >= 1) {
      mesh.visible = false;
      return;
    }
    anim.current.t = Math.min(1, anim.current.t + delta * 1.6);
    const t = anim.current.t;
    mesh.visible = true;
    const s = 0.6 + t * 2.2;
    mesh.scale.set(s, s, s);
    mat.opacity = 0.75 * (1 - t);
  });
  const [x, , z] = PLOT_COORDS[plot] ?? [0, 0, 0];
  return (
    <mesh ref={meshRef} position={[x, 2.2, z]} visible={false}>
      <sphereGeometry args={[0.7, 14, 10]} />
      <meshStandardMaterial
        ref={matRef}
        color="#fde68a"
        emissive="#b45309"
        emissiveIntensity={0.9}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

function WindmillBlades({ y }: { y: number }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!blades.current || reducedMotion()) return;
    blades.current.rotation.z += delta * 1.4;
  });
  return (
    <group ref={blades} position={[0, y, 1.05]}>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map(a => (
        <mesh key={a} rotation={[0, 0, a]} position={[Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0]} castShadow>
          <boxGeometry args={[1.5, 0.28, 0.1]} />
          <meshStandardMaterial color="#e9f4dc" roughness={0.7} />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.24, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
    </group>
  );
}

function BakerySmoke({ y }: { y: number }) {
  const puffs = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = puffs.current;
    if (!g || reducedMotion()) return;
    const t = clock.elapsedTime;
    g.children.forEach((child, i) => {
      const phase = (t * 0.5 + i / 3) % 1;
      child.position.y = y + phase * 1.6;
      child.position.x = 0.6 + Math.sin(t * 1.5 + i * 2) * 0.12;
      const s = 0.14 + phase * 0.2;
      child.scale.set(s, s, s);
    });
  });
  return (
    <group ref={puffs}>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0.6, y, -0.3]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function DamageBoards() {
  return (
    <group position={[0, 0.9, 0.95]}>
      <mesh rotation={[0, 0, Math.PI / 5]}>
        <boxGeometry args={[1.6, 0.22, 0.08]} />
        <meshStandardMaterial color="#991b1b" roughness={0.8} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 5]}>
        <boxGeometry args={[1.6, 0.22, 0.08]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function BuildingPlot({ plot, buildingId, tier, damaged }: { plot: number; buildingId: string; tier: number; damaged: boolean }) {
  const [x, , z] = PLOT_COORDS[plot] ?? [0, 0, 0];
  const palette = BUILDING_COLOURS[plot % BUILDING_COLOURS.length];
  const group = useRef<THREE.Group>(null);
  const pop = useRef({ t: 1, lastTier: tier });
  const height = 0.95 + Math.max(0, tier - 1) * 0.36;

  useEffect(() => {
    if (pop.current.lastTier !== tier) {
      pop.current = { t: 0, lastTier: tier };
    }
  }, [tier]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    if (pop.current.t < 1 && !reducedMotion()) {
      pop.current.t = Math.min(1, pop.current.t + delta * 2.2);
      const t = pop.current.t;
      const overshoot = 1 + Math.sin(t * Math.PI) * 0.12;
      g.scale.set(overshoot, 1 - (overshoot - 1) * 0.6, overshoot);
    } else {
      g.scale.set(1, 1, 1);
    }
    if (damaged) {
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0.045, 0.1);
    } else {
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, 0.2);
    }
  });

  const isTownhall = buildingId === 'b_townhall';
  const isBakery = buildingId === 'b_bakery';
  const isWindmill = plot === 3;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[3.1, 0.14, 3.1]} />
        <meshStandardMaterial color={damaged ? '#b96d6e' : '#b8c9b7'} roughness={0.9} />
      </mesh>
      {tier === 0 && (
        <group>
          <mesh position={[0, 0.19, 0]}>
            <boxGeometry args={[1.45, 0.18, 1.45]} />
            <meshStandardMaterial color="#6a8e91" />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.16, 6]} />
            <meshStandardMaterial color="#f9dc86" />
          </mesh>
          <mesh position={[0.75, 0.5, 0.75]} castShadow>
            <boxGeometry args={[0.12, 0.7, 0.12]} />
            <meshStandardMaterial color="#8b6f47" />
          </mesh>
          <mesh position={[0.75, 0.78, 0.75]}>
            <boxGeometry args={[0.5, 0.32, 0.06]} />
            <meshStandardMaterial color="#f6c453" roughness={0.6} />
          </mesh>
        </group>
      )}
      {tier > 0 && plot === 4 && (
        <group>
          <mesh position={[0, 0.29, 0]}>
            <cylinderGeometry args={[1.05, 1.05, 0.23, 12]} />
            <meshStandardMaterial color="#a0d3b5" />
          </mesh>
          <mesh position={[0, 0.57, 0]}>
            <cylinderGeometry args={[0.61, 0.66, 0.38, 12]} />
            <meshStandardMaterial color="#e4f0ff" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.93, 0]}>
            <sphereGeometry args={[0.2, 12, 9]} />
            <meshStandardMaterial color="#8ae5ef" emissive="#217d95" emissiveIntensity={0.3} />
          </mesh>
          {tier >= 2 && <MiniTree x={-1.08} z={0.9} scale={0.55} />}
          {tier >= 3 && <MiniTree x={1.08} z={-0.9} scale={0.65} />}
          {tier >= 4 && <LampPost x={0} z={-1.15} />}
        </group>
      )}
      {tier > 0 && plot !== 4 && (
        <group ref={group}>
          <mesh position={[0, 0.17 + height / 2, 0]} castShadow>
            <boxGeometry args={[1.88, height, 1.78]} />
            <meshStandardMaterial color={damaged ? '#d77972' : palette.wall} roughness={0.83} />
          </mesh>
          <mesh position={[0, 0.18 + height, 0]} castShadow>
            <coneGeometry args={[1.37, 0.92, 4]} />
            <meshStandardMaterial color={palette.roof} roughness={0.78} flatShading />
          </mesh>
          <mesh position={[0, 0.46, 0.92]}>
            <boxGeometry args={[0.47, 0.8, 0.1]} />
            <meshStandardMaterial color="#405572" roughness={0.6} />
          </mesh>
          <mesh position={[-0.58, 0.85, 0.915]}>
            <boxGeometry args={[0.31, 0.32, 0.08]} />
            <meshStandardMaterial color="#8bdbf0" emissive="#35769b" emissiveIntensity={0.15} />
          </mesh>
          <mesh position={[0.58, 0.85, 0.915]}>
            <boxGeometry args={[0.31, 0.32, 0.08]} />
            <meshStandardMaterial color="#8bdbf0" emissive="#35769b" emissiveIntensity={0.15} />
          </mesh>
          {tier >= 2 && (
            <mesh position={[0, 0.17 + height / 2, -0.96]} castShadow>
              <boxGeometry args={[0.95, height * 0.62, 0.4]} />
              <meshStandardMaterial color={palette.trim} roughness={0.8} />
            </mesh>
          )}
          {isTownhall && tier >= 2 && (
            <group position={[0, 0, 0]}>
              <mesh position={[0, 0.6 + height + 0.5, -0.4]} castShadow>
                <boxGeometry args={[0.5, 1.1, 0.5]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.75 + height + 0.5, -0.12]}>
                <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.4} />
              </mesh>
            </group>
          )}
          {isBakery && tier >= 2 && (
            <group>
              <mesh position={[0, 1.05, 1.15]}>
                <boxGeometry args={[1.9, 0.12, 0.6]} />
                <meshStandardMaterial color="#f6b95c" roughness={0.7} />
              </mesh>
              <mesh position={[0.6, 1.5 + height * 0.4, -0.5]} castShadow>
                <boxGeometry args={[0.34, 1.1, 0.34]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.7} />
              </mesh>
              <BakerySmoke y={2.1 + height * 0.4} />
            </group>
          )}
          {tier >= 3 && (
            <mesh position={[0, 0.45 + height + 0.32, 0]} castShadow>
              <boxGeometry args={[0.7, 0.7, 0.7]} />
              <meshStandardMaterial color={palette.trim} metalness={0.15} />
            </mesh>
          )}
          {tier >= 4 && (
            <mesh position={[0, 0.95 + height + 0.35, 0]} castShadow>
              <sphereGeometry args={[0.25, 10, 8]} />
              <meshStandardMaterial color="#ffe28c" emissive="#b8892d" emissiveIntensity={0.35} />
            </mesh>
          )}
          {isWindmill && tier >= 2 && <WindmillBlades y={1.1 + height} />}
          {damaged && <DamageBoards />}
        </group>
      )}
      <BuildGlint plot={plot} />
    </group>
  );
}

function Buildings() {
  const districtId = useGameStore(state => state.currentDistrict);
  const dist = useGameStore(state => state.districts[districtId]);

  if (!dist) return null;

  return (
    <group>
      {dist.buildings.map((building, idx) => (
        <BuildingPlot
          key={building.id}
          plot={idx}
          buildingId={building.id}
          tier={building.tier}
          damaged={building.damaged}
        />
      ))}
    </group>
  );
}

/** Slow-drifting toy clouds. Static when reduced motion is on. */
function Clouds() {
  const group = useRef<THREE.Group>(null);
  const clouds = useMemo(
    () => [
      { x: -12, y: 11.5, z: -6, s: 1.4, speed: 0.35 },
      { x: 4, y: 13, z: -10, s: 1.9, speed: 0.22 },
      { x: 10, y: 12, z: 7, s: 1.2, speed: 0.3 },
      { x: -6, y: 13.5, z: 9, s: 1.6, speed: 0.26 }
    ],
    []
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (reducedMotion()) return;
    const t = clock.elapsedTime;
    g.children.forEach((child, i) => {
      const c = clouds[i % clouds.length];
      child.position.x = c.x + Math.sin(t * c.speed * 0.4 + i * 1.7) * 3;
      child.position.y = c.y + Math.sin(t * 0.5 + i) * 0.25;
    });
  });
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          <mesh>
            <boxGeometry args={[2.4, 0.8, 1.4]} />
            <meshStandardMaterial color="#f1f8ff" roughness={1} transparent opacity={0.92} />
          </mesh>
          <mesh position={[0.9, 0.35, 0]}>
            <boxGeometry args={[1.4, 0.7, 1.1]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
          </mesh>
          <mesh position={[-1, 0.3, 0.1]}>
            <boxGeometry args={[1.2, 0.6, 1]} />
            <meshStandardMaterial color="#e6f1fb" roughness={1} transparent opacity={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Tiny villagers wandering the plaza cross. */
function Villagers() {
  const group = useRef<THREE.Group>(null);
  const walkers = useMemo(
    () => [
      { cx: 0, cz: -3.4, rx: 4.5, rz: 0.5, speed: 0.35, phase: 0, color: '#38bdf8' },
      { cx: 0, cz: 3.4, rx: 4.5, rz: 0.5, speed: 0.28, phase: 2.1, color: '#f472b6' },
      { cx: -3.4, cz: 0, rx: 0.5, rz: 4.5, speed: 0.32, phase: 4.2, color: '#a3e635' }
    ],
    []
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const calm = reducedMotion();
    walkers.forEach((w, i) => {
      const child = g.children[i];
      if (!child) return;
      const tt = calm ? w.phase : t * w.speed + w.phase;
      child.position.set(w.cx + Math.sin(tt) * w.rx, 0.35 + (calm ? 0 : Math.abs(Math.sin(t * 6 + i)) * 0.08), w.cz + Math.cos(tt * 0.9) * w.rz);
      child.rotation.y = Math.atan2(Math.cos(tt) * w.rx, -Math.sin(tt * 0.9) * w.rz);
    });
  });
  return (
    <group ref={group}>
      {walkers.map((w, i) => (
        <group key={i} position={[w.cx, 0.35, w.cz]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.34, 0.5, 0.3]} />
            <meshStandardMaterial color={w.color} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.68, 0]} castShadow>
            <boxGeometry args={[0.3, 0.3, 0.28]} />
            <meshStandardMaterial color="#ffdfb8" roughness={0.65} />
          </mesh>
        </group>
      ))}
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
  const innerRef = useRef<THREE.Group>(null);
  const targetQuaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[value] || FACE_NORMALS[1], UP),
    [value]
  );

  useFrame(({ clock }, delta) => {
    const die = diceRef.current;
    const inner = innerRef.current;
    if (!die || !inner) return;
    if (isRolling) {
      die.rotation.x += delta * (11 + index);
      die.rotation.y += delta * (14 + index * 2);
      die.rotation.z += delta * 7;
      die.position.y = 1.1 + Math.abs(Math.sin(clock.elapsedTime * 10 + index)) * 1.7;
      inner.scale.set(1, 1, 1);
    } else {
      die.quaternion.slerp(targetQuaternion, 1 - Math.exp(-11 * delta));
      const settled = 1 - Math.exp(-9 * delta);
      die.position.y = THREE.MathUtils.damp(die.position.y, 1.0, 9, delta);
      // Settle squash: brief wide-then-tall ease after tumbling stops.
      const s = inner.scale.x + (1 - inner.scale.x) * settled;
      inner.scale.set(s, 2 - s > 0.6 ? 2 - s : 1, s);
      inner.scale.y = THREE.MathUtils.clamp(inner.scale.y, 0.86, 1.08);
    }
  });

  return (
    <group ref={diceRef} position={[index === 0 ? -1.4 : 1.4, 1, 0]}>
      <group ref={innerRef}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#fff9e5" roughness={0.36} metalness={0.05} />
        </mesh>
        {DIE_FACES.map(face => <DieFace key={face.value} face={face} />)}
      </group>
      {/* Blob shadow grounds the dice in the toy world */}
      <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 18]} />
        <meshBasicMaterial color="#0b1526" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function PhysicalDice() {
  const isRolling = useGameStore(s => s.isDiceAnimating);
  const lastRoll = useGameStore(s => s.lastRoll);
  return (
    <group>
      <DieBody index={0} value={lastRoll?.die1 ?? 3} isRolling={isRolling} />
      <DieBody index={1} value={lastRoll?.die2 ?? 4} isRolling={isRolling} />
    </group>
  );
}

// Keep the cinematic dice-focus and token-follow states introduced on main.
// Orbit controls are disabled only during the brief scripted focus.
function CinematicCamera() {
  const mode = useGameStore(s => s.cameraMode);
  const tile = useGameStore(s => s.visualTile);
  const { camera, size } = useThree();
  const destination = useRef(new THREE.Vector3(0, 0, 0));
  useEffect(() => {
    if (mode !== 'OVERVIEW' || !(camera instanceof THREE.OrthographicCamera)) return;
    camera.position.set(26, 34, 26);
    camera.lookAt(0, 0, 0);
    camera.zoom = Math.max(5.5, Math.min(size.width / 33.5, size.height / 24));
    camera.updateProjectionMatrix();
    destination.current.set(0, 0, 0);
  }, [camera, mode, size.width, size.height]);

  useFrame((_, delta) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    if (mode === 'OVERVIEW') return;
    const settle = 1 - Math.exp(-8 * delta);
    const target = mode === 'DICE_FOCUS'
      ? new THREE.Vector3(0, 2, 0)
      : new THREE.Vector3(...(TILE_POSITIONS[tile] || [0, 0, 0]));
    destination.current.lerp(target, settle);
    const offset = mode === 'DICE_FOCUS'
      ? new THREE.Vector3(11, 15, 11)
      : new THREE.Vector3(17, 22, 17);
    camera.position.lerp(target.clone().add(offset), settle);
    camera.lookAt(destination.current);
    const baseZoom = Math.max(5.5, Math.min(size.width / 33.5, size.height / 24));
    const focusZoom = mode === 'DICE_FOCUS' ? Math.min(baseZoom * 1.6, 28) : Math.min(baseZoom * 1.12, 24);
    camera.zoom = THREE.MathUtils.damp(camera.zoom, focusZoom, 8, delta);
    camera.updateProjectionMatrix();
  });
  return null;
}

function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    // Reserve breathing room for the diamond-shaped board at narrow aspect ratios.
    camera.zoom = Math.max(5.5, Math.min(size.width / 33.5, size.height / 24));
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export function VoxelScene() {
  const mode = useGameStore(s => s.cameraMode);
  return (
    <Canvas
      shadows
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [26, 34, 26], zoom: 12, near: 0.1, far: 180 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
    >
      <CameraFit />
      <CinematicCamera />
      <fog attach="fog" args={['#101f3a', 55, 120]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ddf5ff', '#496b5a', 0.62]} />
      <directionalLight
        position={[-18, 34, 23]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[20, 14, -18]} intensity={0.35} color="#bcd7ff" />
      <VoxelBoard />
      <TokenCharacter />
      <Buildings />
      <Villagers />
      <Clouds />
      <PhysicalDice />
      <OrbitControls
        enabled={mode === 'OVERVIEW'}
        target={[0, 0, 0]}
        enablePan={false}
        enableRotate
        minPolarAngle={Math.PI / 4.2}
        maxPolarAngle={Math.PI / 2.5}
        minZoom={6}
        maxZoom={38}
        enableDamping
        dampingFactor={0.1}
      />
    </Canvas>
  );
}
