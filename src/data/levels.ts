import {
  LEVEL_HEIGHT_TILES,
  TOTAL_LEVELS,
  MOVING_PLATFORM_LEVEL_START,
  PROJECTILE_LEVEL_START,
  LATE_GAME_EASE_START,
  WIDTH_IN_TILES,
  GRID,
  HORIZONTAL_WRAP_SPEED,
  HORIZONTAL_WRAP_LEVELS,
  HORIZONTAL_WRAP_MIN_PLATFORM_TILES,
  HORIZONTAL_WRAP_MAX_PLATFORM_TILES,
  PLATFORM_WALL_MARGIN,
  MAX_VERTICAL_JUMP_GAP_TILES,
  TOWER_MAX_PLATFORM_TILES,
} from '../config/constants';

export type TileRect = {
  x: number;
  y: number;
  w: number;
  /** horizontalWrap only — 1 = scroll with level flow, -1 = counter-scroll */
  scrollDir?: 1 | -1;
  /** Keep the authored width — skip the tower max-width clamp */
  exactW?: boolean;
};

/** Vertical wall inside a room — solid, supports wall-slide & wall-jump */
export type WallRect = {
  x: number;
  /** Top tile row — wall extends downward */
  y: number;
  /** Height in tiles */
  h: number;
  /** Width in tiles (default 1) */
  w?: number;
};

export type MovingPlatformDef = {
  x: number;
  y: number;
  w: number;
  axis: 'x' | 'y';
  rangeTiles: number;
  speed: number;
  phase: number;
};

export type ProjectileSpawnerDef = {
  x: number;
  y: number;
  direction: 1 | -1;
  intervalMs: number;
  speed: number;
};

export type LevelMode = 'tower' | 'horizontalWrap';

export type LevelDefinition = {
  level: number;
  widthInTiles: number;
  heightInTiles: number;
  mode?: LevelMode;
  /** Pixels per second — horizontalWrap levels only */
  scrollSpeed?: number;
  floors: number[];
  platforms: TileRect[];
  /** Interior vertical walls (hand-designed levels) */
  walls?: WallRect[];
  /** Keep authored platform positions — reachability only inserts helpers */
  lockPlatforms?: boolean;
  movingPlatforms: MovingPlatformDef[];
  projectileSpawners: ProjectileSpawnerDef[];
};

const REFERENCE_HEIGHT_TILES = 10;
const REFERENCE_WIDTH_TILES = 10;
const REFERENCE_GROUND_ROW = REFERENCE_HEIGHT_TILES - 1;

function scaleXRef(value: number): number {
  return Math.round((value * WIDTH_IN_TILES) / REFERENCE_WIDTH_TILES);
}

function scaleYRef(value: number): number {
  return Math.round((value * LEVEL_HEIGHT_TILES) / REFERENCE_HEIGHT_TILES);
}

const REF_PLATFORM_W = 2;

type RefPlatform = { x: number; y: number; w?: number; exactW?: boolean };

/** Author platforms on the reference grid (mix sizes & positions freely) */
function p(...tiles: RefPlatform[]): TileRect[] {
  return tiles.map((tile) => ({
    x: tile.x,
    y: tile.y,
    w: tile.w ?? REF_PLATFORM_W,
    ...(tile.exactW ? { exactW: true } : {}),
  }));
}

function clampTowerPlatformWidth(widthTiles: number): number {
  return Math.max(2, Math.min(TOWER_MAX_PLATFORM_TILES, widthTiles));
}

function scalePlatformWidth(refWidth: number): number {
  return clampTowerPlatformWidth(scaleXRef(refWidth));
}

/** Platforms this low near a wall create inescapable pits */
const LOW_SHELF_ROW = scaleYRef(REFERENCE_HEIGHT_TILES - 3);

function scaleLayoutFromReference<
  T extends Omit<LevelDefinition, 'level' | 'widthInTiles' | 'heightInTiles'>,
