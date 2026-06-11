export const TRAFFIC_LIGHT_LEVEL = 3;

export const TRAFFIC_LIGHT_BODY_KEY = 'traffic-light-body';
export const TRAFFIC_LIGHT_BODY_SIZE = 50;

export const TRAFFIC_LIGHT_HEAD_WIDTH = 168;
export const TRAFFIC_LIGHT_HEAD_HEIGHT = 381;

/** Signal head height as a share of the total traffic-light stack (rest is pole) */
export const TRAFFIC_LIGHT_HEAD_HEIGHT_RATIO = 0.19;

/** Pole display width relative to the signal head width */
export const TRAFFIC_LIGHT_BODY_TO_HEAD_WIDTH_RATIO = 0.38;

/** Minimum rendered pole width so the body stays visible at game scale */
export const TRAFFIC_LIGHT_BODY_MIN_WIDTH = 18;

/** Crop the 50px body art to the center pole cylinder (drops black side padding) */
export const TRAFFIC_LIGHT_BODY_CROP_X = 16;
export const TRAFFIC_LIGHT_BODY_CROP_WIDTH = 14;

/** Darken the pole art — source texture is mid-grey with a bright highlight stripe */
export const TRAFFIC_LIGHT_BODY_TINT = 0x2a2a2a;

export const TRAFFIC_LIGHT_RED_KEY = 'traffic-light-red';
export const TRAFFIC_LIGHT_YELLOW_KEY = 'traffic-light-yellow';
export const TRAFFIC_LIGHT_GREEN_KEY = 'traffic-light-green';

export const TRAFFIC_LIGHT_HEAD_KEYS = [
  TRAFFIC_LIGHT_RED_KEY,
  TRAFFIC_LIGHT_YELLOW_KEY,
  TRAFFIC_LIGHT_GREEN_KEY,
] as const;

/** How long each random signal color stays lit (ms) */
export const TRAFFIC_LIGHT_COLOR_MIN_MS = 700;
export const TRAFFIC_LIGHT_COLOR_MAX_MS = 1800;

export const TRAFFIC_LIGHT_DEPTH = -6;
