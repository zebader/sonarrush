import Phaser from 'phaser';
import { Player, PlayerState } from '../entities/Player';
import { syncTerrainVisual } from './TerrainVisuals';

type ScrollBody = {
  rect: Phaser.GameObjects.Rectangle;
  halfWidth: number;
  scrollSpeed: number;
  scrollDir: 1 | -1;
};

/** Drifts level content horizontally and wraps at the screen edges. */
export class HorizontalWrapSystem {
  private scene: Phaser.Scene;
  private readonly wrapWidth: number;
  private readonly worldTopY: number;
  private readonly worldBottomY: number;
  private readonly bodies: ScrollBody[] = [];

  constructor(
    scene: Phaser.Scene,
    wrapWidth: number,
    worldTopY: number,
    worldBottomY: number
  ) {
    this.scene = scene;
    this.wrapWidth = wrapWidth;
    this.worldTopY = worldTopY;
    this.worldBottomY = worldBottomY;
  }

  register(
    rect: Phaser.GameObjects.Rectangle,
    scrollDir: 1 | -1 = 1,
    scrollSpeed: number
  ): void {
    this.bodies.push({
      rect,
      halfWidth: rect.width / 2,
      scrollDir,
      scrollSpeed,
    });
  }

  isActiveFor(playerY: number): boolean {
    return playerY >= this.worldTopY && playerY <= this.worldBottomY;
  }

  update(player: Player, deltaMs: number): void {
    const playerInside = this.isActiveFor(player.y);
    let carriedPlayer = false;

    for (const body of this.bodies) {
      const dx = (body.scrollSpeed * body.scrollDir * deltaMs) / 1000;
      if (dx === 0) continue;

      const onTop = playerInside && this.isPlayerOnBody(player, body.rect);
      const clinging =
        playerInside && this.isPlayerClingingToBody(player, body.rect);

      if (onTop || clinging) {
        player.x += dx;
        carriedPlayer = true;
      }

      this.moveBody(body, dx, onTop || clinging ? player : null);
    }

    if (playerInside && carriedPlayer) {
      player.body.setVelocityX(0);
    }

    if (playerInside) {
      this.wrapPlayerX(player);
    }
  }

  private wrapPlayerX(player: Player): void {
    const halfW = player.displayWidth / 2;

    if (player.x - halfW > this.wrapWidth) {
      player.x -= this.wrapWidth;
    } else if (player.x + halfW < 0) {
      player.x += this.wrapWidth;
    }
  }

  private moveBody(
    body: ScrollBody,
    dx: number,
    carriedPlayer: Player | null
  ): void {
    const { rect, halfWidth } = body;

    rect.x += dx;

    if (rect.x - halfWidth > this.wrapWidth) {
      rect.x -= this.wrapWidth;
      if (carriedPlayer) {
        carriedPlayer.x -= this.wrapWidth;
      }
    } else if (rect.x + halfWidth < 0) {
      rect.x += this.wrapWidth;
      if (carriedPlayer) {
        carriedPlayer.x += this.wrapWidth;
      }
    }

    const physicsBody = rect.body as Phaser.Physics.Arcade.StaticBody | undefined;
    physicsBody?.updateFromGameObject();
    syncTerrainVisual(rect);
  }

  private isPlayerOnBody(
    player: Player,
    rect: Phaser.GameObjects.Rectangle
  ): boolean {
    if (!player.body.touching.down) return false;
    return this.scene.physics.overlap(player, rect) ?? false;
  }

  private isPlayerClingingToBody(
    player: Player,
    rect: Phaser.GameObjects.Rectangle
  ): boolean {
    if (player.state !== PlayerState.WallSliding || !player.wallSlideSide) {
      return false;
    }
    if (!(this.scene.physics.overlap(player, rect) ?? false)) {
      return false;
    }

    const body = player.body;
    if (player.wallSlideSide === 'left') {
      return body.blocked.left || body.touching.left;
    }
    return body.blocked.right || body.touching.right;
  }
}
