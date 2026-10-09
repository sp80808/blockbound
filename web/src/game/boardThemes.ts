export interface DistrictBoardTheme {
  foundationColor: string;
  groundColor: string;
  pathColor: string;
  tilePedestalColor: string;
  tileCornerPillarColor: string;
  treeTrunk: string;
  treeFoliageLower: string;
  treeFoliageUpper: string;
  lampPost: string;
  lampBulb: string;
  lampEmissive: string;
  lampIntensity: number;
  cloudMain: string;
  cloudFluff1: string;
  cloudFluff2: string;
  villagerColors: string[];
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientColor: string;
  ambientIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  fillColor: string;
  fillIntensity: number;
  beaconColor: string;
}

export const DISTRICT_BOARD_THEMES: readonly DistrictBoardTheme[] = [
  // District 0: Sunny Suburb — lush verdant lawn, rustic stone paths, fresh foliage, warm daylight
  {
    foundationColor: '#345f66',
    groundColor: '#7bb6a0',
    pathColor: '#d4c8b3',
    tilePedestalColor: '#263956',
    tileCornerPillarColor: '#263956',
    treeTrunk: '#9b6744',
    treeFoliageLower: '#3aa885',
    treeFoliageUpper: '#73ce93',
    lampPost: '#334155',
    lampBulb: '#fef9c3',
    lampEmissive: '#ca8a04',
    lampIntensity: 0.7,
    cloudMain: '#f1f8ff',
    cloudFluff1: '#ffffff',
    cloudFluff2: '#e6f1fb',
    villagerColors: ['#38bdf8', '#f472b6', '#a3e635'],
    fogColor: '#101f3a',
    fogNear: 55,
    fogFar: 120,
    ambientColor: '#ffffff',
    ambientIntensity: 0.85,
    hemiSky: '#ddf5ff',
    hemiGround: '#496b5a',
    hemiIntensity: 0.62,
    sunColor: '#ffffff',
    sunIntensity: 1.7,
    fillColor: '#bcd7ff',
    fillIntensity: 0.35,
    beaconColor: '#fff1a8'
  },
  // District 1: Candy Harbour — pastel strawberry icing lawn, waffle foundation, powdered sugar paths, marshmallow trees, warm dusk/dawn pink
  {
    foundationColor: '#78354c',
    groundColor: '#f48db6',
    pathColor: '#fff1f6',
    tilePedestalColor: '#651d45',
    tileCornerPillarColor: '#db2777',
    treeTrunk: '#fbcfe8',
    treeFoliageLower: '#f472b6',
    treeFoliageUpper: '#c084fc',
    lampPost: '#e11d48',
    lampBulb: '#fff1f2',
    lampEmissive: '#fb7185',
    lampIntensity: 0.95,
    cloudMain: '#fce7f3',
    cloudFluff1: '#fdf2f8',
    cloudFluff2: '#fae8ff',
    villagerColors: ['#ec4899', '#f43f5e', '#a855f7'],
    fogColor: '#4a044e',
    fogNear: 50,
    fogFar: 115,
    ambientColor: '#ffe4e6',
    ambientIntensity: 0.95,
    hemiSky: '#fdf2f8',
    hemiGround: '#831843',
    hemiIntensity: 0.72,
    sunColor: '#fff1f2',
    sunIntensity: 1.8,
    fillColor: '#fbcfe8',
    fillIntensity: 0.45,
    beaconColor: '#fbcfe8'
  },
  // District 2: Neon Metropolis — dark cyber asphalt & obsidian alloy foundation, neon cyber-circuit paths, holographic laser foliage, midnight synthwave lighting
  {
    foundationColor: '#0f0d1e',
    groundColor: '#1a1738',
    pathColor: '#082f49',
    tilePedestalColor: '#15112e',
    tileCornerPillarColor: '#06b6d4',
    treeTrunk: '#1e1b4b',
    treeFoliageLower: '#06b6d4',
    treeFoliageUpper: '#d946ef',
    lampPost: '#0b0a14',
    lampBulb: '#22d3ee',
    lampEmissive: '#06b6d4',
    lampIntensity: 1.8,
    cloudMain: '#241242',
    cloudFluff1: '#3b0764',
    cloudFluff2: '#1e1b4b',
    villagerColors: ['#06b6d4', '#ec4899', '#a855f7'],
    fogColor: '#060412',
    fogNear: 45,
    fogFar: 105,
    ambientColor: '#7c3aed',
    ambientIntensity: 0.65,
    hemiSky: '#06b6d4',
    hemiGround: '#3b0764',
    hemiIntensity: 0.7,
    sunColor: '#818cf8',
    sunIntensity: 1.35,
    fillColor: '#f43f5e',
    fillIntensity: 0.8,
    beaconColor: '#67e8f9'
  }
];

export function getDistrictBoardTheme(districtId: number): DistrictBoardTheme {
  const idx = Math.abs(districtId) % DISTRICT_BOARD_THEMES.length;
  return DISTRICT_BOARD_THEMES[idx] ?? DISTRICT_BOARD_THEMES[0];
}

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

