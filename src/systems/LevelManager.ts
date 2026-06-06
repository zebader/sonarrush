import Phaser from 'phaser';
import {
  GRID,
  PLAYER_HEIGHT,
  TOTAL_LEVELS,
  WIDTH_IN_TILES,
  WORLD_WIDTH,
  POWER_UP_FLOAT_Y,
  HORIZONTAL_WRAP_MAX_PLATFORM_TILES,
  HORIZONTAL_WRAP_MIN_PLATFORM_TILES,
  HORIZONTAL_WRAP_REVERSE_SPEED,
} from '../config/constants';
import { LEVELS, LevelDefinition, TileRect } from '../data/levels';
import { Player } from '../entities/Player';
import { MovingPlatformSystem } from './MovingPlatformSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { HorizontalWrapSystem } from './HorizontalWrapSystem';
import { PlayfieldLayout } from './PlayfieldLayout';
import { TERRAIN_FRAMES } from '../config/terrainTiles';
import {
  attachTerrainVisual,
  createTerrainStrip,
} from './TerrainVisuals';
import { RoomBackgroundSystem } from './RoomBackgroundSystem';

export type BuiltLevel = {
  definition: LevelDefinition;
  worldY: number;
  index: number;
};

export type FloorInfo = {
  surfaceY: number;
  tileY: number;
  chunkId: string;
};

export type OneWayFloorRecord = {
  surfaceY: number;
  tileY: number;
  chunkId: string;
  chunkIndex: number;
  left: number;
  right: number;
  visual: Phaser.GameObjects.TileSprite;
};

export class LevelManager {
  private scene: Phaser.Scene;
  private layout: PlayfieldLayout;
  readonly solidFloors: Phaser.Physics.Arcade.StaticGroup;
  readonly platforms: Phaser.Physics.Arcade.StaticGroup;
  readonly walls: Phaser.Physics.Arcade.StaticGroup;
  readonly movingPlatforms: MovingPlatformSystem;
  readonly projectiles: ProjectileSystem;
  private horizontalWrapLevels: HorizontalWrapSystem[] = [];
  private roomBackgrounds: RoomBackgroundSystem;

  readonly builtLevels: BuiltLevel[] = [];
  readonly oneWayFloors: OneWayFloorRecord[] = [];

  private topWorldY = 0;

  constructor(scene: Phaser.Scene, onProjectileHit: () => void) {
    this.scene = scene;
    this.layout = new PlayfieldLayout(scene);
    this.solidFloors = scene.physics.add.staticGroup();
    this.platforms = scene.physics.add.staticGroup();
    this.walls = scene.physics.add.staticGroup();
    this.movingPlatforms = new MovingPlatformSystem(scene);
    this.projectiles = new ProjectileSystem(scene, onProjectileHit);
    this.roomBackgrounds = new RoomBackgroundSystem(scene, this.layout);
  }

  getPlayfieldLayout(): PlayfieldLayout {
    return this.layout;
  }

  buildAll(): void {
    for (let i = 0; i < LEVELS.length; i++) {
      this.buildLevel(LEVELS[i], i === 0);
    }
  }

  getInitialCheckpointFloor(): FloorInfo {
    const first = this.builtLevels[0];
    const groundTile = Math.max(...first.definition.floors);
    const surfaceY = first.worldY + groundTile * GRID;
    return {
      surfaceY,
      tileY: groundTile,
      chunkId: `level-${first.definition.level}`,
    };
  }

  getSpawnPosition(): { x: number; y: number } {
    const checkpoint = this.getInitialCheckpointFloor();
    const spawnX = this.layout.towerLeft + GRID * 2 + GRID / 2;
    return {
      x: spawnX,
      y: checkpoint.surfaceY - PLAYER_HEIGHT / 2,
    };
  }

  getCurrentLevelFromCheckpoint(checkpointFloorY: number): number {
    let current = 1;
    for (const built of this.builtLevels) {
      const topTile = Math.min(...built.definition.floors);
      const ceilingY = built.worldY + topTile * GRID;
      if (checkpointFloorY <= ceilingY) {
        current = Math.max(current, built.definition.level + 1);
      }
    }
    return Math.min(current, TOTAL_LEVELS);
  }

