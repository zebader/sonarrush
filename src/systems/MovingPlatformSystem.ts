import Phaser from 'phaser';
import { GRID, PLATFORM_THICKNESS } from '../config/constants';
import { TERRAIN_FRAMES } from '../config/terrainTiles';
import { MovingPlatformDef } from '../data/levels';
import {
  attachTerrainVisual,
  destroyTerrainVisual,
  syncTerrainVisual,
} from './TerrainVisuals';

export type MovingPlatformInstance = {
  rect: Phaser.GameObjects.Rectangle;
  axis: 'x' | 'y';
  originX: number;
  originY: number;
  rangePx: number;
  speed: number;
  phase: number;
};

export class MovingPlatformSystem {
  private scene: Phaser.Scene;
  readonly group: Phaser.Physics.Arcade.StaticGroup;
  readonly instances: MovingPlatformInstance[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
  }

  build(defs: MovingPlatformDef[], worldY: number, xOffset = 0): void {
    for (const def of defs) {
      const w = def.w * GRID;
      const originX = xOffset + def.x * GRID + w / 2;
      // Top edge stays on the tile row — only the slab below gets thinner
      const originY = worldY + def.y * GRID + PLATFORM_THICKNESS / 2;
      const rangePx = def.rangeTiles * GRID;

      const rect = this.scene.add.rectangle(
        originX,
        originY,
        w,
        PLATFORM_THICKNESS,
        0x000000,
        0
      );
      this.scene.physics.add.existing(rect, true);
      attachTerrainVisual(this.scene, rect, TERRAIN_FRAMES.movingPlatform, {
        tint: 0xc8b8ff,
      });

      this.group.add(rect);
      this.instances.push({
        rect,
        axis: def.axis,
        originX,
        originY,
        rangePx,
        speed: def.speed,
        phase: def.phase,
      });
    }
  }

  update(timeMs: number): void {
    const t = timeMs / 1000;

    for (const inst of this.instances) {
      const offset =
        Math.sin(t * inst.speed + inst.phase) * inst.rangePx;

      if (inst.axis === 'x') {
        inst.rect.x = inst.originX + offset;
      } else {
        inst.rect.y = inst.originY + offset;
      }

      const body = inst.rect.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
      syncTerrainVisual(inst.rect);
    }
  }

  destroyAll(): void {
    for (const inst of this.instances) {
      destroyTerrainVisual(inst.rect);
      this.group.remove(inst.rect, true, true);
    }
    this.instances.length = 0;
  }
}
