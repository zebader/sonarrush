import Phaser from 'phaser';
import { GRID, WIDTH_IN_TILES, WORLD_WIDTH } from '../config/constants';

/** Screen vs centered tower layout helpers */
export class PlayfieldLayout {
  constructor(private scene: Phaser.Scene) {}

  get gameWidth(): number {
    return this.scene.scale.width;
  }

  /** Tower playfield width — full viewport on narrow screens, authored width when wider */
  get towerWidth(): number {
    return Math.min(WORLD_WIDTH, this.gameWidth);
  }

  get towerLeft(): number {
    return Math.max(0, (this.gameWidth - this.towerWidth) / 2);
  }

  get towerRight(): number {
    return this.towerLeft + this.towerWidth;
  }

  get needsTowerScale(): boolean {
    return this.towerWidth < WORLD_WIDTH;
  }

  get wrapWidth(): number {
    return this.gameWidth;
  }

  towerWidthInTiles(): number {
    return Math.floor(this.towerWidth / GRID);
  }

  scaleTowerTile(value: number): number {
    if (!this.needsTowerScale) return value;
    return Math.round(
      (value / WIDTH_IN_TILES) * this.towerWidthInTiles()
    );
  }

  wrapWidthInTiles(): number {
    return Math.max(WIDTH_IN_TILES, Math.floor(this.wrapWidth / GRID));
  }

  scaleWrapTile(value: number, widthInTiles: number): number {
    return Math.round((value / WIDTH_IN_TILES) * widthInTiles);
  }
}