  getTopCheckpointSurfaceY(): number {
    const top = this.builtLevels[this.builtLevels.length - 1];
    const topFloorTile = Math.min(...top.definition.floors);
    return top.worldY + topFloorTile * GRID;
  }

  placePlayerOnFloor(player: Player, floorSurfaceY: number, x: number): void {
    player.setPosition(x, floorSurfaceY - PLAYER_HEIGHT / 2);
    player.body.setVelocity(0, 0);
    player.body.reset(player.x, player.y);
  }

  getStandingSolidFloor(player: Player): FloorInfo | null {
    let best: FloorInfo | null = null;

    for (const child of this.solidFloors.getChildren()) {
      const rect = child as Phaser.GameObjects.Rectangle;
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      if (!body) continue;

      const overlapping = this.scene.physics.overlap(player, rect);
      if (!overlapping || !player.body.touching.down || !body.touching.up) {
        continue;
      }

      const surfaceY = rect.getData('floorSurfaceY') as number;
      if (best === null || surfaceY < best.surfaceY) {
        best = {
          surfaceY,
          tileY: rect.getData('floorTileY') as number,
          chunkId: rect.getData('chunkId') as string,
        };
      }
    }

    return best;
  }

  getWorldWidth(): number {
    return this.layout.gameWidth;
  }

  getPowerUpSpawns(levels: readonly number[]): { x: number; y: number }[] {
    const spawns: { x: number; y: number }[] = [];

    for (const levelNum of levels) {
      const built = this.builtLevels.find(
        (entry) => entry.definition.level === levelNum
      );
      if (!built || built.definition.platforms.length === 0) continue;

      const sorted = [...built.definition.platforms].sort((a, b) => a.y - b.y);
      const platform = sorted[Math.floor(sorted.length / 2)];
      const surfaceY = built.worldY + platform.y * GRID;
      const isWrap = built.definition.mode === 'horizontalWrap';
      const widthInTiles = isWrap
        ? this.layout.wrapWidthInTiles()
        : WIDTH_IN_TILES;
      const tileX = isWrap
        ? this.layout.scaleWrapTile(platform.x, widthInTiles)
        : platform.x;
      const tileW = isWrap
        ? Math.max(2, this.layout.scaleWrapTile(platform.w, widthInTiles))
        : platform.w;

      spawns.push({
        x:
          (isWrap ? 0 : this.layout.towerLeft) +
          tileX * GRID +
          (tileW * GRID) / 2,
        y: surfaceY - POWER_UP_FLOAT_Y,
      });
    }

    return spawns;
  }

  update(timeMs: number, player: Player, deltaMs: number): void {
    this.movingPlatforms.update(timeMs);
    this.projectiles.update(timeMs);
    for (const wrap of this.horizontalWrapLevels) {
      wrap.update(player, deltaMs);
    }
  }

  isInHorizontalWrapLevel(playerY: number): boolean {
    return this.horizontalWrapLevels.some((wrap) => wrap.isActiveFor(playerY));
  }

  private buildLevel(definition: LevelDefinition, isFirst: boolean): void {
    if (!isFirst) {
      this.topWorldY -= definition.heightInTiles * GRID;
    }

    const worldY = this.topWorldY;
    const index = definition.level - 1;
    const chunkId = `level-${definition.level}`;
    const isWrap = definition.mode === 'horizontalWrap';

    this.buildWalls(definition, worldY);
    this.buildFloors(definition, worldY, isFirst, index, chunkId, isWrap);
    this.buildPlatforms(definition, worldY);

    if (isWrap) {
      const roomHeight = definition.heightInTiles * GRID;
      const wrap = new HorizontalWrapSystem(
        this.scene,
        this.layout.wrapWidth,
        worldY,
        worldY + roomHeight
      );

      this.registerHorizontalWrapBodies(
        wrap,
        chunkId,
        definition.scrollSpeed ?? 72
      );
      this.horizontalWrapLevels.push(wrap);
    }

    const xOffset = isWrap ? 0 : this.layout.towerLeft;
    this.movingPlatforms.build(definition.movingPlatforms, worldY, xOffset);
    this.projectiles.build(
      definition.projectileSpawners,
      worldY,
      isWrap ? GRID : this.layout.towerLeft + GRID,
      isWrap ? this.layout.wrapWidth - GRID : this.layout.towerRight - GRID
    );

    const built: BuiltLevel = { definition, worldY, index };
    this.builtLevels.push(built);
    this.roomBackgrounds.buildForLevel(built);
  }

