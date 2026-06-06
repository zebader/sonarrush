import Phaser from 'phaser';
import { GRID, COLORS, WORLD_WIDTH } from '../config/constants';
import { ProjectileSpawnerDef } from '../data/levels';
import { Player } from '../entities/Player';

type SpawnerState = ProjectileSpawnerDef & {
  worldY: number;
  lastFiredAt: number;
  playLeft: number;
  playRight: number;
};

export class ProjectileSystem {
  private scene: Phaser.Scene;
  readonly group: Phaser.Physics.Arcade.Group;
  private spawners: SpawnerState[] = [];
  private defaultPlayLeft: number;
  private defaultPlayRight: number;
  private onHitPlayer: () => void;

  constructor(scene: Phaser.Scene, onHitPlayer: () => void) {
    this.scene = scene;
    this.defaultPlayLeft = GRID;
    this.defaultPlayRight = WORLD_WIDTH - GRID;
    this.onHitPlayer = onHitPlayer;
    this.group = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });
  }

  build(
    defs: ProjectileSpawnerDef[],
    worldY: number,
    playLeft = this.defaultPlayLeft,
    playRight = this.defaultPlayRight
  ): void {
    for (const def of defs) {
      this.spawners.push({
        ...def,
        worldY,
        lastFiredAt: -Infinity,
        playLeft,
        playRight,
      });
    }
  }

  update(timeMs: number): void {
    for (const spawner of this.spawners) {
      if (timeMs - spawner.lastFiredAt >= spawner.intervalMs) {
        this.fire(spawner);
        spawner.lastFiredAt = timeMs;
      }
    }

    for (const child of this.group.getChildren()) {
      const rect = child as Phaser.GameObjects.Rectangle;
      const bounds = this.getCombinedBounds();
      if (rect.x < bounds.left - GRID || rect.x > bounds.right + GRID) {
        rect.destroy();
      }
    }
  }

  private getCombinedBounds(): { left: number; right: number } {
    let left = this.defaultPlayLeft;
    let right = this.defaultPlayRight;

    for (const spawner of this.spawners) {
      left = Math.min(left, spawner.playLeft);
      right = Math.max(right, spawner.playRight);
    }

    return { left, right };
  }

  private fire(spawner: SpawnerState): void {
    const size = GRID * 0.4;
    const y = spawner.worldY + spawner.y * GRID + GRID / 2;

    const x =
      spawner.direction === 1
        ? spawner.playLeft + size
        : spawner.playRight - size;

    const projectile = this.scene.add.rectangle(
      x,
      y,
      size,
      size,
      COLORS.projectile
    );
    this.group.add(projectile);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityX(spawner.direction * spawner.speed);
  }

  setupPlayerOverlap(
    player: Player,
    canHit: () => boolean
  ): void {
    this.scene.physics.add.overlap(
      player,
      this.group,
      (_player, projectile) => {
        if (!canHit()) return;
        projectile.destroy();
        this.onHitPlayer();
      },
      undefined,
      this
    );
  }
}
