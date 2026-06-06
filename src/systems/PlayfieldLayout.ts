import Phaser from 'phaser';
import { GRID, WIDTH_IN_TILES, WORLD_WIDTH } from '../config/constants';

/** Screen vs centered tower layout helpers */
export class PlayfieldLayout {
  constructor(private scene: Phaser.Scene) {}

  get gameWidth(): number {
    return this.scene.scale.width;
  }

  get towerLeft(): number {
    return Math.max(0, (this.gameWidth - WORLD_WIDTH) / 2);
  }

  get towerRight(): number {
    return this.towerLeft + WORLD_WIDTH;
  }

  get wrapWidth(): number {
    return this.gameWidth;
  }

  wrapWidthInTiles(): number {
    return Math.max(WIDTH_IN_TILES, Math.floor(this.wrapWidth / GRID));
  }

  scaleWrapTile(value: number, widthInTiles: number): number {
    return Math.round((value / WIDTH_IN_TILES) * widthInTiles);
  }
}