  private getRoomMetrics(definition: LevelDefinition): {
    roomWidth: number;
    centerX: number;
    floorLeft: number;
  } {
    if (definition.mode === 'horizontalWrap') {
      const roomWidth = this.layout.wrapWidth;
      return { roomWidth, centerX: roomWidth / 2, floorLeft: 0 };
    }

    const roomWidth = definition.widthInTiles * GRID;
    return {
      roomWidth,
      centerX: this.layout.towerLeft + roomWidth / 2,
      floorLeft: this.layout.towerLeft,
    };
  }

  private getTowerCheckpointMetrics(): {
    roomWidth: number;
    centerX: number;
    floorLeft: number;
  } {
    return {
      roomWidth: WORLD_WIDTH,
      centerX: this.layout.towerLeft + WORLD_WIDTH / 2,
      floorLeft: this.layout.towerLeft,
    };
  }

  private buildFloors(
    definition: LevelDefinition,
    worldY: number,
    isFirst: boolean,
    chunkIndex: number,
    chunkId: string,
    isWrap: boolean
  ): void {
    const groundFloorTile = isFirst ? Math.max(...definition.floors) : -1;
    const floorTiles = definition.floors;

    for (const tileY of floorTiles) {
      const { roomWidth, centerX, floorLeft } = isWrap
        ? this.getTowerCheckpointMetrics()
        : this.getRoomMetrics(definition);

      const y = worldY + tileY * GRID + GRID / 2;
      const surfaceY = worldY + tileY * GRID;
      const isOneWay = isWrap
        ? true
        : !isFirst || tileY !== groundFloorTile;

      if (isWrap) {
        const visual = createTerrainStrip(
          this.scene,
          this.layout.gameWidth / 2,
          y,
          this.layout.gameWidth,
          GRID,
          TERRAIN_FRAMES.floor
        );

        this.oneWayFloors.push({
          surfaceY,
          tileY,
          chunkId,
          chunkIndex,
          left: floorLeft,
          right: floorLeft + roomWidth,
          visual,
        });

        this.buildHorizontalCheckpointSideBlocks(y, chunkId);
        continue;
      }

      const rect = createTerrainStrip(
        this.scene,
        centerX,
        y,
        roomWidth,
        GRID,
        TERRAIN_FRAMES.floor
      );

      if (isOneWay) {
        this.oneWayFloors.push({
          surfaceY,
          tileY,
          chunkId,
          chunkIndex,
          left: floorLeft,
          right: floorLeft + roomWidth,
          visual: rect,
        });
      } else {
        const body = this.scene.add.rectangle(
          centerX,
          y,
          roomWidth,
          GRID,
          0x000000,
          0
        );
        this.scene.physics.add.existing(body, true);
        body.setData('floorSurfaceY', surfaceY);
        body.setData('floorTileY', tileY);
        body.setData('chunkId', chunkId);
        attachTerrainVisual(this.scene, body, TERRAIN_FRAMES.floor);
        this.solidFloors.add(body);
      }
    }

    if (isWrap) {
      const entryY = worldY + definition.heightInTiles * GRID + GRID / 2;
      createTerrainStrip(
        this.scene,
        this.layout.gameWidth / 2,
        entryY,
        this.layout.gameWidth,
        GRID,
        TERRAIN_FRAMES.floor
      );
      this.buildHorizontalCheckpointSideBlocks(entryY, `${chunkId}-entry`);
    }
  }

  /** Invisible side colliders — block roof escapes outside the tower column */
  private buildHorizontalCheckpointSideBlocks(
    y: number,
    chunkId: string
  ): void {
    const leftWidth = this.layout.towerLeft;
    if (leftWidth > 0) {
      const left = this.addInvisibleStaticBody(
        this.walls,
        leftWidth / 2,
        y,
        leftWidth,
        GRID
      );
      left.setData('chunkId', chunkId);
    }

    const rightStart = this.layout.towerRight;
    const rightWidth = this.layout.gameWidth - rightStart;
    if (rightWidth > 0) {
      const right = this.addInvisibleStaticBody(
        this.walls,
        rightStart + rightWidth / 2,
        y,
        rightWidth,
        GRID
      );
      right.setData('chunkId', chunkId);
    }
  }

