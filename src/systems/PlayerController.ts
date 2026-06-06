import Phaser from 'phaser';
import { Player, PlayerState } from '../entities/Player';
import {
  RUN_SPEED,
  JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY,
  WALL_SLIDE_SPEED,
  COYOTE_TIME_MS,
  JUMP_BUFFER_MS,
  POWER_UP_SPEED_MULT,
  POWER_UP_JUMP_MULT,
  GRID,
} from '../config/constants';

/** Horizontal push into the wall while sliding — keeps arcade contact stable */
const WALL_STICK_SPEED = 48;
/** Frames off-wall before ending a slide at a platform edge */
const WALL_OFF_WALL_EXIT_FRAMES = 10;
/** Minimum slide frames before an edge exit can flip direction */
const WALL_SLIDE_MIN_FRAMES = 8;

export class PlayerController {
  private scene: Phaser.Scene;
  private player: Player;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private wasWallBlockedLeft = false;
  private wasWallBlockedRight = false;
  private wallClingSide: 'left' | 'right' | null = null;
  private offWallFrames = 0;
  private jumpedThisFrame = false;
  /** Primary jump already used since last landing (ground or wall) */
  private usedPrimaryJumpThisAir = false;
  /** Prevents slide re-grab at the floor corner after landing */
  private wallLandCooldown = 0;
  private wallSlideFrameCount = 0;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    private isInHorizontalWrapLevel: () => boolean = () => false
  ) {
    this.scene = scene;
    this.player = player;
    this.spaceKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    scene.input.on('pointerdown', () => this.onJumpInput());
    this.spaceKey.on('down', () => this.onJumpInput());
  }

  private onJumpInput(): void {
    this.player.lastJumpPressedAt = this.scene.time.now;
    this.player.jumpBuffered = true;
    this.tryJump();
  }

  update(): void {
    if (this.player.isDead) return;

    this.jumpedThisFrame = false;

    this.tryJump();

    if (!this.jumpedThisFrame) {
      // Resolve slide vs floor before auto-run movement
      this.updateWallSlide();
      this.applyHorizontalMovement();
      this.handleGroundedWallBounce();
    }

    this.updateGroundedState();
    this.updateState();
    this.player.updateVisuals();
  }

  private getRunSpeed(): number {
    return this.player.powerUpActive
      ? RUN_SPEED * POWER_UP_SPEED_MULT
      : RUN_SPEED;
  }

  private getJumpVelocity(): number {
    return this.player.powerUpActive
      ? JUMP_VELOCITY * POWER_UP_JUMP_MULT
      : JUMP_VELOCITY;
  }

  private getDoubleJumpVelocity(): number {
    return this.player.powerUpActive
      ? DOUBLE_JUMP_VELOCITY * POWER_UP_JUMP_MULT
      : DOUBLE_JUMP_VELOCITY;
  }

  private applyHorizontalMovement(): void {
    if (this.wallClingSide) {
      return;
    }

    this.player.body.setVelocityX(this.player.facing * this.getRunSpeed());
  }

  /** Auto-runner only flips direction on walls when grounded */
  private handleGroundedWallBounce(): void {
    if (this.wallClingSide) return;

    const blockedLeft = this.isOnWallSide('left');
    const blockedRight = this.isOnWallSide('right');

    if (this.player.isGrounded) {
      const hitLeft = blockedLeft && !this.wasWallBlockedLeft;
      const hitRight = blockedRight && !this.wasWallBlockedRight;

      if (hitLeft || hitRight) {
        this.player.facing = hitLeft ? 1 : -1;
        this.player.body.setVelocityX(this.player.facing * this.getRunSpeed());
      }
    }

    this.wasWallBlockedLeft = blockedLeft;
    this.wasWallBlockedRight = blockedRight;
  }

  private updateWallSlide(): void {
    if (this.wallLandCooldown > 0) {
      this.wallLandCooldown--;
    }

    if (this.wallClingSide && this.isLandingFromWallSlide()) {
      this.landFromWallSlide();
      return;
    }

    if (!this.wallClingSide && (this.player.isGrounded || this.isOnFloor())) {
      this.clearWallCling();
      return;
    }

    if (this.wallLandCooldown > 0) return;

    const detectedSide = this.getDetectedWallSide();
    if (detectedSide && this.isMovingIntoWall(detectedSide)) {
      if (!this.wallClingSide) {
        this.player.airJumpAvailable = true;
        this.usedPrimaryJumpThisAir = false;
        this.wallSlideFrameCount = 0;
      }
      this.wallClingSide = detectedSide;
      this.offWallFrames = 0;
    }

    if (!this.wallClingSide) return;

    if (this.isOnWallSide(this.wallClingSide)) {
      this.offWallFrames = 0;
    } else {
      this.offWallFrames++;
      if (
        this.offWallFrames > WALL_OFF_WALL_EXIT_FRAMES &&
        this.wallSlideFrameCount >= WALL_SLIDE_MIN_FRAMES
      ) {
        this.finishWallSlideAtEdge(this.wallClingSide);
        return;
      }
    }

    this.wallSlideFrameCount++;
    this.player.body.setAllowGravity(false);
    if (this.isInHorizontalWrapLevel()) {
      this.player.body.setVelocityX(0);
    } else {
      this.player.body.setVelocityX(
        this.wallClingSide === 'left' ? -WALL_STICK_SPEED : WALL_STICK_SPEED
      );
    }
    this.player.body.setVelocityY(WALL_SLIDE_SPEED);
    this.player.state = PlayerState.WallSliding;
    this.player.wallSlideSide = this.wallClingSide;
  }

  private isLandingFromWallSlide(): boolean {
    if (this.player.oneWayGrounded) return true;
    return this.player.body.blocked.down;
  }

  private isOnFloor(): boolean {
    const body = this.player.body;
    return (
      this.player.isGrounded ||
      body.blocked.down ||
      (body.touching.down && body.velocity.y >= -1)
    );
  }

  /** Clean handoff from wall slide to floor auto-run */
  private landFromWallSlide(): void {
    const wallSide = this.wallClingSide;
    this.clearWallCling();
    this.wallLandCooldown = 12;
    this.player.body.setVelocityY(0);
    this.player.state = PlayerState.Grounded;
    this.usedPrimaryJumpThisAir = false;
    this.player.airJumpAvailable = true;
    this.applyFacingAwayFromWall(wallSide);
    this.player.body.setVelocityX(this.player.facing * this.getRunSpeed());
    this.wasWallBlockedLeft = this.isOnWallSide('left');
    this.wasWallBlockedRight = this.isOnWallSide('right');
  }

  /** Passed the bottom of a wall/platform side — flip and run away */
  private finishWallSlideAtEdge(wallSide: 'left' | 'right' | null): void {
    this.applyFacingAwayFromWall(wallSide);
    this.wallLandCooldown = 12;
    this.wasWallBlockedLeft = this.isOnWallSide('left');
    this.wasWallBlockedRight = this.isOnWallSide('right');
    this.clearWallCling();
    this.player.body.setVelocityX(this.player.facing * this.getRunSpeed());
  }

  /** Run away from the wall the player was sliding on */
  private applyFacingAwayFromWall(wallSide: 'left' | 'right' | null): void {
    if (wallSide === 'left') {
      this.player.facing = 1;
      this.player.x += GRID * 0.15;
    } else if (wallSide === 'right') {
      this.player.facing = -1;
      this.player.x -= GRID * 0.15;
    }
  }

  private clearWallCling(): void {
    this.wallClingSide = null;
    this.offWallFrames = 0;
    this.wallSlideFrameCount = 0;
    this.player.wallSlideSide = null;
    this.player.body.setAllowGravity(true);
    if (this.player.state === PlayerState.WallSliding) {
      this.player.state = PlayerState.Airborne;
    }
  }

  private getWallJumpSide(): 'left' | 'right' | null {
    if (this.wallClingSide) return this.wallClingSide;

    const detected = this.getDetectedWallSide();
    if (detected) return detected;

    if (this.player.state === PlayerState.WallSliding) {
      return this.player.facing === -1 ? 'left' : 'right';
    }

    return null;
  }

  private canWallJumpNow(): boolean {
    if (this.player.isGrounded) return false;
    return this.getWallJumpSide() !== null;
  }

  private getDetectedWallSide(): 'left' | 'right' | null {
    if (this.isOnWallSide('left')) return 'left';
    if (this.isOnWallSide('right')) return 'right';
    return null;
  }

  private isOnWallSide(side: 'left' | 'right'): boolean {
    const body = this.player.body;
    if (side === 'left') {
      return body.blocked.left || body.touching.left;
    }
    return body.blocked.right || body.touching.right;
  }

  private isMovingIntoWall(side: 'left' | 'right'): boolean {
    if (this.isPushingIntoWallForSide(side)) return true;

    const velocityX = this.player.body.velocity.x;
    if (side === 'left') return velocityX < 0;
    return velocityX > 0;
  }

  private updateGroundedState(): void {
    if (this.player.isGrounded) {
      this.player.lastGroundedAt = this.scene.time.now;
      this.player.airJumpAvailable = true;
      this.usedPrimaryJumpThisAir = false;
    }
  }

  private isAirborneForJump(): boolean {
    return !this.player.isGrounded && !this.canCoyoteJump();
  }

  private canCoyoteJump(): boolean {
    return (
      this.scene.time.now - this.player.lastGroundedAt <= COYOTE_TIME_MS
    );
  }

  private tryJump(): void {
    if (!this.player.jumpBuffered) return;

    const withinBuffer =
      this.scene.time.now - this.player.lastJumpPressedAt <= JUMP_BUFFER_MS;
    if (!withinBuffer) {
      this.player.jumpBuffered = false;
      return;
    }

    const grounded = this.player.isGrounded || this.canCoyoteJump();
    if (grounded) {
      this.performJump(this.getJumpVelocity());
      this.usedPrimaryJumpThisAir = true;
      this.player.jumpBuffered = false;
      return;
    }

    if (this.canWallJumpNow() && !this.usedPrimaryJumpThisAir) {
      this.performWallJump();
      this.usedPrimaryJumpThisAir = true;
      this.player.jumpBuffered = false;
      return;
    }

    if (this.isAirborneForJump() && this.player.airJumpAvailable) {
      this.performDoubleJump();
      this.player.jumpBuffered = false;
    }
  }

  private performJump(velocityY: number): void {
    this.clearWallCling();
    this.player.body.setVelocityY(velocityY);
    this.player.state = PlayerState.Airborne;
    this.jumpedThisFrame = true;
  }

  private performDoubleJump(): void {
    this.clearWallCling();
    this.player.body.setVelocityY(this.getDoubleJumpVelocity());
    this.player.airJumpAvailable = false;
    this.player.state = PlayerState.Airborne;
    this.jumpedThisFrame = true;
  }

  private performWallJump(): void {
    const wallSide = this.getWallJumpSide();
    if (!wallSide) return;

    this.clearWallCling();
    this.player.facing = wallSide === 'left' ? 1 : -1;
    this.player.body.setVelocity(
      this.player.facing * this.getRunSpeed(),
      this.getJumpVelocity()
    );
    this.player.airJumpAvailable = true;
    this.player.state = PlayerState.Airborne;
    this.jumpedThisFrame = true;
  }

  private isPushingIntoWallForSide(side: 'left' | 'right'): boolean {
    if (side === 'left') return this.player.facing === -1;
    return this.player.facing === 1;
  }

  private updateState(): void {
    if (this.wallClingSide) {
      this.player.state = PlayerState.WallSliding;
      return;
    }

    if (this.player.isGrounded) {
      this.player.state = PlayerState.Grounded;
    } else {
      this.player.state = PlayerState.Airborne;
    }
  }
}
