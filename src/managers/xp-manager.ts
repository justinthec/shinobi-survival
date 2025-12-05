/**
 * XpManager - Stateless helper class for XP orb management.
 * 
 * Handles XP orb spawning, collection, merging, and level-up checks.
 */

import { Vec2 } from 'netplayjs';
import { XpOrbState, PlayerState } from '../types';

export interface XpCollectionResult {
    collectedXP: number;
    orbsCollected: number;
}

export class XpManager {
    /**
     * Spawn a new XP orb at the given position
     */
    static spawnOrb(
        orbs: XpOrbState[],
        pos: Vec2,
        value: number,
        nextId: number
    ): number {
        orbs.push({
            id: nextId,
            pos: new Vec2(pos.x, pos.y),
            val: value,
            dead: false
        });
        return nextId + 1;
    }

    /**
     * Update XP orbs - handle magnet movement and collection
     */
    static update(
        orbs: XpOrbState[],
        players: Record<number, PlayerState>,
        dt: number
    ): XpCollectionResult {
        const magnetRange = 50;
        const collectRange = 20;
        const magnetSpeed = 300;
        let collectedXP = 0;
        let orbsCollected = 0;

        for (let i = orbs.length - 1; i >= 0; i--) {
            const orb = orbs[i];
            if (orb.dead) {
                orbs.splice(i, 1);
                continue;
            }

            // Find nearest alive player
            let nearestPlayer: PlayerState | null = null;
            let minDist = Infinity;

            for (const id in players) {
                const p = players[id];
                if (p.dead) continue;
                const dist = Math.sqrt(
                    (p.pos.x - orb.pos.x) ** 2 + (p.pos.y - orb.pos.y) ** 2
                );
                if (dist < minDist) {
                    minDist = dist;
                    nearestPlayer = p;
                }
            }

            if (nearestPlayer && minDist < magnetRange) {
                // Move orb towards player
                const angle = Math.atan2(
                    nearestPlayer.pos.y - orb.pos.y,
                    nearestPlayer.pos.x - orb.pos.x
                );
                orb.pos.x += Math.cos(angle) * magnetSpeed * dt;
                orb.pos.y += Math.sin(angle) * magnetSpeed * dt;

                // Check for collection
                const newDist = Math.sqrt(
                    (nearestPlayer.pos.x - orb.pos.x) ** 2 +
                    (nearestPlayer.pos.y - orb.pos.y) ** 2
                );
                if (newDist < collectRange) {
                    collectedXP += orb.val;
                    orbsCollected++;
                    orbs.splice(i, 1);
                }
            }
        }

        return { collectedXP, orbsCollected };
    }

    /**
     * Merge the oldest orb into the nearest one when at capacity
     */
    static mergeOldestOrb(orbs: XpOrbState[], maxOrbs: number): void {
        if (orbs.length <= maxOrbs) return;

        // Oldest orb is at index 0 (we push to end)
        const oldestOrb = orbs[0];

        // Find nearest orb to merge into
        let nearestOrb: XpOrbState | null = null;
        let minDist = Infinity;

        for (let i = 1; i < orbs.length; i++) {
            const other = orbs[i];
            const d = Math.sqrt(
                (oldestOrb.pos.x - other.pos.x) ** 2 +
                (oldestOrb.pos.y - other.pos.y) ** 2
            );
            if (d < minDist) {
                minDist = d;
                nearestOrb = other;
            }
        }

        if (nearestOrb) {
            nearestOrb.val += oldestOrb.val;
        }

        // Remove oldest
        orbs.shift();
    }

    /**
     * Check if team should level up
     */
    static checkLevelUp(teamXP: number, xpToNextLevel: number): boolean {
        return teamXP >= xpToNextLevel;
    }

    /**
     * Calculate XP required for next level
     */
    static getXpForNextLevel(currentLevel: number, baseXp: number = 300): number {
        return Math.floor(baseXp * Math.pow(1.2, currentLevel - 1));
    }
}
