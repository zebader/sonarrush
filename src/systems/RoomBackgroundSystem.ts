import Phaser from 'phaser';
import { GRID } from '../config/constants';
import { BuiltLevel } from './LevelManager';
import { PlayfieldLayout } from './PlayfieldLayout';
import {
  ROOM_BG_KEY,
  ROOM_BG_ASPECT,
  ROOM_BG_SOURCE_WIDTH,
  ROOM_BG_SOURCE_HEIGHT,
  ROOM_BG_DEPTH,
} from '../config/roomBackground';

function fitSizeToBox(
  boxWidth: number,
  boxHeight: number
): { width: number; height: number } {
  let width = boxWidth;
  let height = width / ROOM_BG_ASPECT;
  if (height > boxHeight) {
    height = boxHeight;
    width = height * ROOM_BG_ASPECT;
  }
  return { width, height };
}

/** Per-room forest backdrop — centered in tower rooms, tiled on horizontal levels */
export class RoomBackgroundSystem {
  private readonly scene: Phaser.Scene;
  private readonly layout: PlayfieldLayout;

  constructor(scene: Phaser.Scene, layout: PlayfieldLayout) {
    this.scene = scene;
    this.layout = layout;
  }

  buildForLevel(built: BuiltLevel): void {
    const roomHeight = built.definition.heightInTiles * GRID;
    const centerY = built.worldY + roomHeight / 2;
    const isWrap = built.definition.mode === 'horizontalWrap';

    if (isWrap) {
      this.buildHorizontalRoom(centerY, roomHeight);
    } else {
      this.buildTowerRoom(centerY, roomHeight);
    }
  }

  private buildTowerRoom(centerY: number, roomHeight: number): void {
    const roomWidth = this.layout.towerWidth;
    const centerX = this.layout.towerLeft + roomWidth / 2;
    const { width, height } = fitSizeToBox(roomWidth, roomHeight);

    this.scene.add
      .image(centerX, centerY, ROOM_BG_KEY)
      .setDisplaySize(width, height)
      .setDepth(ROOM_BG_DEPTH);
  }

  private buildHorizontalRoom(centerY: number, roomHeight: number): void {
    const { width: tileWidth, height: tileHeight } = fitSizeToBox(
      roomHeight * ROOM_BG_ASPECT,
      roomHeight
    );
    const strip = this.scene.add.tileSprite(
      this.layout.gameWidth / 2,
      centerY,
      this.layout.gameWidth,
      tileHeight,
      ROOM_BG_KEY
    );
    strip.setTileScale(
      tileWidth / ROOM_BG_SOURCE_WIDTH,
      tileHeight / ROOM_BG_SOURCE_HEIGHT
    );
    strip.setDepth(ROOM_BG_DEPTH);
  }
}
