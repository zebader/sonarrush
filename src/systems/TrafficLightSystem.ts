import Phaser from 'phaser';
import { GRID } from '../config/constants';
import {
  TRAFFIC_LIGHT_BODY_KEY,
  TRAFFIC_LIGHT_BODY_SIZE,
  TRAFFIC_LIGHT_HEAD_WIDTH,
  TRAFFIC_LIGHT_HEAD_HEIGHT,
  TRAFFIC_LIGHT_HEAD_HEIGHT_RATIO,
  TRAFFIC_LIGHT_BODY_TO_HEAD_WIDTH_RATIO,
  TRAFFIC_LIGHT_BODY_MIN_WIDTH,
  TRAFFIC_LIGHT_BODY_CROP_X,
  TRAFFIC_LIGHT_BODY_CROP_WIDTH,
  TRAFFIC_LIGHT_BODY_TINT,
  TRAFFIC_LIGHT_HEAD_KEYS,
  TRAFFIC_LIGHT_COLOR_MIN_MS,
  TRAFFIC_LIGHT_COLOR_MAX_MS,
  TRAFFIC_LIGHT_DEPTH,
} from '../config/trafficLight';
import { PlayfieldLayout } from './PlayfieldLayout';

export class TrafficLightSystem {
  private head?: Phaser.GameObjects.Image;

  build(
    scene: Phaser.Scene,
    layout: PlayfieldLayout,
    walls: Phaser.Physics.Arcade.StaticGroup,
    worldY: number,
    roomHeightTiles: number
  ): void {
    const roomHeight = roomHeightTiles * GRID;
    const centerX = layout.towerLeft + layout.towerWidth / 2;
    const roomBottom = worldY + roomHeight;

    // Body + head together occupy the bottom half of the room.
    const totalHeight = roomHeight / 2;
    const headHeight = totalHeight * TRAFFIC_LIGHT_HEAD_HEIGHT_RATIO;
    const bodyHeight = totalHeight - headHeight;
    const headWidth = headHeight * (TRAFFIC_LIGHT_HEAD_WIDTH / TRAFFIC_LIGHT_HEAD_HEIGHT);
    const bodyWidth = Math.max(
      TRAFFIC_LIGHT_BODY_MIN_WIDTH,
      headWidth * TRAFFIC_LIGHT_BODY_TO_HEAD_WIDTH_RATIO
    );

    const bodyTop = roomBottom - bodyHeight;
    const bodyCenterY = bodyTop + bodyHeight / 2;

    scene.add
      .image(centerX, bodyCenterY, TRAFFIC_LIGHT_BODY_KEY)
      .setOrigin(0.5, 0.5)
      .setCrop(
        TRAFFIC_LIGHT_BODY_CROP_X,
        0,
        TRAFFIC_LIGHT_BODY_CROP_WIDTH,
        TRAFFIC_LIGHT_BODY_SIZE
      )
      .setDisplaySize(bodyWidth, bodyHeight)
      .setTint(TRAFFIC_LIGHT_BODY_TINT)
      .setDepth(TRAFFIC_LIGHT_DEPTH)
      .setAlpha(1);

    const body = scene.add.rectangle(
      centerX,
      bodyCenterY,
      bodyWidth,
      bodyHeight,
      0x000000,
      0
    );
    scene.physics.add.existing(body, true);
    walls.add(body);

    const headCenterY = bodyTop - headHeight / 2;
    const initialKey =
      TRAFFIC_LIGHT_HEAD_KEYS[
        Math.floor(Math.random() * TRAFFIC_LIGHT_HEAD_KEYS.length)
      ];

    this.head = scene.add
      .image(centerX, bodyTop, initialKey)
      .setOrigin(0.5, 1)
      .setDisplaySize(headWidth, headHeight)
      .setDepth(TRAFFIC_LIGHT_DEPTH)
      .setAlpha(1);

    const headBody = scene.add.rectangle(
      centerX,
      headCenterY,
      headWidth,
      headHeight,
      0x000000,
      0
    );
    scene.physics.add.existing(headBody, true);
    walls.add(headBody);

    this.scheduleColorChange(scene);
  }

  private scheduleColorChange(scene: Phaser.Scene): void {
    if (!this.head) return;

    const delay =
      TRAFFIC_LIGHT_COLOR_MIN_MS +
      Math.random() * (TRAFFIC_LIGHT_COLOR_MAX_MS - TRAFFIC_LIGHT_COLOR_MIN_MS);

    scene.time.delayedCall(delay, () => {
      if (!this.head?.active) return;

      let next =
        TRAFFIC_LIGHT_HEAD_KEYS[
          Math.floor(Math.random() * TRAFFIC_LIGHT_HEAD_KEYS.length)
        ];
      // Avoid repeating the same color back-to-back
      if (
        TRAFFIC_LIGHT_HEAD_KEYS.length > 1 &&
        this.head.texture.key === next
      ) {
        const idx = TRAFFIC_LIGHT_HEAD_KEYS.indexOf(
          next as (typeof TRAFFIC_LIGHT_HEAD_KEYS)[number]
        );
        next =
          TRAFFIC_LIGHT_HEAD_KEYS[
            (idx + 1) % TRAFFIC_LIGHT_HEAD_KEYS.length
          ];
      }

      this.head.setTexture(next);
      this.scheduleColorChange(scene);
    });
  }
}
