import { GRID, PLAYER_HEIGHT, PLAYER_WIDTH, CHECKPOINT_CROSS_MARGIN } from '../config/constants';
import { Player, PlayerState } from '../entities/Player';
import { FloorInfo, OneWayFloorRecord } from './LevelManager';

export class OneWayFloorSystem {
  private readonly passed = new Set<number>();

  apply(player: Player, floors: readonly OneWayFloorRecord[]): void {
    if (player.isDead) return;

    player.oneWayGrounded = false;

    const feet = player.y + PLAYER_HEIGHT / 2;
    const halfW = PLAYER_WIDTH / 2;
    const movingUp = player.body.velocity.y < 0;

    for (const floor of floors) {
      if (player.x + halfW <= floor.left || player.x - halfW >= floor.right) {
        continue;
      }

      if (feet < floor.surfaceY - CHECKPOINT_CROSS_MARGIN) {
        this.passed.add(floor.surfaceY);
      }

      if (!this.passed.has(floor.surfaceY)) continue;

      // Never interrupt an upward jump
      if (movingUp) continue;

      // Don't snap through floors while actively wall-sliding in the air
      if (player.state === PlayerState.WallSliding) {
        continue;
      }

      const onSurface =
        feet >= floor.surfaceY - 2 && feet <= floor.surfaceY + GRID * 0.5;

      if (onSurface) {
        player.oneWayGrounded = true;
      }

      // After clearing: stop descent through the checkpoint plane (land on it)
      if (feet > floor.surfaceY) {
        player.setY(floor.surfaceY - PLAYER_HEIGHT / 2);
        player.body.setVelocityY(0);
        player.oneWayGrounded = true;
      }
    }
  }

  getPassedFloorInfos(floors: readonly OneWayFloorRecord[]): FloorInfo[] {
    const result: FloorInfo[] = [];
    for (const floor of floors) {
      if (this.passed.has(floor.surfaceY)) {
        result.push({
          surfaceY: floor.surfaceY,
          tileY: floor.tileY,
          chunkId: floor.chunkId,
        });
      }
    }
    return result;
  }

  getStandingFloor(
    player: Player,
    floors: readonly OneWayFloorRecord[]
  ): FloorInfo | null {
    if (player.body.velocity.y < 0) return null;

    const feet = player.y + PLAYER_HEIGHT / 2;
    const halfW = PLAYER_WIDTH / 2;
    let best: FloorInfo | null = null;

    for (const floor of floors) {
      if (!this.passed.has(floor.surfaceY)) continue;
      if (player.x + halfW <= floor.left || player.x - halfW >= floor.right) {
        continue;
      }

      const onSurface =
        feet >= floor.surfaceY - 2 && feet <= floor.surfaceY + GRID * 0.5;
      if (!onSurface) continue;

      if (best === null || floor.surfaceY < best.surfaceY) {
        best = {
          surfaceY: floor.surfaceY,
          tileY: floor.tileY,
          chunkId: floor.chunkId,
        };
      }
    }

    return best;
  }

  reset(): void {
    this.passed.clear();
  }

}
