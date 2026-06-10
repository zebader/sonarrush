import { GRID } from './constants';

export const TILESET_KEY = 'terrain-tileset';
export const TILESET_FRAME_SIZE = 64;
export const TILESET_TILE_SCALE = GRID / TILESET_FRAME_SIZE;

/** Spritesheet is 768×384 → 12×6 grid of 64px tiles */
export const TERRAIN_FRAMES = {
  /** Mossy grass top — solid checkpoint floors */
  floor: 1,
  /** Same moss-top tile as floor — frame 14 is vertical in the sheet */
  platform: 1,
  /** Red-brown rocky face — tower side walls (wall slide) */
  wall: 12,
  /** Purple stone — horizontal level checkpoint blockers */
  wallBlocker: 2,
  /** Moss top with a light tint — moving platforms */
  movingPlatform: 1,
} as const;

export const TERRAIN_DEPTH = -5;

/** 32×32 concrete texture for side walls — authored facing the left wall */
export const CONCRETE_WALL_KEY = 'concrete-wall';
/** Rooms whose side walls use the concrete texture (right wall flipped) */
export const CONCRETE_WALL_LEVELS: readonly number[] = [1, 2];

/** 32×32 dark beam texture for checkpoint floor strips */
export const BEAM_FLOOR_KEY = 'beam-floor';
/**
 * Levels whose checkpoint floors use the beam texture.
 * Level 1 builds the floor topping room 1 (2nd floor), level 2 the one
 * topping room 2 (3rd floor); the starting ground floor has its own texture.
 */
export const BEAM_FLOOR_LEVELS: readonly number[] = [1, 2];

/** 32×32 texture for the starting ground floor only */
export const FIRST_FLOOR_KEY = 'first-floor';
