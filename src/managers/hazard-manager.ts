/**
 * HazardManager - Stateless helper class for hazard zones.
 * 
 * Handles hazard updates, damage ticks, and cleanup.
 */

import { Vec2 } from 'netplayjs';
import { HazardZoneState, EnemyState, PlayerState } from '../types';
import { SpatialHash } from '../spatial-hash';

export class HazardManager {
    /**
     * Update all hazards - apply duration decay and effects
     */
    static update(
        hazards: HazardZoneState[],
        enemies: EnemyState[],
        players: Record<number, PlayerState>,
        spatialHash: SpatialHash,
        dt: number,
        damageEnemyCallback: (enemy: EnemyState, damage: number, source: PlayerState) => void
    ): void {
        const DOT_TICK_INTERVAL = 10 / 60; // Tick every ~10 frames

        for (const h of hazards) {
            h.duration -= dt;
            h.tickTimer = (h.tickTimer || 0) + dt;

            // Find owner player
            const owner = players[h.ownerId];
            if (!owner) continue;

            // Only apply damage on tick intervals
            if (h.tickTimer < DOT_TICK_INTERVAL) continue;
            h.tickTimer = 0;

            // Apply effects based on hazard type
            for (const e of enemies) {
                if (e.dead) continue;

                // Check collision with hazard
                const inHazard = spatialHash.checkCollision(h, e);
                if (!inHazard) continue;

                switch (h.type) {
                    case 'acid':
                    case 'fire':
                        damageEnemyCallback(e, h.damage * DOT_TICK_INTERVAL, owner);
                        break;
                    case 'quicksand':
                        // Slow + damage
                        e.speedMult = 0.3;
                        damageEnemyCallback(e, h.damage * DOT_TICK_INTERVAL, owner);
                        break;
                    case 'amaterasu':
                        // High damage black fire
                        damageEnemyCallback(e, h.damage * DOT_TICK_INTERVAL * 2, owner);
                        break;
                }
            }
        }
    }

    /**
     * Remove expired hazards
     */
    static cleanup(hazards: HazardZoneState[]): void {
        for (let i = hazards.length - 1; i >= 0; i--) {
            if (hazards[i].duration <= 0) {
                hazards.splice(i, 1);
            }
        }
    }

    /**
     * Create a new hazard zone
     */
    static spawn(
        hazards: HazardZoneState[],
        nextId: number,
        pos: Vec2,
        radius: number,
        duration: number,
        damage: number,
        type: string,
        ownerId: number
    ): number {
        hazards.push({
            id: nextId,
            pos: new Vec2(pos.x, pos.y),
            radius,
            duration,
            damage,
            type,
            ownerId,
            shape: { type: 'circle', radius },
            tickTimer: 0
        });
        return nextId + 1;
    }
}
