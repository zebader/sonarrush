import Phaser from 'phaser';
import {
  TILESET_KEY,
  TILESET_TILE_SCALE,
  TERRAIN_DEPTH,
} from '../config/terrainTiles';

export function createTerrainStrip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  frame: number,
  options?: { tint?: number; flipX?: boolean }
): Phaser.GameObjects.TileSprite {
  const strip = scene.add.tileSprite(x, y, width, height, TILESET_KEY, frame);
  strip.setTileScale(TILESET_TILE_SCALE);
  strip.setDepth(TERRAIN_DEPTH);
  if (options?.tint !== undefined) {
    strip.setTint(options.tint);
  }
  if (options?.flipX) {
    strip.setFlipX(true);
  }
  return strip;
}

export function attachTerrainVisual(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Rectangle,
  frame: number,
  options?: { tint?: number; flipX?: boolean }
): Phaser.GameObjects.TileSprite {
  const visual = createTerrainStrip(
    scene,
    body.x,
    body.y,
    body.width,
    body.height,
    frame,
    options
  );
  body.setData('terrainVisual', visual);
  return visual;
}

export function syncTerrainVisual(
  body: Phaser.GameObjects.Rectangle
): void {
  const visual = body.getData('terrainVisual') as
    | Phaser.GameObjects.TileSprite
    | undefined;
  if (!visual) return;

  visual.setPosition(body.x, body.y);
  visual.setSize(body.width, body.height);
}

export function destroyTerrainVisual(
  body: Phaser.GameObjects.GameObject
): void {
  const visual = body.getData('terrainVisual') as
    | Phaser.GameObjects.TileSprite
    | undefined;
  visual?.destroy();
}
