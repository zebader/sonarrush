import Phaser from 'phaser';
import { GRID } from '../config/constants';
import { BuiltLevel } from './LevelManager';
import { PlayfieldLayout } from './PlayfieldLayout';
import {
  ROOM_BG_SOURCE_WIDTH,
  ROOM_BG_SOURCE_HEIGHT,
  ROOM_BG_DEPTH,
  ROOM_OVERLAY_DEPTH,
  getRoomBackground,
} from '../config/roomBackground';

function fitSizeToBox(
  boxWidth: number,
  boxHeight: number,
  aspect: number
): { width: number; height: number } {
  let width = boxWidth;
  let height = width / aspect;
  if (height > boxHeight) {
    height = boxHeight;
    width = height * aspect;
  }
  return { width, height };
}

/** Per-room backdrop — centered by default, bottom-anchored when configured */
export class RoomBackgroundSystem {
  private readonly scene: Phaser.Scene;
  private readonly layout: PlayfieldLayout;

  constructor(scene: Phaser.Scene, layout: PlayfieldLayout) {
    this.scene = scene;
    this.layout = layout;
  }

  buildForLevel(built: BuiltLevel): void {
    const roomHeight = built.definition.heightInTiles * GRID;
    const roomBottomY = built.worldY + roomHeight;
    const centerY = built.worldY + roomHeight / 2;
    const bg = getRoomBackground(built.definition.level);
    const isWrap = built.definition.mode === 'horizontalWrap';

    if (isWrap) {
      this.buildHorizontalRoom(centerY, roomHeight, bg);
    } else {
      this.buildTowerRoom(centerY, roomBottomY, roomHeight, bg);
    }
  }

  private buildTowerRoom(
    centerY: number,
    roomBottomY: number,
    roomHeight: number,
    bg: ReturnType<typeof getRoomBackground>
  ): void {
    const roomWidth = this.layout.towerWidth;
    const centerX = this.layout.towerLeft + roomWidth / 2;
    const { width, height } = fitSizeToBox(roomWidth, roomHeight, bg.aspect);

    const imageY = bg.anchor === 'bottom' ? roomBottomY : centerY;
    const originY = bg.anchor === 'bottom' ? 1 : 0.5;

    this.scene.add
      .image(centerX, imageY, bg.key)
      .setOrigin(0.5, originY)
      .setDisplaySize(width, height)
      .setDepth(ROOM_BG_DEPTH);

    if (bg.overlayKey) {
      const overlay = this.scene.add
        .image(centerX, imageY, bg.overlayKey)
        .setOrigin(0.5, originY)
        .setDisplaySize(width, height)
        .setDepth(ROOM_OVERLAY_DEPTH);

      if (bg.overlayVibration) {
        this.addTrafficVibration(overlay, centerX, imageY);
      }
    }
  }

  /** Subtle idle shake — cars stuck in a jam */
  private addTrafficVibration(
    overlay: Phaser.GameObjects.Image,
    baseX: number,
    baseY: number
  ): void {
    this.scene.tweens.add({
      targets: overlay,
      x: baseX + 1.4,
      duration: 95,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: overlay,
      y: baseY - 0.9,
      duration: 130,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildHorizontalRoom(
    centerY: number,
    roomHeight: number,
    bg: ReturnType<typeof getRoomBackground>
  ): void {
    const { width: tileWidth, height: tileHeight } = fitSizeToBox(
      roomHeight * bg.aspect,
      roomHeight,
      bg.aspect
    );
    const strip = this.scene.add.tileSprite(
      this.layout.gameWidth / 2,
      centerY,
      this.layout.gameWidth,
      tileHeight,
      bg.key
    );
    strip.setTileScale(
      tileWidth / ROOM_BG_SOURCE_WIDTH,
      tileHeight / ROOM_BG_SOURCE_HEIGHT
    );
    strip.setDepth(ROOM_BG_DEPTH);
  }
}
