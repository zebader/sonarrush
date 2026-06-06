import Phaser from 'phaser';
import { Player, PlayerState } from '../entities/Player';
import { PlayerController } from '../systems/PlayerController';
import { LevelManager } from '../systems/LevelManager';
import { CameraController } from '../systems/CameraController';
import { OneWayFloorSystem } from '../systems/OneWayFloorSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { PlayAreaOccluderSystem } from '../systems/PlayAreaOccluderSystem';
import {
  COLORS,
  TOTAL_LEVELS,
  CHECKPOINT_CROSS_MARGIN,
  PLAYER_HEIGHT,
  GAME_TIME_SECONDS,
  HIT_TIME_PENALTY_SECONDS,
  INVULNERABILITY_MS,
  HUD_FONT_FAMILY,
  POWER_UP_DURATION_MS,
  POWER_UP_SPEED_MULT,
  RUN_SPEED,
  POWER_UP_IMAGE_KEY,
  PLAYER_SPRITE_KEY,
  PLAYER_RUN_ANIM_KEY,
  PLAYER_JUMP_SPRITE_KEY,
  PLAYER_JUMP_ANIM_KEY,
  PLAYER_FALL_SPRITE_KEY,
  PLAYER_FALL_ANIM_KEY,
  PLAYER_SPRITE_FRAME_WIDTH,
  PLAYER_SPRITE_FRAME_HEIGHT,
  PLAYER_AIR_SPRITE_FRAME_COUNT,
} from '../config/constants';
import {
  TILESET_KEY as TERRAIN_TILESET_KEY,
  TILESET_FRAME_SIZE as TERRAIN_FRAME_SIZE,
} from '../config/terrainTiles';
import { ROOM_BG_KEY } from '../config/roomBackground';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerController!: PlayerController;
  private levelManager!: LevelManager;
  private powerUpSystem!: PowerUpSystem;
  private cameraController!: CameraController;
  private playAreaOccluder!: PlayAreaOccluderSystem;
  private oneWayFloors = new OneWayFloorSystem();
  private checkpointFloorY = 0;
  private respawnX = 0;
  private hasWon = false;
  private isGameOver = false;
  private timeRemainingMs = GAME_TIME_SECONDS * 1000;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private victoryText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private blinkTween: Phaser.Tweens.Tween | null = null;
  private timerPenaltyTween: Phaser.Tweens.Tween | null = null;
  private timerPenaltyAnimating = false;
  private powerUpText!: Phaser.GameObjects.Text;
  private powerUpExpireEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image(POWER_UP_IMAGE_KEY, 'assets/power-up-redbull.png');
    this.load.spritesheet(PLAYER_SPRITE_KEY, 'assets/player-run.png', {
      frameWidth: PLAYER_SPRITE_FRAME_WIDTH,
      frameHeight: PLAYER_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(PLAYER_JUMP_SPRITE_KEY, 'assets/player-jump.png', {
      frameWidth: PLAYER_SPRITE_FRAME_WIDTH,
      frameHeight: PLAYER_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(PLAYER_FALL_SPRITE_KEY, 'assets/player-fall.png', {
      frameWidth: PLAYER_SPRITE_FRAME_WIDTH,
      frameHeight: PLAYER_SPRITE_FRAME_HEIGHT,
    });
    this.load.spritesheet(TERRAIN_TILESET_KEY, 'assets/tileset.png', {
      frameWidth: TERRAIN_FRAME_SIZE,
      frameHeight: TERRAIN_FRAME_SIZE,
    });
    this.load.image(ROOM_BG_KEY, 'assets/room-bg.png');
  }

  create(): void {
    this.physics.world.fixedStep = true;

    this.levelManager = new LevelManager(this, () =>
      this.handleProjectileHit()
    );
    this.levelManager.buildAll();

    const initialFloor = this.levelManager.getInitialCheckpointFloor();
    this.checkpointFloorY = initialFloor.surfaceY;

    const spawn = this.levelManager.getSpawnPosition();
    this.respawnX = spawn.x;

    this.anims.create({
      key: PLAYER_RUN_ANIM_KEY,
      frames: this.anims.generateFrameNumbers(PLAYER_SPRITE_KEY, {
        start: 0,
        end: 9,
      }),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_JUMP_ANIM_KEY,
      frames: this.anims.generateFrameNumbers(PLAYER_JUMP_SPRITE_KEY, {
        start: 0,
        end: PLAYER_AIR_SPRITE_FRAME_COUNT - 1,
      }),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_FALL_ANIM_KEY,
      frames: this.anims.generateFrameNumbers(PLAYER_FALL_SPRITE_KEY, {
        start: 0,
        end: PLAYER_AIR_SPRITE_FRAME_COUNT - 1,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.player = new Player(this, spawn.x, spawn.y);
    this.playerController = new PlayerController(
      this,
      this.player,
      () => this.levelManager.isInHorizontalWrapLevel(this.player.y)
    );

    this.physics.add.collider(this.player, this.levelManager.solidFloors);
    this.physics.add.collider(this.player, this.levelManager.platforms);
    this.physics.add.collider(
      this.player,
      this.levelManager.movingPlatforms.group
    );
    this.physics.add.collider(
      this.levelManager.movingPlatforms.group,
      this.levelManager.platforms
    );
    this.physics.add.collider(this.player, this.levelManager.walls);

    this.levelManager.projectiles.setupPlayerOverlap(this.player, () =>
      this.canTakeHit()
    );

    this.powerUpSystem = new PowerUpSystem(this, () => this.activatePowerUp());
    this.powerUpSystem.spawnAtLevels(this.levelManager);
    this.powerUpSystem.setupPlayerOverlap(this.player, () => this.canCollectPowerUp());

    this.levelManager.placePlayerOnFloor(
      this.player,
      this.checkpointFloorY,
      this.respawnX
    );

    this.cameraController = new CameraController(
      this,
      this.player,
      this.levelManager,
      () => this.checkpointFloorY,
      () => this.handleFallDeath()
    );

    const cam = this.cameras.main;

    this.playAreaOccluder = new PlayAreaOccluderSystem(
      this,
      this.checkpointFloorY,
      this.levelManager.getPlayfieldLayout()
    );
    this.playAreaOccluder.update(cam.scrollY);

    this.levelText = this.add
      .text(16, 16, 'Level 1 / 20', {
        fontSize: '18px',
        color: COLORS.hud,
        fontFamily: HUD_FONT_FAMILY,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.timerText = this.add
      .text(this.scale.width - 16, 16, this.formatTime(this.timeRemainingMs), {
        fontSize: '20px',
        color: COLORS.hud,
        fontFamily: HUD_FONT_FAMILY,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.powerUpText = this.add
      .text(this.scale.width / 2, 62, '', {
        fontSize: '14px',
        color: '#ffd93d',
        fontFamily: HUD_FONT_FAMILY,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.victoryText = this.add
      .text(0, 0, '', {
        fontSize: '32px',
        color: COLORS.victory,
        fontFamily: HUD_FONT_FAMILY,
        align: 'center',
      })
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    this.gameOverText = this.add
      .text(0, 0, '', {
        fontSize: '32px',
        color: '#ff6b6b',
        fontFamily: HUD_FONT_FAMILY,
        align: 'center',
      })
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);
  }

  update(): void {
    if (this.hasWon || this.isGameOver) return;

    this.tickTimer(this.game.loop.delta);

    this.oneWayFloors.apply(this.player, this.levelManager.oneWayFloors);

    this.playerController.update();
    this.updateCheckpoint();
    this.levelManager.update(this.time.now, this.player, this.game.loop.delta);
    this.cameraController.update(this.time.now, this.game.loop.delta);
    this.playAreaOccluder.update(this.cameras.main.scrollY);
    this.updatePowerUpState();
    this.updateHud();
    this.checkVictory();
  }

  private tickTimer(deltaMs: number): void {
    this.timeRemainingMs -= deltaMs;
    if (this.timeRemainingMs <= 0) {
      this.timeRemainingMs = 0;
      this.handleGameOver();
    }
  }

  private canTakeHit(): boolean {
    return (
      !this.player.isInvulnerable &&
      !this.hasWon &&
      !this.isGameOver
    );
  }

  private canCollectPowerUp(): boolean {
    return !this.hasWon && !this.isGameOver;
  }

  private updateHud(): void {
    const level = this.levelManager.getCurrentLevelFromCheckpoint(
      this.checkpointFloorY
    );
    this.levelText.setText(`Level ${level} / ${TOTAL_LEVELS}`);
    this.timerText.setText(this.formatTime(this.timeRemainingMs));

    if (!this.timerPenaltyAnimating) {
      const lowTime = this.timeRemainingMs <= 60_000;
      this.timerText.setColor(lowTime ? '#ff6b6b' : COLORS.hud);
    }

    if (this.player.powerUpActive) {
      const remainingMs = Math.max(0, this.player.powerUpEndsAt - this.time.now);
      this.powerUpText.setText(`SPEED BOOST ${Math.ceil(remainingMs / 1000)}s`);
      this.powerUpText.setVisible(true);
    } else {
      this.powerUpText.setVisible(false);
    }

    this.layoutOverlayText();
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private layoutOverlayText(): void {
    this.layoutVictoryText();
    this.layoutGameOverText();
  }

  private layoutVictoryText(): void {
    const cam = this.cameras.main;
    this.victoryText.setPosition(
      cam.width / 2 - this.victoryText.width / 2,
      cam.height / 2 - 40
    );
  }

  private updateCheckpoint(): void {
    let bestSurfaceY = this.checkpointFloorY;
    let updated = false;

    const standingSolid = this.levelManager.getStandingSolidFloor(this.player);
    if (standingSolid && standingSolid.surfaceY < bestSurfaceY) {
      bestSurfaceY = standingSolid.surfaceY;
      updated = true;
    }

    const standingOneWay = this.oneWayFloors.getStandingFloor(
      this.player,
      this.levelManager.oneWayFloors
    );
    if (standingOneWay && standingOneWay.surfaceY < bestSurfaceY) {
      bestSurfaceY = standingOneWay.surfaceY;
      updated = true;
    }

    for (const crossed of this.oneWayFloors.getPassedFloorInfos(
      this.levelManager.oneWayFloors
    )) {
      if (crossed.surfaceY < bestSurfaceY) {
        bestSurfaceY = crossed.surfaceY;
        updated = true;
      }
    }

    if (updated) {
      this.checkpointFloorY = bestSurfaceY;
      this.respawnX = this.player.x;
    }
  }

  private checkVictory(): void {
    const topCheckpoint = this.levelManager.getTopCheckpointSurfaceY();
    const playerFeet = this.player.y + PLAYER_HEIGHT / 2;

    if (playerFeet < topCheckpoint - CHECKPOINT_CROSS_MARGIN) {
      this.hasWon = true;
      this.deactivatePowerUp();
      this.victoryText.setText(
        `You Win!\n20 Levels in ${this.formatTime(
          GAME_TIME_SECONDS * 1000 - this.timeRemainingMs
        )}`
      );
      this.victoryText.setVisible(true);
      this.layoutVictoryText();
    }
  }

  private layoutGameOverText(): void {
    const cam = this.cameras.main;
    this.gameOverText.setPosition(
      cam.width / 2 - this.gameOverText.width / 2,
      cam.height / 2 - 40
    );
  }

  private applyTimePenalty(): void {
    this.timeRemainingMs -= HIT_TIME_PENALTY_SECONDS * 1000;
    this.playTimePenaltyAnimation();
    if (this.timeRemainingMs <= 0) {
      this.timeRemainingMs = 0;
      this.handleGameOver();
    }
  }

  private playTimePenaltyAnimation(): void {
    this.timerPenaltyAnimating = true;
    this.timerPenaltyTween?.stop();
    this.timerText.setScale(1);
    this.timerText.setColor('#ff6b6b');

    this.timerPenaltyTween = this.tweens.add({
      targets: this.timerText,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 140,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.timerPenaltyAnimating = false;
        this.timerPenaltyTween = null;
        const lowTime = this.timeRemainingMs <= 60_000;
        this.timerText.setColor(lowTime ? '#ff6b6b' : COLORS.hud);
        this.timerText.setScale(1);
      },
    });

    const penaltyText = this.add
      .text(
        this.timerText.x,
        this.timerText.y + 26,
        `-${HIT_TIME_PENALTY_SECONDS}s`,
        {
          fontSize: '18px',
          color: '#ff6b6b',
          fontFamily: HUD_FONT_FAMILY,
        }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(102);

    this.tweens.add({
      targets: penaltyText,
      y: penaltyText.y - 32,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => penaltyText.destroy(),
    });
  }

  private activatePowerUp(): void {
    const now = this.time.now;
    this.player.powerUpActive = true;
    this.player.powerUpEndsAt = now + POWER_UP_DURATION_MS;
    this.player.setPowerUpVisual();
    this.player.body.setMaxVelocity(RUN_SPEED * POWER_UP_SPEED_MULT, 700);

    this.powerUpExpireEvent?.remove(false);
    this.powerUpExpireEvent = this.time.delayedCall(
      POWER_UP_DURATION_MS,
      () => this.deactivatePowerUp()
    );
  }

  private deactivatePowerUp(): void {
    if (!this.player.powerUpActive) return;

    this.player.powerUpActive = false;
    this.player.powerUpEndsAt = 0;
    this.player.setNormalVisual();
    this.player.body.setMaxVelocity(RUN_SPEED, 600);
    this.powerUpExpireEvent?.remove(false);
    this.powerUpExpireEvent = undefined;
  }

  private updatePowerUpState(): void {
    if (
      this.player.powerUpActive &&
      this.time.now >= this.player.powerUpEndsAt
    ) {
      this.deactivatePowerUp();
    }
  }

  private handleProjectileHit(): void {
    if (!this.canTakeHit()) return;

    this.applyTimePenalty();
    if (this.isGameOver) return;

    this.playPlayerHitPenaltyText();
    this.startInvulnerability();
  }

  private playPlayerHitPenaltyText(): void {
    const startY = this.player.y - PLAYER_HEIGHT / 2 - 4;

    const penaltyText = this.add
      .text(this.player.x, startY, `- ${HIT_TIME_PENALTY_SECONDS}s`, {
        fontSize: '24px',
        color: '#ff6b6b',
        fontFamily: HUD_FONT_FAMILY,
        stroke: '#1a1a2e',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(150);

    penaltyText.setScale(0.6);
    this.tweens.add({
      targets: penaltyText,
      scale: 1.2,
      duration: 120,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: penaltyText,
      y: startY - 56,
      alpha: 0,
      duration: 900,
      delay: 120,
      ease: 'Cubic.easeOut',
      onComplete: () => penaltyText.destroy(),
    });
  }

  private handleFallDeath(): void {
    if (!this.canTakeHit()) return;

    this.applyTimePenalty();
    if (this.isGameOver) return;

    this.levelManager.placePlayerOnFloor(
      this.player,
      this.checkpointFloorY,
      this.respawnX
    );
    this.player.facing = 1;
    this.player.state = PlayerState.Grounded;
    this.player.airJumpAvailable = true;
    this.player.jumpBuffered = false;
    this.cameraController.onRespawn();
    this.playAreaOccluder.update(this.cameras.main.scrollY);
    this.startInvulnerability();
  }

  private startInvulnerability(): void {
    this.player.isInvulnerable = true;
    this.blinkTween?.stop();
    this.player.setAlpha(1);

    const blinkRepeats = Math.max(0, Math.floor(INVULNERABILITY_MS / 200) - 1);
    this.blinkTween = this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 100,
      yoyo: true,
      repeat: blinkRepeats,
    });

    this.time.delayedCall(INVULNERABILITY_MS, () => {
      this.blinkTween?.stop();
      this.blinkTween = null;
      this.player.isInvulnerable = false;
      this.player.setAlpha(1);
      if (this.player.powerUpActive) {
        this.player.setPowerUpVisual();
      }
    });
  }

  private handleGameOver(): void {
    if (this.isGameOver || this.hasWon) return;

    this.isGameOver = true;
    this.deactivatePowerUp();
    this.blinkTween?.stop();
    this.blinkTween = null;
    this.player.isInvulnerable = false;
    this.player.setAlpha(1);
    this.gameOverText.setText("Time's Up!");
    this.gameOverText.setVisible(true);
    this.layoutGameOverText();
  }
}
