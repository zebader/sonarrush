import Phaser from 'phaser';
import {
  POWER_UP_LEVELS,
  POWER_UP_IMAGE_KEY,
  POWER_UP_CAN_SOURCE_HEIGHT,
  POWER_UP_CAN_WIDTH,
  POWER_UP_CAN_HEIGHT,
} from '../config/constants';
import { Player } from '../entities/Player';
import { LevelManager } from './LevelManager';

export class PowerUpSystem {
  private scene: Phaser.Scene;
  readonly group: Phaser.Physics.Arcade.Group;
  private onCollect: () => void;
  private readonly baseScale =
    POWER_UP_CAN_HEIGHT / POWER_UP_CAN_SOURCE_HEIGHT;

  constructor(scene: Phaser.Scene, onCollect: () => void) {
    this.scene = scene;
    this.onCollect = onCollect;
    this.group = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
  }

  spawnAtLevels(levelManager: LevelManager): void {
    const spawns = levelManager.getPowerUpSpawns(POWER_UP_LEVELS);
    for (const spawn of spawns) {
      this.createPowerUp(spawn.x, spawn.y);
    }
  }

  private createPowerUp(x: number, y: number): void {
    const powerUp = this.scene.add.image(x, y, POWER_UP_IMAGE_KEY);
    powerUp.setScale(this.baseScale);
    powerUp.setOrigin(0.5, 0.5);
    this.group.add(powerUp);

    const body = powerUp.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(POWER_UP_CAN_WIDTH, POWER_UP_CAN_HEIGHT);
    body.setOffset(
      (powerUp.displayWidth - POWER_UP_CAN_WIDTH) / 2,
      (powerUp.displayHeight - POWER_UP_CAN_HEIGHT) / 2
    );

    this.scene.tweens.add({
      targets: powerUp,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.scene.tweens.add({
      targets: powerUp,
      scale: this.baseScale * 1.08,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setupPlayerOverlap(
    player: Player,
    canCollect: () => boolean
  ): void {
    this.scene.physics.add.overlap(
      player,
      this.group,
      (_player, powerUp) => {
        if (!canCollect()) return;
        powerUp.destroy();
        this.onCollect();
      },
      undefined,
      this
    );
  }
}
