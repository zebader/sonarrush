export const GRID = 32;

export const RUN_SPEED = 210;
export const JUMP_VELOCITY = -420;
export const DOUBLE_JUMP_VELOCITY = -400;
export const GRAVITY = 980;
/** Constant downward speed while clinging to a wall */
export const WALL_SLIDE_SPEED = 55;
export const COYOTE_TIME_MS = 80;
export const JUMP_BUFFER_MS = 200;

export const PLAYER_WIDTH = GRID * 0.9;
export const PLAYER_HEIGHT = GRID * 1.5;
export const PLAYER_SPRITE_KEY = 'player-run';
export const PLAYER_RUN_ANIM_KEY = 'player-run';
export const PLAYER_JUMP_SPRITE_KEY = 'player-jump';
export const PLAYER_JUMP_ANIM_KEY = 'player-jump';
export const PLAYER_FALL_SPRITE_KEY = 'player-fall';
export const PLAYER_FALL_ANIM_KEY = 'player-fall';
export const PLAYER_SPRITE_FRAME_WIDTH = 32;
export const PLAYER_SPRITE_FRAME_HEIGHT = 32;
export const PLAYER_AIR_SPRITE_FRAME_COUNT = 4;
export const PLAYER_SPRITE_SCALE = PLAYER_HEIGHT / PLAYER_SPRITE_FRAME_HEIGHT;

/** Layouts are authored on a 10×10 reference grid, then scaled to the playfield */
export const ROOM_TILE_SCALE = 1.5;
/** Vertical space per tower level */
export const LEVEL_HEIGHT_TILES = Math.round(10 * ROOM_TILE_SCALE);
/** Tower room width — mobile-first 4:5 portrait relative to level height */
export const WIDTH_IN_TILES = Math.round((LEVEL_HEIGHT_TILES * 4) / 5);
export const WORLD_WIDTH = WIDTH_IN_TILES * GRID;
export const GAME_WIDTH = WORLD_WIDTH;
/** Minimum empty tiles between a platform and the side walls — keeps a 2-tile pass-through gap */
export const PLATFORM_WALL_MARGIN = 3;
/** Max tile width for tower platforms after layout scaling */
export const TOWER_MAX_PLATFORM_TILES = 4;
/** Platform slab thickness — thinner than a tile for clearance & looks */
export const PLATFORM_THICKNESS = GRID * 0.5;
/** Interior wall thickness — slimmer than a tile, centered in its column */
export const INTERIOR_WALL_THICKNESS = GRID * 0.5;
/** Max tile gap between climb surfaces (jump + double jump at apex, with margin) */
export const MAX_VERTICAL_JUMP_GAP_TILES = 5;
export const GAME_HEIGHT = 720;

/** Draw outlines on pipe/platform/wall colliders — set false for production */
export const DEBUG_HITBOXES = false;

export const TOTAL_LEVELS = 20;
export const MOVING_PLATFORM_LEVEL_START = 10;
export const PROJECTILE_LEVEL_START = 10;
/** Levels at and above this get slightly wider platforms & gentler hazards */
export const LATE_GAME_EASE_START = 15;
/** Levels that scroll full-width content to the right with wrap-around */
export const HORIZONTAL_WRAP_LEVELS = [8, 14] as const;
export const HORIZONTAL_WRAP_SPEED = 72;
/** Slower counter-scroll — easier to read and land on */
export const HORIZONTAL_WRAP_REVERSE_SPEED = 52;
/** Platform width range on horizontal wrap levels (tiles) */
export const HORIZONTAL_WRAP_MIN_PLATFORM_TILES = 1;
export const HORIZONTAL_WRAP_MAX_PLATFORM_TILES = 4;

export const HUD_FONT_FAMILY = '"Pixelify Sans", cursive';
export const GAME_NAME = 'Sonar Rush';

/** Reach the top before this runs out */
export const GAME_TIME_SECONDS = 600;
/** Seconds removed from the timer on projectile hit or fall */
export const HIT_TIME_PENALTY_SECONDS = 30;
/** Brief invulnerability after a hit — player keeps moving, no further hits */
export const INVULNERABILITY_MS = 2000;

export const POWER_UP_LEVELS = [7, 13, 17] as const;
export const POWER_UP_DURATION_MS = 10_000;
export const POWER_UP_SPEED_MULT = 1.35;
export const POWER_UP_JUMP_MULT = 1.25;
export const POWER_UP_IMAGE_KEY = 'power-up-redbull';
export const POWER_UP_CAN_SOURCE_WIDTH = 50;
export const POWER_UP_CAN_SOURCE_HEIGHT = 123;
/** ~1.5 tiles tall — keeps the 50×123 can proportion vs 32px platforms */
export const POWER_UP_CAN_HEIGHT = GRID * 1.5;
export const POWER_UP_CAN_WIDTH =
  (POWER_UP_CAN_HEIGHT * POWER_UP_CAN_SOURCE_WIDTH) / POWER_UP_CAN_SOURCE_HEIGHT;
/** Center floats this far above the platform surface */
export const POWER_UP_FLOAT_Y = POWER_UP_CAN_HEIGHT / 2 + GRID * 0.35;

export const PROJECTILE_SPRITE_KEY = 'fireballs';
export const PROJECTILE_ANIM_KEY = 'fireball';
export const PROJECTILE_SPRITE_FRAME_WIDTH = 32;
export const PROJECTILE_SPRITE_FRAME_HEIGHT = 32;
export const PROJECTILE_SPRITE_FRAME_COUNT = 4;
export const PROJECTILE_SPRITE_ROW = 0;
export const PROJECTILE_SIZE = GRID * 0.4;
export const PROJECTILE_SPRITE_SCALE =
  PROJECTILE_SIZE / PROJECTILE_SPRITE_FRAME_WIDTH;

export const CAMERA_FOLLOW_LERP = 0.12;
export const CAMERA_PLAYER_ANCHOR = 0.58;

export const COLORS = {
  background: 0x1a1a2e,
  player: 0x4ecca3,
  platform: 0x3a86ff,
  movingPlatform: 0x5f27cd,
  floor: 0x1e5f9e,
  wall: 0x2d3436,
  projectile: 0xff6b6b,
  powerUp: 0xffd93d,
  powerUpPlayer: 0xffe66d,
  hud: '#ffffff',
  victory: '#4ecca3',
};

/** Feet below checkpoint floor surface before fall death triggers */
export const CHECKPOINT_FALL_MARGIN = GRID;
/** Player must clear a checkpoint floor by this much before it activates */
export const CHECKPOINT_CROSS_MARGIN = GRID * 0.35;

/** Dev assert: primary jump apex should be ~3 grid units */
export function validateJumpHeight(): void {
  const apex = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
  const tiles = Math.abs(apex) / GRID;
  if (tiles < 2.8 || tiles > 3.2) {
    console.warn(
      `[constants] Jump apex is ${tiles.toFixed(2)} tiles (target: ~3 tiles)`
    );
  }
}
