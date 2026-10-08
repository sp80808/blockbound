import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { BOARD_TILES, type TileKind } from '../game/rollRules';

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

// Tile markings provide actual legible gameplay affordances instead of 32 anonymous boxes.
const IMPORTANT_TILES = new Set<TileKind>(['go', 'raid', 'heist', 'jackpot', 'mystery', 'district']);

function TileEmblem({ kind }: { kind: TileKind }) {
  const colour =
    kind === 'go' ? '#7df4b0' :
    kind === 'raid' ? '#ff8080' :
    kind === 'heist' ? '#c4a7ff' :
    kind === 'energy' ? '#ffe075' :
    kind === 'shield' ? '#89e8f9' :
    kind === 'materials' ? '#ff9ad4' :
    kind === 'jackpot' ? '#fff1a5' :
    kind === 'district' ? '#bcb1ff' :
    kind === 'mystery' ? '#ffbf8a' : '#ffdc79';

  return (
    <group position={[0, 0.335, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.43, 0.43, 0.10, 12]} />
        <meshStandardMaterial color="#20314c" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.042, 12]} />
        <meshStandardMaterial color={colour} roughness={0.35} metalness={0.1} />
      </mesh>
      {(kind === 'raid' || kind === 'heist') && (
        <mesh rotation={[0, Math.PI / 4, 0]} position={[0, 0.13, 0]}>
          <boxGeometry args={[0.45, 0.08, 0.13]} />
          <meshStandardMaterial color={kind === 'raid' ? '#fff1f1' : '#fff2c1'} />
        </mesh>
      )}
      {kind === 'energy' && (
        <mesh position={[0, 0.24, 0]}>
          <coneGeometry args={[0.22, 0.34, 4]} />
          <meshStandardMaterial color="#fff0a1" emissive="#7b5904" emissiveIntensity={0.25} />
        </mesh>
      )}
    </group>
  );
}

const TREE_SPOTS: ReadonlyArray<[number, number, number]> = [
  [-6.8, -5.6, 1.1], [-6.3, 5.7, .75], [6.1, 5.3, 1.1],
  [6.7, -5.4, .9], [-2.5, 5.1, 1], [2.2, 5.1, .75]
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

function VoxelBoard() {
  const currentTile = useGameStore(state => state.currentTile);
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
            <TileEmblem kind={kind} />
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

const BUILDING_COLOURS = [
  { wall: '#dfefef', roof: '#4075a9', trim: '#e7c877' },
  { wall: '#ffd5ac', roof: '#d96567', trim: '#f6b95c' },
  { wall: '#e2ffe0', roof: '#6a9b70', trim: '#f4c78b' },
  { wall: '#f5deb0', roof: '#b88b6d', trim: '#dfc697' },
  { wall: '#cbeaf0', roof: '#76b8c3', trim: '#e5caff' }
];

function Buildings() {
  const districtId = useGameStore(state => state.currentDistrict);
  const dist = useGameStore(state => state.districts[districtId]);

  if (!dist) return null;

  return (
    <group>
      {dist.buildings.map((building, idx) => {
        const [x, , z] = PLOT_COORDS[idx];
        const palette = BUILDING_COLOURS[idx % BUILDING_COLOURS.length];
        const tier = building.tier;
        const height = 0.95 + (tier - 1) * 0.36;
        const isPark = idx === 4;
        return (
          <group key={building.id} position={[x, 0, z]}>
            <mesh position={[0, 0.05, 0]} receiveShadow>
              <boxGeometry args={[3.1, 0.14, 3.1]} />
              <meshStandardMaterial color={building.damaged ? '#b96d6e' : '#b8c9b7'} roughness={0.9} />
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
              </group>
            )}
            {tier > 0 && isPark && (
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
              </group>
            )}
            {tier > 0 && !isPark && (
              <group>
                <mesh position={[0, 0.17 + height / 2, 0]} castShadow>
                  <boxGeometry args={[1.88, height, 1.78]} />
                  <meshStandardMaterial color={building.damaged ? '#d77972' : palette.wall} roughness={0.83} />
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
                {tier >= 3 && (
                  <mesh position={[0, 0.45 + height + .32, 0]} castShadow>
                    <boxGeometry args={[.7, .7, .7]} />
                    <meshStandardMaterial color={palette.trim} metalness={0.15} />
                  </mesh>
                )}
                {tier >= 4 && (
                  <mesh position={[0, 0.95 + height + .35, 0]} castShadow>
                    <sphereGeometry args={[0.25, 10, 8]} />
                    <meshStandardMaterial color="#ffe28c" emissive="#b8892d" emissiveIntensity={0.35} />
                  </mesh>
                )}
                {idx === 3 && tier >= 2 && (
                  <group position={[0, 0.9 + height, 1.08]}>
                    <mesh rotation={[0, 0, Math.PI / 4]}>
                      <boxGeometry args={[1.8, 0.15, 0.15]} />
                      <meshStandardMaterial color="#e9f4dc" />
                    </mesh>
                    <mesh rotation={[0, 0, -Math.PI / 4]}>
                      <boxGeometry args={[1.8, 0.15, 0.15]} />
                      <meshStandardMaterial color="#e9f4dc" />
                    </mesh>
                  </group>
                )}
              </group>
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

// Keep the cinematic dice-focus and token-follow states introduced on main.
// Orbit controls are disabled only during the brief scripted focus.
function CinematicCamera() {
  const mode = useGameStore(s => s.cameraMode);
  const tile = useGameStore(s => s.currentTile);
  const { camera, size } = useThree();
  const destination = useRef(new THREE.Vector3(0, 0, 0));

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
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ddf5ff', '#496b5a', 0.62]} />
      <directionalLight
        position={[-18, 34, 23]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <VoxelBoard />
      <TokenCharacter />
      <Buildings />
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