  private registerHorizontalWrapBodies(
    wrap: HorizontalWrapSystem,
    chunkId: string,
    defaultScrollSpeed: number
  ): void {
    for (const child of this.platforms.getChildren()) {
      const rect = child as Phaser.GameObjects.Rectangle;
      if (rect.getData('chunkId') !== chunkId) continue;

      const scrollDir = (rect.getData('scrollDir') as 1 | -1 | undefined) ?? 1;
      const scrollSpeed =
        scrollDir === -1 ? HORIZONTAL_WRAP_REVERSE_SPEED : defaultScrollSpeed;
      wrap.register(rect, scrollDir, scrollSpeed);
    }
  }

  private buildWalls(definition: LevelDefinition, worldY: number): void {
    if (definition.mode === 'horizontalWrap') return;

    const roomHeight = definition.heightInTiles * GRID;
    const wallWidth = GRID;

    this.addWall(this.layout.towerLeft, worldY, wallWidth, roomHeight, false);
    this.addWall(
      this.layout.towerRight - wallWidth,
      worldY,
      wallWidth,
      roomHeight,
      true
    );
  }

  private resolvePlatformTile(
    definition: LevelDefinition,
    platform: TileRect
  ): TileRect {
    if (definition.mode !== 'horizontalWrap') {
      return platform;
    }

    const widthInTiles = this.layout.wrapWidthInTiles();
    const scaledW = this.layout.scaleWrapTile(platform.w, widthInTiles);
    return {
      x: this.layout.scaleWrapTile(platform.x, widthInTiles),
      y: platform.y,
      w: Math.max(
        HORIZONTAL_WRAP_MIN_PLATFORM_TILES,
        Math.min(HORIZONTAL_WRAP_MAX_PLATFORM_TILES, scaledW)
      ),
      ...(platform.scrollDir !== undefined
        ? { scrollDir: platform.scrollDir }
        : {}),
    };
  }

  private buildPlatforms(definition: LevelDefinition, worldY: number): void {
    const chunkId = `level-${definition.level}`;
    const xOffset =
      definition.mode === 'horizontalWrap' ? 0 : this.layout.towerLeft;

    for (const platform of definition.platforms) {
      const tile = this.resolvePlatformTile(definition, platform);
      const x = xOffset + tile.x * GRID + (tile.w * GRID) / 2;
      const y = worldY + tile.y * GRID + GRID / 2;
      const w = tile.w * GRID;
      const h = GRID;
      const rect = this.addStaticBody(
        this.platforms,
        x,
        y,
        w,
        h,
        TERRAIN_FRAMES.platform
      );
      rect.setData('chunkId', chunkId);
      if (definition.mode === 'horizontalWrap' && platform.scrollDir !== undefined) {
        rect.setData('scrollDir', platform.scrollDir);
      }
    }
  }

  private addWall(
    x: number,
    y: number,
    w: number,
    h: number,
    flipX: boolean
  ): void {
    this.addStaticBody(
      this.walls,
      x + w / 2,
      y + h / 2,
      w,
      h,
      TERRAIN_FRAMES.wall,
      { flipX }
    );
  }

  private addInvisibleStaticBody(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    w: number,
    h: number
  ): Phaser.GameObjects.Rectangle {
    const rect = this.scene.add.rectangle(x, y, w, h, 0x000000, 0);
    this.scene.physics.add.existing(rect, true);
    group.add(rect);
    return rect;
  }

  private addStaticBody(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    w: number,
    h: number,
    terrainFrame: number,
    options?: { tint?: number; flipX?: boolean }
  ): Phaser.GameObjects.Rectangle {
    const rect = this.scene.add.rectangle(x, y, w, h, 0x000000, 0);
    this.scene.physics.add.existing(rect, true);
    attachTerrainVisual(this.scene, rect, terrainFrame, options);
    group.add(rect);
    return rect;
  }
}
