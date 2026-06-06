import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { LevelManager } from './LevelManager';
import {
  GAME_HEIGHT,
  CHECKPOINT_FALL_MARGIN,
  PLAYER_HEIGHT,
  CAMERA_FOLLOW_LERP,
  CAMERA_PLAYER_ANCHOR,
} from '../config/constants';

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private player: Player;
  private scrollY = 0;
  private readonly xScroll = 0;
  private getCheckpointFloorY: () => number;
  private onDeath: () => void;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    _levelManager: LevelManager,
    getCheckpointFloorY: () => number,
    onDeath: () => void
  ) {
    this.camera = scene.cameras.main;
    this.player = player;
    this.getCheckpointFloorY = getCheckpointFloorY;
    this.onDeath = onDeath;

    this.camera.setBounds(0, -Infinity, scene.scale.width, Infinity);
    this.scrollY = player.y - GAME_HEIGHT * CAMERA_PLAYER_ANCHOR;
    this.camera.setScroll(this.xScroll, this.scrollY);
  }

  update(_time: number, delta: number): void {
    if (this.player.isDead) return;

    const followTarget = this.player.y - GAME_HEIGHT * CAMERA_PLAYER_ANCHOR;
    const frameLerp = 1 - Math.pow(1 - CAMERA_FOLLOW_LERP, delta / 16.67);

    this.scrollY = Phaser.Math.Linear(this.scrollY, followTarget, frameLerp);
    this.camera.setScroll(this.xScroll, this.scrollY);

    this.checkFallDeath();
  }

  private checkFallDeath(): void {
    if (this.player.isInvulnerable) return;

    const checkpointFloorY = this.getCheckpointFloorY();
    const playerFeet = this.player.y + PLAYER_HEIGHT / 2;

    if (
      this.player.body.velocity.y > 0 &&
      playerFeet > checkpointFloorY + CHECKPOINT_FALL_MARGIN
    ) {
      this.onDeath();
    }
  }

  onRespawn(): void {
    this.scrollY = this.player.y - GAME_HEIGHT * CAMERA_PLAYER_ANCHOR;
    this.camera.setScroll(this.xScroll, this.scrollY);
  }
}