>(layout: T): T {
  return {
    ...layout,
    floors: layout.floors.map(scaleYRef),
    platforms: layout.platforms.map((platform) => ({
      x: scaleXRef(platform.x),
      y: scaleYRef(platform.y),
      w: platform.exactW
        ? scaleXRef(platform.w)
        : scalePlatformWidth(platform.w),
      ...(platform.exactW ? { exactW: true } : {}),
      ...(platform.scrollDir !== undefined
        ? { scrollDir: platform.scrollDir }
        : {}),
    })),
    walls: layout.walls?.map((wall) => ({
      ...wall,
      x: scaleXRef(wall.x),
      y: scaleYRef(wall.y),
      h: scaleYRef(wall.h),
    })),
    movingPlatforms: layout.movingPlatforms.map((def) => ({
      ...def,
      x: scaleXRef(def.x),
      y: scaleYRef(def.y),
      w: scalePlatformWidth(def.w),
      rangeTiles: Math.max(
        2,
        def.axis === 'x' ? scaleXRef(def.rangeTiles) : scaleYRef(def.rangeTiles)
      ),
    })),
    projectileSpawners: layout.projectileSpawners.map((spawner) => ({
      ...spawner,
      y: scaleYRef(spawner.y),
    })),
  };
}

function clampTile(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizePlatform(
  platform: TileRect,
  roomWidthTiles: number
): TileRect | null {
  const minX = PLATFORM_WALL_MARGIN;
  const maxX = roomWidthTiles - PLATFORM_WALL_MARGIN;

  let { x, y, w } = platform;
  const maxW = platform.exactW ? maxX : TOWER_MAX_PLATFORM_TILES;
  x = clampTile(x, minX, maxX - 2);
  w = Math.max(2, Math.min(maxW, Math.min(w, maxX - x)));
  if (x + w > maxX) {
    w = maxX - x;
  }
  if (w < 2) {
    return null;
  }

  const leftGap = x - minX;
  const rightGap = maxX - (x + w);
  if (y >= LOW_SHELF_ROW && (leftGap < 2 || rightGap < 2)) {
    return null;
  }

  return { x, y, w };
}

function sanitizePlatforms(
  platforms: TileRect[],
  roomWidthTiles: number
): TileRect[] {
  return platforms
    .map((p) => sanitizePlatform(p, roomWidthTiles))
    .filter((p): p is TileRect => p !== null);
}

function sanitizeMovingPlatform(
  def: MovingPlatformDef,
  roomWidthTiles: number
): MovingPlatformDef {
  const minX = PLATFORM_WALL_MARGIN;
  const maxX = roomWidthTiles - PLATFORM_WALL_MARGIN;
  let { x, w } = def;
  x = clampTile(x, minX, maxX - 2);
  w = Math.max(2, Math.min(TOWER_MAX_PLATFORM_TILES, Math.min(w, maxX - x)));
  if (x + w > maxX) {
    w = maxX - x;
  }
  return { ...def, x, w };
}

function applyLayoutSafety<
  T extends Omit<LevelDefinition, 'level' | 'widthInTiles' | 'heightInTiles'>,
>(layout: T, roomWidthTiles: number): T {
  return {
    ...layout,
    platforms: sanitizePlatforms(layout.platforms, roomWidthTiles),
    movingPlatforms: layout.movingPlatforms.map((def) =>
      sanitizeMovingPlatform(def, roomWidthTiles)
    ),
  };
}

type ClimbSurface = {
  y: number;
  kind: 'floor' | 'platform';
  platformIndex?: number;
};

function enforceVerticalReachability<
  T extends Omit<LevelDefinition, 'level' | 'widthInTiles' | 'heightInTiles'>,
>(layout: T, roomWidthTiles: number): T {
  const platforms = layout.platforms.map((platform) => ({ ...platform }));
  const maxGap = MAX_VERTICAL_JUMP_GAP_TILES;
  const minX = PLATFORM_WALL_MARGIN;
  const maxX = roomWidthTiles - PLATFORM_WALL_MARGIN;
  const stepW = 2;
  const leftStepX = minX;
  const rightStepX = minX + Math.floor((maxX - minX - stepW) / 2);

  const sortedSurfaceYs = (): number[] => {
    const ys = new Set<number>();
    for (const y of layout.floors) {
      ys.add(y);
    }
    for (const platform of platforms) {
      ys.add(platform.y);
    }
    return [...ys].sort((a, b) => b - a);
  };

  const collectSurfaces = (): ClimbSurface[] => [
    ...layout.floors.map((y) => ({ y, kind: 'floor' as const })),
    ...platforms.map((platform, platformIndex) => ({
      y: platform.y,
      kind: 'platform' as const,
      platformIndex,
    })),
  ];

  const movePasses = layout.lockPlatforms ? 0 : 12;
  for (let pass = 0; pass < movePasses; pass++) {
    const surfaces = collectSurfaces().sort((a, b) => b.y - a.y);
    let changed = false;

    for (let i = 1; i < surfaces.length; i++) {
      const below = surfaces[i - 1];
      const above = surfaces[i];
      const gap = below.y - above.y;
      if (gap <= maxGap) {
        continue;
      }

      if (above.kind === 'platform' && above.platformIndex !== undefined) {
        const newY = below.y - maxGap;
        if (platforms[above.platformIndex].y !== newY) {
          platforms[above.platformIndex].y = newY;
          changed = true;
        }
        continue;
      }

      if (below.kind === 'platform' && below.platformIndex !== undefined) {
        const newY = above.y + maxGap;
        if (platforms[below.platformIndex].y !== newY) {
          platforms[below.platformIndex].y = newY;
          changed = true;
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  for (let pass = 0; pass < 16; pass++) {
    const ys = sortedSurfaceYs();
    let inserted = false;

    for (let i = 1; i < ys.length; i++) {
      const gap = ys[i - 1] - ys[i];
      if (gap <= maxGap) {
        continue;
      }

      platforms.push({
        x: platforms.length % 2 === 0 ? leftStepX : rightStepX,
        y: ys[i - 1] - maxGap,
        w: stepW,
      });
      inserted = true;
      break;
    }

    if (!inserted) {
      break;
    }
  }

  return { ...layout, platforms };
}

function isEndgame(level: number): boolean {
  return level >= LATE_GAME_EASE_START;
}

function projectilePack(level: number, rows: number[]): ProjectileSpawnerDef[] {
  const tier = level - PROJECTILE_LEVEL_START;
  let speed = 140 + tier * 16;
  let intervalMs = Math.max(700, 2100 - tier * 110);

  if (isEndgame(level)) {
    speed *= 0.82;
    intervalMs = Math.max(950, intervalMs * 1.4);
  }

  return rows.map((y, i) => ({
    x: i % 2 === 0 ? PLATFORM_WALL_MARGIN : WIDTH_IN_TILES - PLATFORM_WALL_MARGIN - 1,
    y,
    direction: i % 2 === 0 ? 1 : (-1 as const),
    intervalMs: intervalMs * (i === 0 ? 1 : isEndgame(level) ? 1.22 : 1.15),
    speed: speed * (i === 0 ? 1 : isEndgame(level) ? 1.04 : 1.08),
  }));
}

function moving(
  x: number,
  y: number,
  w: number,
  level: number,
  axis: 'x' | 'y' = 'x',
  rangeTiles = 3
): MovingPlatformDef {
  const tier = level - MOVING_PLATFORM_LEVEL_START;
  const tierPenalty = isEndgame(level)
    ? Math.floor((tier - 4) / 6)
    : Math.floor(tier / 4);

  return {
    x,
    y,
    w,
    axis,
    rangeTiles: Math.max(2, rangeTiles - tierPenalty),
    speed: (0.85 + tier * 0.11) * (isEndgame(level) ? 0.78 : 1),
    phase: level * 0.65,
  };
}

/** Levels 1–9: dense lower levels — small/medium mix, always offset horizontally */
const EARLY_LAYOUTS: Omit<
  LevelDefinition,
  'level' | 'widthInTiles' | 'heightInTiles'
>[] = [
  /**
   * Level 1 — sketch draft: long shelf at upper-mid height with a wall
   * hanging from the ceiling down to the shelf's left end (Γ shape).
   * Small right-side step keeps the climb reachable.
   */
  {
    floors: [REFERENCE_GROUND_ROW, 0],
    platforms: p(
      { x: 2.5, y: 3, w: 5.5, exactW: true },
      { x: 8, y: 6, w: 2 }
    ),
    walls: [{ x: 2.5, y: 0, h: 3 }],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /**
   * Level 2 — sketch draft: two ceiling-hung walls form a wall-jump
   * chimney on the left; two stacked shelves on the right.
   */
  {
    floors: [0],
    platforms: p({ x: 6, y: 3, w: 2 }, { x: 6, y: 6, w: 2 }),
    walls: [
      { x: 2.5, y: 0, h: 8 },
      { x: 5, y: 0, h: 8 },
    ],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /** Level 3 — mirrored Γ: long shelf with end wall on the right */
  {
    floors: [0],
    platforms: p(
      { x: 2.5, y: 3.3, w: 4.2, exactW: true },
      { x: 1, y: 6.7, w: 2 }
    ),
    walls: [{ x: 6.7, y: 0, h: 3.3 }],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /** Level 4 — mirrored chimney: walls right, stacked shelves left */
  {
    floors: [0],
    platforms: p({ x: 1.5, y: 3, w: 2 }, { x: 1.5, y: 6, w: 2 }),
    walls: [
      { x: 4.2, y: 0, h: 8 },
      { x: 6.7, y: 0, h: 8 },
    ],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /** Level 5 — S-route: low shelf, Γ wall at its end, high shelf beyond */
  {
    floors: [0],
    platforms: p(
      { x: 1, y: 6, w: 4, exactW: true },
      { x: 5.5, y: 3.3, w: 4, exactW: true },
      { x: 4.2, y: 8, w: 2 }
    ),
    walls: [{ x: 4.8, y: 0, h: 6 }],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /** Level 6 — offset divider wall with a zig-zag ladder on the right */
  {
    floors: [0],
    platforms: p(
      { x: 4.2, y: 7, w: 2 },
      { x: 5.8, y: 5, w: 2 },
      { x: 4.2, y: 3, w: 2 },
      { x: 5.8, y: 1, w: 2 }
    ),
    walls: [{ x: 3, y: 0, h: 4 }],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /** Level 7 — Γ shelf like level 1, with the entry step on the right */
  {
    floors: [0],
    platforms: p(
      { x: 2.5, y: 3.3, w: 5.5, exactW: true },
      { x: 7.5, y: 6.7, w: 2 }
    ),
    walls: [{ x: 2.5, y: 0, h: 3.3 }],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /** Level 8 slot — unused (horizontal wrap level) */
  {
    floors: [0],
    platforms: p(
      { x: 3, y: 8, w: 2 },
      { x: 7, y: 8, w: 2 },
      { x: 2, y: 7, w: 2 },
      { x: 5, y: 6, w: 3 },
      { x: 7, y: 5, w: 2 },
      { x: 3, y: 4, w: 2 },
      { x: 6, y: 3, w: 2 },
      { x: 2, y: 2, w: 4 },
      { x: 5, y: 1, w: 2 },
      { x: 7, y: 1, w: 2 }
    ),
    movingPlatforms: [],
    projectileSpawners: [],
  },
  /** Level 9 — level-2-style chimney with staggered wall heights */
  {
    floors: [0],
    platforms: p({ x: 6, y: 2.7, w: 2 }, { x: 6, y: 6, w: 2 }),
    walls: [
      { x: 2.5, y: 0, h: 8 },
      { x: 5, y: 0, h: 6.7 },
    ],
    lockPlatforms: true,
    movingPlatforms: [],
    projectileSpawners: [],
  },
];

/** Levels 10–20: unique mixes of static, moving platforms & projectiles */
function buildLateLevel(level: number): Omit<
  LevelDefinition,
  'level' | 'widthInTiles' | 'heightInTiles'
> {
  const idx = level - MOVING_PLATFORM_LEVEL_START;
  const sw = REF_PLATFORM_W;

  switch (idx) {
    /** Level 10 — mirrored Γ shelf + low patrol platform */
    case 0:
      return {
        floors: [0],
        platforms: p(
          { x: 2.5, y: 3.3, w: 4.2, exactW: true },
          { x: 1, y: 6.7, w: 2 }
        ),
        walls: [{ x: 6.7, y: 0, h: 3.3 }],
        lockPlatforms: true,
        movingPlatforms: [moving(4, 8, sw, level, 'x', 3)],
        projectileSpawners: projectilePack(level, [5]),
      };
    /** Level 11 — offset divider wall + elevator bridging the ladder */
    case 1:
      return {
        floors: [0],
        platforms: p(
          { x: 4.2, y: 7, w: 2 },
          { x: 4.2, y: 3, w: 2 },
          { x: 5.8, y: 1, w: 2 }
        ),
        walls: [{ x: 3, y: 0, h: 4 }],
        lockPlatforms: true,
        movingPlatforms: [moving(5.8, 6, sw, level, 'y', 2)],
        projectileSpawners: projectilePack(level, [4, 7]),
      };
    /** Level 12 — mirrored chimney + low patrol platform */
    case 2:
      return {
        floors: [0],
        platforms: p({ x: 1.5, y: 3, w: 2 }, { x: 1.5, y: 6, w: 2 }),
        walls: [
          { x: 4.2, y: 0, h: 8 },
          { x: 6.7, y: 0, h: 8 },
        ],
        lockPlatforms: true,
        movingPlatforms: [moving(2.5, 8, sw, level, 'x', 2)],
        projectileSpawners: projectilePack(level, [3, 6]),
      };
    /** Level 13 — S-route + mid patrol between the shelves */
    case 3:
      return {
        floors: [0],
        platforms: p(
          { x: 1, y: 6, w: 4, exactW: true },
          { x: 5.5, y: 3.3, w: 4, exactW: true },
          { x: 4.2, y: 8, w: 2 }
        ),
        walls: [{ x: 4.8, y: 0, h: 6 }],
        lockPlatforms: true,
        movingPlatforms: [moving(2, 4.5, sw, level, 'x', 1)],
        projectileSpawners: projectilePack(level, [5, 8]),
      };
    case 4:
      return {
        floors: [0],
        platforms: p(
          { x: 3, y: 7, w: 4 },
          { x: 7, y: 6, w: 2 },
          { x: 2, y: 4, w: 2 },
          { x: 5, y: 3, w: 3 },
          { x: 3, y: 1, w: 2 }
        ),
        movingPlatforms: [
          moving(2, 5, sw, level, 'x', 3),
          moving(6, 2, sw, level, 'x', 2),
        ],
        projectileSpawners: projectilePack(level, [4, 6, 8]),
      };
    /** Level 15 — Γ shelf + elevator under the shelf's right half */
    case 5:
      return {
        floors: [0],
        platforms: p(
          { x: 2.5, y: 3.3, w: 5.5, exactW: true },
          { x: 7.5, y: 6.7, w: 2 }
        ),
        walls: [{ x: 2.5, y: 0, h: 3.3 }],
        lockPlatforms: true,
        movingPlatforms: [moving(5, 8, sw, level, 'y', 1.5)],
        projectileSpawners: projectilePack(level, [4, 7]),
      };
    /** Level 16 — staggered chimney + low patrol on the right */
    case 6:
      return {
        floors: [0],
        platforms: p({ x: 6, y: 2.7, w: 2 }, { x: 6, y: 6, w: 2 }),
        walls: [
          { x: 2.5, y: 0, h: 8 },
          { x: 5, y: 0, h: 8 },
        ],
        lockPlatforms: true,
        movingPlatforms: [moving(6.5, 8, sw, level, 'x', 1)],
        projectileSpawners: projectilePack(level, [5, 8]),
      };
    /** Level 17 — mirrored S-route + two movers */
    case 7:
      return {
        floors: [0],
        platforms: p(
          { x: 5, y: 6, w: 4, exactW: true },
          { x: 1, y: 3.3, w: 2.5, exactW: true },
          { x: 4.2, y: 8, w: 2 }
        ),
        walls: [{ x: 5.2, y: 0, h: 6 }],
        lockPlatforms: true,
        movingPlatforms: [
          moving(2, 5.5, sw, level, 'x', 1),
          moving(8, 3, sw, level, 'y', 1),
        ],
        projectileSpawners: projectilePack(level, [4, 7]),
      };
    /** Level 18 — mirrored divider wall + patrol mover */
    case 8:
      return {
        floors: [0],
        platforms: p(
          { x: 6.5, y: 6.7, w: 2 },
          { x: 4, y: 5, w: 2 },
          { x: 1, y: 3, w: 2 },
          { x: 4, y: 1, w: 2 }
        ),
        walls: [{ x: 6.5, y: 0, h: 4 }],
        lockPlatforms: true,
        movingPlatforms: [moving(2, 6, sw, level, 'x', 1)],
        projectileSpawners: projectilePack(level, [5, 8]),
      };
    /** Level 19 — center chimney entered from a low patrol platform */
    case 9:
      return {
        floors: [0],
        platforms: p({ x: 1, y: 5, w: 2 }, { x: 1, y: 2, w: 2 }),
        walls: [
          { x: 4, y: 0, h: 7 },
          { x: 6.7, y: 0, h: 7 },
        ],
        lockPlatforms: true,
        movingPlatforms: [moving(2, 8.5, sw, level, 'x', 1)],
        projectileSpawners: projectilePack(level, [4, 7, 9]),
      };
    /** Level 20 — finale: Γ shelf, mid climbing wall & left elevator */
    default:
      return {
        floors: [0],
        platforms: p(
          { x: 2.5, y: 3.3, w: 4, exactW: true },
          { x: 8, y: 6.7, w: 2 },
          { x: 4.5, y: 8, w: 2 }
        ),
        walls: [
          { x: 2.5, y: 0, h: 3.3 },
          { x: 6.5, y: 0, h: 5.3 },
        ],
        lockPlatforms: true,
        movingPlatforms: [
          moving(1, 6.5, sw, level, 'y', 1),
          moving(7, 8.5, sw, level, 'x', 0.5),
        ],
        projectileSpawners: projectilePack(level, [4, 7, 9]),
      };
  }
}

function buildHorizontalWrapLevel(level: number): LevelDefinition {
  /** Author wrap platforms on the 10-wide reference grid */
  const wp = (
    x: number,
    y: number,
    w: number,
    scrollDir: 1 | -1 = 1
  ): TileRect => ({ x, y, w, scrollDir });

  const refLayout = {
    floors: [0],
    platforms:
      level === 14
        ? [
            wp(0, 8, 4, 1),
            wp(5, 8, 2, -1),
            wp(8, 7, 3, 1),
            wp(1, 6, 2, -1),
            wp(4, 6, 4, 1),
            wp(0, 5, 3, -1),
            wp(6, 5, 2, 1),
            wp(9, 4, 2, -1),
            wp(2, 3, 3, 1),
            wp(7, 3, 2, -1),
            wp(0, 2, 4, 1),
            wp(5, 2, 2, -1),
            wp(8, 1, 3, 1),
            wp(1, 1, 2, -1),
          ]
        : [
            wp(0, 7, 3, 1),
            wp(4, 7, 2, -1),
            wp(7, 6, 4, 1),
            wp(1, 5, 2, 1),
            wp(5, 5, 3, -1),
            wp(9, 4, 2, 1),
            wp(0, 4, 3, -1),
            wp(4, 3, 2, 1),
            wp(7, 2, 4, -1),
            wp(2, 1, 3, 1),
            wp(6, 1, 2, -1),
          ],
    movingPlatforms: [] as MovingPlatformDef[],
    projectileSpawners: level === 14 ? projectilePack(level, [6]) : [],
  };

  const scaled = scaleHorizontalWrapLayout(refLayout);
  const safe = applyHorizontalWrapSafety(scaled, WIDTH_IN_TILES);
  const reachable = enforceVerticalReachability(safe, WIDTH_IN_TILES);

  return {
    level,
    mode: 'horizontalWrap',
    scrollSpeed: HORIZONTAL_WRAP_SPEED,
    widthInTiles: WIDTH_IN_TILES,
    heightInTiles: LEVEL_HEIGHT_TILES,
    ...reachable,
  };
}

function scaleWrapPlatformWidth(refWidth: number): number {
  const scaled = scaleXRef(refWidth);
  return Math.max(
    HORIZONTAL_WRAP_MIN_PLATFORM_TILES,
    Math.min(HORIZONTAL_WRAP_MAX_PLATFORM_TILES, scaled)
  );
}

function scaleHorizontalWrapLayout<
  T extends Omit<LevelDefinition, 'level' | 'widthInTiles' | 'heightInTiles'>,
>(layout: T): T {
  return {
    ...layout,
    floors: layout.floors.map(scaleYRef),
    platforms: layout.platforms.map((platform) => ({
      x: scaleXRef(platform.x),
      y: scaleYRef(platform.y),
      w: scaleWrapPlatformWidth(platform.w),
      ...(platform.scrollDir !== undefined
        ? { scrollDir: platform.scrollDir }
        : {}),
    })),
    movingPlatforms: layout.movingPlatforms,
    projectileSpawners: layout.projectileSpawners.map((spawner) => ({
      ...spawner,
      y: scaleYRef(spawner.y),
    })),
  };
}

function applyHorizontalWrapSafety<
  T extends Omit<LevelDefinition, 'level' | 'widthInTiles' | 'heightInTiles'>,
>(layout: T, roomWidthTiles: number): T {
  return {
    ...layout,
    platforms: layout.platforms
      .map((platform) => {
        let { x, w } = platform;
        w = Math.max(
          HORIZONTAL_WRAP_MIN_PLATFORM_TILES,
          Math.min(HORIZONTAL_WRAP_MAX_PLATFORM_TILES, w)
        );
        x = clampTile(x, 0, Math.max(0, roomWidthTiles - w));
        if (x + w > roomWidthTiles) {
          w = Math.max(HORIZONTAL_WRAP_MIN_PLATFORM_TILES, roomWidthTiles - x);
        }
        return { ...platform, x, w };
      })
      .filter((platform) => platform.w >= HORIZONTAL_WRAP_MIN_PLATFORM_TILES),
  };
}

function buildLevel(level: number): LevelDefinition {
  if ((HORIZONTAL_WRAP_LEVELS as readonly number[]).includes(level)) {
    return buildHorizontalWrapLevel(level);
  }

  const base =
    level < MOVING_PLATFORM_LEVEL_START
      ? EARLY_LAYOUTS[level - 1]
      : buildLateLevel(level);

  const scaled = scaleLayoutFromReference(base);
  const safe = applyLayoutSafety(scaled, WIDTH_IN_TILES);
  const reachable = enforceVerticalReachability(safe, WIDTH_IN_TILES);

  return {
    level,
    widthInTiles: WIDTH_IN_TILES,
    heightInTiles: LEVEL_HEIGHT_TILES,
    ...reachable,
  };
}

export const LEVELS: LevelDefinition[] = Array.from(
  { length: TOTAL_LEVELS },
  (_, i) => buildLevel(i + 1)
);

export function getLevelHeightPx(): number {
  return LEVEL_HEIGHT_TILES * GRID;
}
