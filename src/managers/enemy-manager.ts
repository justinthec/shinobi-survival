/**
 * EnemyManager - Stateless helper class for enemy management.
 * 
 * Handles enemy spawning, movement, AI, DoT processing, and cleanup.
 */

import { Vec2 } from 'netplayjs';
import { EnemyState, PlayerState, MapState } from '../types';

export interface SpawnConfig {
    gameTime: number;
    mapWidth: number;
    mapHeight: number;
}

export class EnemyManager {
    /**
     * Determine enemy type based on game time
     */
    static getEnemyType(gameTime: number, random: () => number): string {
        const rand = random();

        if (gameTime < 60) {
            return rand < 0.9 ? 'zetsu' : 'sound';
        } else if (gameTime < 120) {
            return rand < 0.6 ? 'zetsu' : (rand < 0.9 ? 'sound' : 'snake');
        } else {
            return rand < 0.4 ? 'zetsu' : (rand < 0.7 ? 'sound' : 'snake');
        }
    }

    /**
     * Get spawn position on map edge
     */
    static getSpawnPosition(
        mapWidth: number,
        mapHeight: number,
        random: () => number
    ): Vec2 {
        const edge = Math.floor(random() * 4);

        switch (edge) {
            case 0: // Top
                return new Vec2(random() * mapWidth, -20);
            case 1: // Right
                return new Vec2(mapWidth + 20, random() * mapHeight);
            case 2: // Bottom
                return new Vec2(random() * mapWidth, mapHeight + 20);
            default: // Left
                return new Vec2(-20, random() * mapHeight);
        }
    }

    /**
     * Get enemy stats based on type and game time
     */
    static getEnemyStats(type: string, gameTime: number): { hp: number; speed: number } {
        const timeScale = 1 + (gameTime / 60);

        switch (type) {
            case 'sound':
                return { hp: 15 * timeScale, speed: 210 };
            case 'snake':
                return { hp: 200 * timeScale, speed: 90 };
            default: // zetsu
                return { hp: 20 * timeScale, speed: 100 };
        }
    }

    /**
     * Spawn a new enemy
     */
    static spawn(
        enemies: EnemyState[],
        nextId: number,
        config: SpawnConfig,
        random: () => number
    ): number {
        const type = EnemyManager.getEnemyType(config.gameTime, random);
        const pos = EnemyManager.getSpawnPosition(config.mapWidth, config.mapHeight, random);
        const stats = EnemyManager.getEnemyStats(type, config.gameTime);

        enemies.push({
            id: nextId,
            type,
            pos,
            hp: stats.hp,
            maxHp: stats.hp,
            dead: false,
            burnStacks: 0,
            bleedStacks: 0,
            slowTimer: 0,
            stunTimer: 0,
            dotTimer: 0,
            push: new Vec2(0, 0),
            rooted: false,
            damageDebuff: 1.0,
            speedMult: 1.0,
            shape: { type: 'circle', radius: 20 }
        });

        return nextId + 1;
    }

    /**
     * Find the closest alive player to an enemy
     */
    static findClosestPlayer(
        enemy: EnemyState,
        players: Record<number, PlayerState>
    ): { player: PlayerState | null; distance: number } {
        let closest: PlayerState | null = null;
        let minDist = Infinity;

        for (const id in players) {
            const p = players[id];
            if (p.dead) continue;

            const d = Math.sqrt(
                (p.pos.x - enemy.pos.x) ** 2 +
                (p.pos.y - enemy.pos.y) ** 2
            );
            if (d < minDist) {
                minDist = d;
                closest = p;
            }
        }

        return { player: closest, distance: minDist };
    }

    /**
     * Update enemy movement toward target
     */
    static updateMovement(
        enemy: EnemyState,
        target: PlayerState,
        dt: number
    ): void {
        const angle = Math.atan2(
            target.pos.y - enemy.pos.y,
            target.pos.x - enemy.pos.x
        );

        // Apply root
        if (enemy.rooted) {
            enemy.speedMult = 0;
        }

        const speed = 50 * enemy.speedMult;

        // Move toward target + apply knockback
        enemy.pos.x += (Math.cos(angle) * speed + enemy.push.x) * dt;
        enemy.pos.y += (Math.sin(angle) * speed + enemy.push.y) * dt;

        // Decay knockback
        enemy.push.x *= 0.95;
        enemy.push.y *= 0.95;
    }

    /**
     * Process bleed damage on enemy
     */
    static processBleed(enemy: EnemyState, dt: number): number {
        if (enemy.bleedStacks <= 0) return 0;

        enemy.dotTimer -= dt;
        if (enemy.dotTimer <= 0) {
            enemy.dotTimer = 1.0;
            const bleedDmg = enemy.bleedStacks * 5;
            enemy.hp -= bleedDmg;
            return bleedDmg;
        }
        return 0;
    }

    /**
     * Constrain enemy to map bounds
     */
    static constrainToMap(
        enemy: EnemyState,
        mapWidth: number,
        mapHeight: number,
        radius: number = 20
    ): void {
        if (enemy.pos.x < radius) enemy.pos.x = radius;
        if (enemy.pos.x > mapWidth - radius) enemy.pos.x = mapWidth - radius;
        if (enemy.pos.y < radius) enemy.pos.y = radius;
        if (enemy.pos.y > mapHeight - radius) enemy.pos.y = mapHeight - radius;
    }

    /**
     * Reset per-frame state
     */
    static resetFrameState(enemy: EnemyState): void {
        enemy.speedMult = 1.0;
    }

    /**
     * Remove dead enemies
     */
    static cleanup(enemies: EnemyState[]): void {
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (enemies[i].dead) {
                enemies.splice(i, 1);
            }
        }
    }

    /**
     * Check if enemy is in contact damage range with player
     */
    static checkContactDamage(
        enemy: EnemyState,
        player: PlayerState,
        contactRadius: number = 30
    ): boolean {
        const d = Math.sqrt(
            (player.pos.x - enemy.pos.x) ** 2 +
            (player.pos.y - enemy.pos.y) ** 2
        );
        return d < contactRadius;
    }
}
