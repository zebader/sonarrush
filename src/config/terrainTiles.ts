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
