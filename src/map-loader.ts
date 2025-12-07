import { MapState, MapTile, TileTextureType } from './types';
import testMapData from './maps/test-map.json';
// import testMapData from './maps/small-map.json';

/**
 * Creates a default map filled with grass tiles
 */
export function createDefaultMap(width: number, height: number, tileSize: number): MapState {
    const tiles: MapTile[][] = [];

    for (let y = 0; y < height; y++) {
        const row: MapTile[] = [];
        for (let x = 0; x < width; x++) {
            row.push({
                textureType: 'grass',
                blocksEnemyMovement: false,
                blocksEnemyProjectiles: false,
                blocksPlayerMovement: false,
                blocksPlayerProjectiles: false,
                enemySpawnPoint: false
            });
        }
        tiles.push(row);
    }

    return { tiles, width, height, tileSize };
}

/**
 * Loads a map from JSON data
 */
export function loadMapFromJson(jsonData: any): MapState {
    const { width, height, tileSize, tiles } = jsonData;

    // Validate and convert tiles
    const mapTiles: MapTile[][] = tiles.map((row: any[]) =>
        row.map((tile: any) => ({
            textureType: tile.textureType as TileTextureType,
            blocksEnemyMovement: tile.blocksEnemyMovement ?? false,
            blocksEnemyProjectiles: tile.blocksEnemyProjectiles ?? false,
            blocksPlayerMovement: tile.blocksPlayerMovement ?? false,
            blocksPlayerProjectiles: tile.blocksPlayerProjectiles ?? false,
            enemySpawnPoint: tile.enemySpawnPoint ?? false,
            spawnerType: tile.spawnerType
        }))
    );

    return {
        tiles: mapTiles,
        width,
        height,
        tileSize
    };
}

/**
 * Gets the tile at a world position
 */
export function getTileAtPosition(map: MapState, worldX: number, worldY: number): MapTile | null {
    const tileX = Math.floor(worldX / map.tileSize);
    const tileY = Math.floor(worldY / map.tileSize);

    if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
        return null;
    }

    return map.tiles[tileY][tileX];
}

/**
 * Checks if a position blocks player movement
 */
export function blocksPlayerMovement(map: MapState, worldX: number, worldY: number): boolean {
    const tile = getTileAtPosition(map, worldX, worldY);
    return tile ? tile.blocksPlayerMovement : true; // Out of bounds blocks movement
}

/**
 * Checks if a position blocks enemy movement
 */
export function blocksEnemyMovement(map: MapState, worldX: number, worldY: number): boolean {
    const tile = getTileAtPosition(map, worldX, worldY);
    return tile ? tile.blocksEnemyMovement : true;
}

/**
 * Checks if a position blocks player projectiles
 */
export function blocksPlayerProjectile(map: MapState, worldX: number, worldY: number): boolean {
    const tile = getTileAtPosition(map, worldX, worldY);
    return tile ? tile.blocksPlayerProjectiles : true;
}

/**
 * Checks if a position blocks enemy projectiles
 */
export function blocksEnemyProjectile(map: MapState, worldX: number, worldY: number): boolean {
    const tile = getTileAtPosition(map, worldX, worldY);
    return tile ? tile.blocksEnemyProjectiles : true;
}

/**
 * Loads the test map
 */
export function loadTestMap(): MapState {
    return loadMapFromJson(testMapData);
}
