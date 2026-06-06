import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { validateJumpHeight } from './config/constants';

validateJumpHeight();

new Phaser.Game(createGameConfig('game-container'));
