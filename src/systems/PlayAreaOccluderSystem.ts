import Phaser from 'phaser';
import {
  GRID,
  GAME_HEIGHT,
  WORLD_WIDTH,
  COLORS,
  HUD_FONT_FAMILY,
  GAME_NAME,
  GAME_TIME_SECONDS,
  HIT_TIME_PENALTY_SECONDS,
} from '../config/constants';
import { PlayfieldLayout } from './PlayfieldLayout';

const LEGEND_DEPTH = -49;

/** Hides area below the first floor and shows the start legend there. */
export class PlayAreaOccluderSystem {
  private bottomVeil: Phaser.GameObjects.Rectangle;
  private legend: Phaser.GameObjects.Container;
  private readonly floorBottomY: number;
  private readonly playWidth: number;
  private readonly playCenterX: number;

  constructor(scene: Phaser.Scene, floorSurfaceY: number, layout: PlayfieldLayout) {
    this.floorBottomY = floorSurfaceY + GRID;
    this.playWidth = WORLD_WIDTH - 2 * GRID;
    this.playCenterX = layout.towerLeft + WORLD_WIDTH / 2;

    scene.add
      .rectangle(
        layout.towerLeft + GRID / 2,
        GAME_HEIGHT / 2,
        GRID,
        GAME_HEIGHT,
        COLORS.background
      )
      .setScrollFactor(0)
      .setDepth(-50);

    scene.add
      .rectangle(
        layout.towerRight - GRID / 2,
        GAME_HEIGHT / 2,
        GRID,
        GAME_HEIGHT,
        COLORS.background
      )
      .setScrollFactor(0)
      .setDepth(-50);

    this.bottomVeil = scene.add
      .rectangle(this.playCenterX, GAME_HEIGHT, this.playWidth, 0, COLORS.background)
      .setScrollFactor(0)
      .setDepth(-50);

    this.legend = this.createLegend(scene);
  }

  private createLegend(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const hintStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '14px',
      color: '#b8c0d8',
      fontFamily: HUD_FONT_FAMILY,
      align: 'center',
    };

    const title = scene.add
      .text(0, -42, GAME_NAME.toUpperCase(), {
        fontSize: '34px',
        color: COLORS.hud,
        fontFamily: HUD_FONT_FAMILY,
        align: 'center',
      })
      .setOrigin(0.5);

    const goalLine = scene.add
      .text(
        0,
        0,
        `Get to the top in ${GAME_TIME_SECONDS / 60}:00`,
        hintStyle
      )
      .setOrigin(0.5);

    const projectileLine = scene.add
      .text(
        0,
        22,
        `Projectiles delay you ${HIT_TIME_PENALTY_SECONDS}s`,
        hintStyle
      )
      .setOrigin(0.5);

    const powerUpLine = scene.add
      .text(0, 44, 'Red Bull cans to go faster', {
        ...hintStyle,
        color: '#ffd93d',
      })
      .setOrigin(0.5);

    const container = scene.add.container(this.playCenterX, GAME_HEIGHT, [
      title,
      goalLine,
      projectileLine,
      powerUpLine,
    ]);
    container.setScrollFactor(0).setDepth(LEGEND_DEPTH);

    return container;
  }

  update(cameraScrollY: number): void {
    const screenTop = this.floorBottomY - cameraScrollY;

    if (screenTop >= GAME_HEIGHT) {
      this.bottomVeil.setVisible(false);
      this.legend.setVisible(false);
      return;
    }

    const top = Math.max(0, screenTop);
    const height = GAME_HEIGHT - top;
    const centerY = top + height / 2;

    this.bottomVeil.setVisible(height > 0);
    this.bottomVeil.setPosition(this.playCenterX, centerY);
    this.bottomVeil.setSize(this.playWidth, height);

    this.legend.setVisible(height > 48);
    this.legend.setPosition(this.playCenterX, centerY);
  }
}
