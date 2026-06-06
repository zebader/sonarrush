import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY, COLORS } from './constants';
import { GameScene } from '../scenes/GameScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: COLORS.background,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: GRAVITY },
        debug: false,
        fixedStep: true,
      },
    },
    scene: [GameScene],
  };
}
