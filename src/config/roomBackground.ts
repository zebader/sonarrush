export const ROOM_BG_KEY = 'room-bg';
/** Native asset size — 1024×571 (~16:9) */
export const ROOM_BG_SOURCE_WIDTH = 1024;
export const ROOM_BG_SOURCE_HEIGHT = 571;
export const ROOM_BG_ASPECT = ROOM_BG_SOURCE_WIDTH / ROOM_BG_SOURCE_HEIGHT;

export const ROOM_ONE_BG_KEY = 'room-one-bg';
/** Native asset size — 824×1024 (~4:5, matches the room proportion) */
export const ROOM_ONE_BG_SOURCE_WIDTH = 824;
export const ROOM_ONE_BG_SOURCE_HEIGHT = 1024;
export const ROOM_ONE_BG_ASPECT =
  ROOM_ONE_BG_SOURCE_WIDTH / ROOM_ONE_BG_SOURCE_HEIGHT;

export const ROOM_TWO_BG_KEY = 'room-two-bg';
/** Native asset size — 824×1024 (~4:5, matches the room proportion) */
export const ROOM_TWO_BG_ASPECT = 824 / 1024;

export const ROOM_BG_DEPTH = -20;

export type RoomBackgroundAnchor = 'center' | 'bottom';

export type RoomBackgroundDef = {
  key: string;
  aspect: number;
  anchor: RoomBackgroundAnchor;
};

const DEFAULT_ROOM_BG: RoomBackgroundDef = {
  key: ROOM_BG_KEY,
  aspect: ROOM_BG_ASPECT,
  anchor: 'center',
};

/** Per-level backdrop — omit a level to use the default forest room */
export const ROOM_BACKGROUNDS: Partial<Record<number, RoomBackgroundDef>> = {
  1: {
    key: ROOM_ONE_BG_KEY,
    aspect: ROOM_ONE_BG_ASPECT,
    anchor: 'bottom',
  },
  2: {
    key: ROOM_TWO_BG_KEY,
    aspect: ROOM_TWO_BG_ASPECT,
    anchor: 'bottom',
  },
};

export function getRoomBackground(level: number): RoomBackgroundDef {
  return ROOM_BACKGROUNDS[level] ?? DEFAULT_ROOM_BG;
}
