import { GRID, PLAYER_HEIGHT, PLAYER_WIDTH, CHECKPOINT_CROSS_MARGIN } from '../config/constants';
import { Player, PlayerState } from '../entities/Player';
import { FloorInfo, OneWayFloorRecord, OneWayPlatformRecord } from './LevelManager';

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

      if (player.state === PlayerState.WallSliding) {
        // Block sliding down through passed checkpoint floors (room boundaries)
        if (feet > floor.surfaceY) {
          player.setY(floor.surfaceY - PLAYER_HEIGHT / 2);
          player.body.setVelocityY(0);
          player.oneWayGrounded = true;
        }
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

  applyPlatforms(player: Player, platforms: readonly OneWayPlatformRecord[]): void {
    if (player.isDead) return;

    player.standingOneWayPlatform = null;

    const feet = player.y + PLAYER_HEIGHT / 2;
    const halfW = PLAYER_WIDTH / 2;
    const movingUp = player.body.velocity.y < 0;

    for (const platform of platforms) {
      const { rect, surfaceY } = platform;
      const left = rect.x - rect.width / 2;
      const right = rect.x + rect.width / 2;

      if (player.x + halfW <= left || player.x - halfW >= right) {
        continue;
      }

      // Player is far below this platform in the tower — no interaction yet
      if (feet > surfaceY + GRID * 0.5) {
        continue;
      }

      if (movingUp) continue;

      if (player.state === PlayerState.WallSliding) {
        continue;
      }

      const onSurface =
        feet >= surfaceY - 2 && feet <= surfaceY + GRID * 0.5;

      if (onSurface) {
        player.oneWayGrounded = true;
        player.standingOneWayPlatform = rect;
      }

      if (feet > surfaceY) {
        player.setY(surfaceY - PLAYER_HEIGHT / 2);
        player.body.setVelocityY(0);
        player.oneWayGrounded = true;
        player.standingOneWayPlatform = rect;
      }
    }
  }
}
