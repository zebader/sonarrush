import Phaser from 'phaser';
import {
  COLORS,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPRITE_KEY,
  PLAYER_RUN_ANIM_KEY,
  PLAYER_JUMP_ANIM_KEY,
  PLAYER_FALL_ANIM_KEY,
  PLAYER_RUN_SPRITE_FRAME_WIDTH,
  PLAYER_RUN_SPRITE_FRAME_HEIGHT,
  PLAYER_AIR_SPRITE_FRAME_WIDTH,
  PLAYER_AIR_SPRITE_FRAME_HEIGHT,
  PLAYER_AIR_SPRITE_SCALE,
  PLAYER_RUN_SPRITE_SCALE,
  RUN_SPEED,
} from '../config/constants';

export enum PlayerState {
  Grounded = 'grounded',
  Airborne = 'airborne',
  WallSliding = 'wallSliding',
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  state: PlayerState = PlayerState.Grounded;
  facing: 1 | -1 = 1;
  airJumpAvailable = true;
  lastGroundedAt = 0;
  lastJumpPressedAt = -Infinity;
  jumpBuffered = false;
  isDead = false;
  isInvulnerable = false;
  powerUpActive = false;
  powerUpEndsAt = 0;
  /** Set by OneWayFloorSystem when standing on a passed checkpoint floor */
  oneWayGrounded = false;
  /** Active one-way scroll platform the player is standing on, if any */
  standingOneWayPlatform: Phaser.GameObjects.Rectangle | null = null;
  /** Synced from PlayerController while wall-sliding (for scrolling platforms) */
  wallSlideSide: 'left' | 'right' | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_SPRITE_KEY, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.applySpriteMetrics(true);
    this.setOrigin(0.5, 0.5);
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(RUN_SPEED, 600);
    this.setDepth(0);
  }

  private applySpriteMetrics(forRun: boolean): void {
    const frameW = forRun
      ? PLAYER_RUN_SPRITE_FRAME_WIDTH
      : PLAYER_AIR_SPRITE_FRAME_WIDTH;
    const frameH = forRun
      ? PLAYER_RUN_SPRITE_FRAME_HEIGHT
      : PLAYER_AIR_SPRITE_FRAME_HEIGHT;
    const scale = forRun ? PLAYER_RUN_SPRITE_SCALE : PLAYER_AIR_SPRITE_SCALE;

    this.setScale(scale);
    const bodyWidth = PLAYER_WIDTH / scale;
    const bodyHeight = PLAYER_HEIGHT / scale;
    this.body.setSize(bodyWidth, bodyHeight);
    this.body.setOffset(
      (frameW - bodyWidth) / 2,
      (frameH - bodyHeight) / 2
    );
  }

  get isGrounded(): boolean {
    if (this.state === PlayerState.WallSliding) {
      return false;
    }

    return (
      this.oneWayGrounded ||
      this.body.blocked.down ||
      this.body.touching.down
    );
  }

  get isOnWall(): boolean {
    return (
      (this.body.blocked.left || this.body.touching.left) ||
      (this.body.blocked.right || this.body.touching.right)
    );
  }

  get wallSide(): 'left' | 'right' | null {
    if (this.body.blocked.left || this.body.touching.left) return 'left';
    if (this.body.blocked.right || this.body.touching.right) return 'right';
    return null;
  }

  setNormalVisual(): void {
    this.clearTint();
  }

  setPowerUpVisual(): void {
    this.setTint(COLORS.powerUpPlayer);
  }

  updateVisuals(): void {
    this.setFlipX(this.facing === -1);

    if (this.state === PlayerState.WallSliding) {
      this.playAnim(PLAYER_FALL_ANIM_KEY);
      return;
    }

    if (this.isGrounded) {
      this.playAnim(PLAYER_RUN_ANIM_KEY);
      return;
    }

    if (this.body.velocity.y < 0) {
      this.playAnim(PLAYER_JUMP_ANIM_KEY);
      return;
    }

    this.playAnim(PLAYER_FALL_ANIM_KEY);
  }

  private playAnim(key: string): void {
    const forRun = key === PLAYER_RUN_ANIM_KEY;
    this.applySpriteMetrics(forRun);
    if (!this.anims.isPlaying || this.anims.currentAnim?.key !== key) {
      this.play(key);
    }
  }

  reset(x: number, y: number): void {
    this.setPosition(x, y);
    this.body.setVelocity(0, 0);
    this.facing = 1;
    this.state = PlayerState.Grounded;
    this.airJumpAvailable = true;
    this.isDead = false;
    this.isInvulnerable = false;
    this.jumpBuffered = false;
    this.oneWayGrounded = false;
    this.standingOneWayPlatform = null;
    this.wallSlideSide = null;
    this.powerUpActive = false;
    this.powerUpEndsAt = 0;
    this.setNormalVisual();
    this.setAlpha(1);
    this.anims.stop();
    this.applySpriteMetrics(true);
    this.setTexture(PLAYER_SPRITE_KEY, 0);
  }
}
