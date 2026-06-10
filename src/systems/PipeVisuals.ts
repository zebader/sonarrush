import Phaser from 'phaser';
import { GRID } from '../config/constants';
import {
  TERRAIN_DEPTH,
  PIPE_CENTER_KEY,
  PIPE_END_KEY,
  PIPE_CORNER_KEY,
} from '../config/terrainTiles';

/** Transparent pixels above the pipe body in the 32px art */
const PIPE_SURFACE_INSET = 4;

/** Shaft tiles sit behind caps so branch ends cover vertical center at T-joints */
const PIPE_SHAFT_DEPTH = TERRAIN_DEPTH;
const PIPE_CAP_DEPTH = TERRAIN_DEPTH + 1;

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
  const cy = surfaceY - PIPE_SURFACE_INSET + GRID / 2;

  const leftTile = scene.add.image(
    left + GRID / 2,
    cy,
    joints.left ? PIPE_CORNER_KEY : PIPE_END_KEY
  );
  leftTile.setFlipY(joints.left === 'down');
  leftTile.setDepth(PIPE_CAP_DEPTH);

  const rightTile = scene.add.image(
    left + width - GRID / 2,
    cy,
    joints.right ? PIPE_CORNER_KEY : PIPE_END_KEY
  );
  rightTile.setFlipX(true);
  rightTile.setFlipY(joints.right === 'down');
  rightTile.setDepth(PIPE_CAP_DEPTH);

  const fillWidth = width - GRID * 2;
  if (fillWidth > 0) {
    const fill = scene.add.tileSprite(
      left + width / 2,
      cy,
      fillWidth,
      GRID,
      PIPE_CENTER_KEY
    );
    fill.setDepth(PIPE_CAP_DEPTH);
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
    // Corner tile above covers down to surfaceY + GRID - inset
    shaftTop += GRID - PIPE_SURFACE_INSET;
  } else {
    // Cap faces left in the source; +90 points it up, shading matches the
    // shaft (also rotated +90)
    const topCap = scene.add.image(centerX, top + GRID / 2, PIPE_END_KEY);
    topCap.setAngle(90);
    topCap.setDepth(PIPE_CAP_DEPTH);
    shaftTop += GRID;
  }

  if (joint === 'bottom') {
    // Corner tile below starts at its surfaceY - inset
    shaftBottom -= PIPE_SURFACE_INSET;
  } else {
    const cap = scene.add.image(
      centerX,
      top + height - GRID / 2,
      PIPE_END_KEY
    );
    // Flip so the cap faces right, then rotate clockwise to point it down —
    // keeps the shading on the same side as the shaft
    cap.setFlipX(true);
    cap.setAngle(90);
    cap.setDepth(PIPE_CAP_DEPTH);
    shaftBottom -= GRID;
  }

  const shaftLen = shaftBottom - shaftTop;
  if (shaftLen > 0) {
    const shaft = scene.add.tileSprite(
      centerX,
      shaftTop + shaftLen / 2,
      shaftLen,
      GRID,
      PIPE_CENTER_KEY
    );
    shaft.setAngle(90);
    shaft.setDepth(PIPE_SHAFT_DEPTH);
  }
}
