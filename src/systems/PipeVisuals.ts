import Phaser from 'phaser';
import { GRID, PLATFORM_THICKNESS } from '../config/constants';
import {
  TERRAIN_DEPTH,
  PIPE_CENTER_KEY,
  PIPE_END_KEY,
  PIPE_CORNER_KEY,
} from '../config/terrainTiles';

/** Uniform scale — 32×32 art → 16×16 display (matches platform thickness) */
const PIPE_SCALE = PLATFORM_THICKNESS / GRID;
/** Display size of one pipe tile after scaling */
const PIPE_SEG = PLATFORM_THICKNESS;

/** Transparent pixels above the pipe body in the 32px art, scaled proportionally */
const PIPE_SURFACE_INSET = 4;
const PIPE_DISPLAY_INSET = PIPE_SURFACE_INSET * PIPE_SCALE;

/** Shaft tiles sit behind caps so branch ends cover vertical center at T-joints */
const PIPE_SHAFT_DEPTH = TERRAIN_DEPTH;
const PIPE_CAP_DEPTH = TERRAIN_DEPTH + 1;

/** Y center for a horizontal pipe row — top of the body sits on `surfaceY` */
function pipeRowCenterY(surfaceY: number): number {
  return surfaceY - PIPE_DISPLAY_INSET + PIPE_SEG / 2;
}

/** Visible pipe body height (excludes the transparent row above the surface) */
const PIPE_BODY_HEIGHT = PIPE_SEG - PIPE_DISPLAY_INSET;

export function getHorizontalPipeColliderBounds(
  left: number,
  surfaceY: number,
  width: number
): { x: number; y: number; width: number; height: number; surfaceY: number } {
  return {
    x: left + width / 2,
    y: surfaceY + PIPE_BODY_HEIGHT / 2,
    width,
    height: PIPE_BODY_HEIGHT,
    surfaceY,
  };
}

/** Collider that matches the visible shaft + caps for a vertical pipe */
export function getVerticalPipeColliderBounds(
  centerX: number,
  top: number,
  height: number,
  joint: VerticalPipeJoint
): { x: number; y: number; width: number; height: number } {
  let bodyTop = top;
  let bodyBottom = top + height;

  if (joint === 'top') {
    // Shaft starts below the horizontal corner — no empty box above it
    bodyTop += PIPE_SEG - PIPE_DISPLAY_INSET;
  }

  if (joint === 'bottom') {
    // Ends at the horizontal corner — no empty box below the shaft
    bodyBottom -= PIPE_DISPLAY_INSET;
  }

  const bodyHeight = bodyBottom - bodyTop;
  return {
    x: centerX,
    y: bodyTop + bodyHeight / 2,
    width: PIPE_SEG,
    height: bodyHeight,
  };
}

function scalePipeImage(
  image: Phaser.GameObjects.Image,
  flipX = false,
  flipY = false
): void {
  image.setScale(
    flipX ? -PIPE_SCALE : PIPE_SCALE,
    flipY ? -PIPE_SCALE : PIPE_SCALE
  );
}

function createPipeFill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  depth: number,
  angle = 0
): Phaser.GameObjects.TileSprite {
  const fill = scene.add.tileSprite(x, y, width, PIPE_SEG, PIPE_CENTER_KEY);
  fill.setTileScale(PIPE_SCALE);
  if (angle !== 0) {
    fill.setAngle(angle);
  }
  fill.setDepth(depth);
  return fill;
}

/** Vertical pipe leaving the platform end upward or downward */
export type PipeJoints = {
  left?: 'up' | 'down';
  right?: 'up' | 'down';
};

/** Which end of a vertical pipe joins a platform corner */
export type VerticalPipeJoint = 'top' | 'bottom' | null;

/**
 * Horizontal pipe: end cap, center fill, end cap (flipped).
 * Ends that join a vertical pipe render the corner tile instead of a cap.
 * The corner is authored joining top→right; flips cover the other turns.
 * `surfaceY` is the collision surface — the pipe body's top edge sits on it.
 */
export function createHorizontalPipe(
  scene: Phaser.Scene,
  left: number,
  surfaceY: number,
  width: number,
  joints: PipeJoints = {}
): void {
  const cy = pipeRowCenterY(surfaceY);

  const leftTile = scene.add.image(
    left + PIPE_SEG / 2,
    cy,
    joints.left ? PIPE_CORNER_KEY : PIPE_END_KEY
  );
  scalePipeImage(leftTile, false, joints.left === 'down');
  leftTile.setDepth(PIPE_CAP_DEPTH);

  const rightTile = scene.add.image(
    left + width - PIPE_SEG / 2,
    cy,
    joints.right ? PIPE_CORNER_KEY : PIPE_END_KEY
  );
  scalePipeImage(rightTile, true, joints.right === 'down');
  rightTile.setDepth(PIPE_CAP_DEPTH);

  const fillWidth = width - PIPE_SEG * 2;
  if (fillWidth > 0) {
    createPipeFill(scene, left + width / 2, cy, fillWidth, PIPE_CAP_DEPTH);
  }
}

/**
 * Vertical pipe. Free ends get a rotated cap; an end that joins a platform
 * stops short — the platform draws the corner tile there.
 */
export function createVerticalPipe(
  scene: Phaser.Scene,
  centerX: number,
  top: number,
  height: number,
  joint: VerticalPipeJoint
): void {
  let shaftTop = top;
  let shaftBottom = top + height;

  if (joint === 'top') {
    // Corner tile above covers down to surfaceY + PIPE_SEG - inset
    shaftTop += PIPE_SEG - PIPE_DISPLAY_INSET;
  } else {
    // Cap faces left in the source; +90 points it up, shading matches the shaft
    const topCap = scene.add.image(centerX, top + PIPE_SEG / 2, PIPE_END_KEY);
    scalePipeImage(topCap);
    topCap.setAngle(90);
    topCap.setDepth(PIPE_CAP_DEPTH);
    shaftTop += PIPE_SEG;
  }

  if (joint === 'bottom') {
    // Corner tile below starts at its surfaceY - inset
    shaftBottom -= PIPE_DISPLAY_INSET;
  } else {
    const cap = scene.add.image(
      centerX,
      top + height - PIPE_SEG / 2,
      PIPE_END_KEY
    );
    // Flip so the cap faces right, then rotate clockwise to point it down
    scalePipeImage(cap, true);
    cap.setAngle(90);
    cap.setDepth(PIPE_CAP_DEPTH);
    shaftBottom -= PIPE_SEG;
  }

  const shaftLen = shaftBottom - shaftTop;
  if (shaftLen > 0) {
    createPipeFill(
      scene,
      centerX,
      shaftTop + shaftLen / 2,
      shaftLen,
      PIPE_SHAFT_DEPTH,
      90
    );
  }
}
