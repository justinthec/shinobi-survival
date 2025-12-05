/**
 * CombatManager - Stateless helper class for combat calculations.
 * 
 * Handles damage application, crits, character-specific passives,
 * and chain lightning bouncing.
 */

import { Vec2 } from 'netplayjs';
import { EnemyState, PlayerState, SasukeState, GaaraState, SakuraState } from '../types';

export interface DamageResult {
    finalDamage: number;
    isCrit: boolean;
    killed: boolean;
    blocked: boolean; // For dodge/shield
}

export interface LightningBounce {
    fromPos: Vec2;
    toPos: Vec2;
    targetId: number;
    damage: number;
}

export class CombatManager {
    /**
     * Calculate and apply damage to an enemy.
     * Handles crits, player buffs, and character-specific mechanics.
     */
    static damageEnemy(
        enemy: EnemyState,
        baseDamage: number,
        sourcePlayer: PlayerState,
        random: () => number
    ): DamageResult {
        if (enemy.dead) {
            return { finalDamage: 0, isCrit: false, killed: false, blocked: true };
        }

        let finalDamage = baseDamage;
        let isCrit = false;

        // Calculate crit chance
        let critChance = sourcePlayer.stats.critChance;

        // Sasuke Dodge Buff
        if (sourcePlayer.character === 'sasuke' && sourcePlayer.charState) {
            const sasukeState = sourcePlayer.charState as SasukeState;
            if (sasukeState.dodgeBuffTimer > 0) {
                critChance += 0.5; // Massive crit boost after dodge
            }
        }

        // Roll for crit
        if (random() < critChance) {
            finalDamage *= 2;
            isCrit = true;
        }

        // Sakura Passive: 5x Damage if meter full
        if (sourcePlayer.character === 'sakura' && sourcePlayer.charState) {
            const sakuraState = sourcePlayer.charState as SakuraState;
            if (sakuraState.meter >= 100) {
                finalDamage *= 5;
                sakuraState.meter = 0; // Consume meter
            }
        }

        // Apply damage
        enemy.hp -= finalDamage;
        const killed = enemy.hp <= 0;
        if (killed) {
            enemy.dead = true;
        }

        return { finalDamage, isCrit, killed, blocked: false };
    }

    /**
     * Calculate and apply damage to a player.
     * Handles dodges, shields, and character-specific defenses.
     */
    static damagePlayer(
        player: PlayerState,
        amount: number,
        random: () => number
    ): DamageResult {
        if (player.invincible || player.dead) {
            return { finalDamage: 0, isCrit: false, killed: false, blocked: true };
        }

        let remainingDamage = amount;

        // Sasuke Sharingan Dodge
        if (player.character === 'sasuke' && player.charState) {
            const sasukeState = player.charState as SasukeState;
            if (sasukeState.sharinganCooldown <= 0 && random() < 0.15) {
                // Dodge!
                sasukeState.sharinganCooldown = 5.0;
                sasukeState.dodgeBuffTimer = 2.0;
                return { finalDamage: 0, isCrit: false, killed: false, blocked: true };
            }
        }

        // Gaara Passive: Shield
        if (player.character === 'gaara' && player.charState) {
            const gaaraState = player.charState as GaaraState;
            if (gaaraState.shieldHp > 0) {
                const absorb = Math.min(gaaraState.shieldHp, remainingDamage);
                gaaraState.shieldHp -= absorb;
                remainingDamage -= absorb;
                gaaraState.shieldRegenTimer = 0; // Reset regen timer
                if (remainingDamage <= 0) {
                    return { finalDamage: absorb, isCrit: false, killed: false, blocked: true };
                }
            } else {
                gaaraState.shieldRegenTimer = 0;
            }
        }

        // Sakura Passive: Charge Meter when damaged
        if (player.character === 'sakura' && player.charState) {
            const sakuraState = player.charState as SakuraState;
            sakuraState.meter = Math.min(sakuraState.meter + 10, 100);
        }

        // Apply remaining damage
        player.hp -= remainingDamage;
        player.flash = 0.1;

        const killed = player.hp <= 0;
        if (killed) {
            player.dead = true;
        }

        return { finalDamage: remainingDamage, isCrit: false, killed, blocked: false };
    }

    /**
     * Calculate crit chance and result.
     */
    static calculateCrit(
        baseChance: number,
        random: () => number
    ): { isCrit: boolean; multiplier: number } {
        const isCrit = random() < baseChance;
        return { isCrit, multiplier: isCrit ? 2 : 1 };
    }

    /**
     * Process chain lightning bounces.
     * Returns array of bounce info for visual rendering.
     */
    static chainLightning(
        enemies: EnemyState[],
        sourcePlayer: PlayerState,
        startPos: Vec2,
        damage: number,
        bounces: number,
        range: number,
        excludeIds: number[],
        random: () => number
    ): LightningBounce[] {
        const results: LightningBounce[] = [];

        let currentPos = new Vec2(startPos.x, startPos.y);
        let currentDamage = damage;
        let remainingBounces = bounces;
        const hitIds = [...excludeIds];

        while (remainingBounces > 0) {
            // Find nearest valid target
            let closestEnemy: EnemyState | null = null;
            let minDist = range;

            for (const e of enemies) {
                if (e.dead || hitIds.includes(e.id)) continue;
                const d = Math.sqrt(
                    (currentPos.x - e.pos.x) ** 2 +
                    (currentPos.y - e.pos.y) ** 2
                );
                if (d < minDist) {
                    minDist = d;
                    closestEnemy = e;
                }
            }

            if (!closestEnemy) break;

            // Apply damage
            const dmgResult = CombatManager.damageEnemy(
                closestEnemy,
                currentDamage,
                sourcePlayer,
                random
            );

            results.push({
                fromPos: new Vec2(currentPos.x, currentPos.y),
                toPos: new Vec2(closestEnemy.pos.x, closestEnemy.pos.y),
                targetId: closestEnemy.id,
                damage: dmgResult.finalDamage
            });

            // Setup for next bounce
            hitIds.push(closestEnemy.id);
            currentPos = new Vec2(closestEnemy.pos.x, closestEnemy.pos.y);
            currentDamage *= 0.8; // Damage decay
            remainingBounces--;
        }

        return results;
    }

    /**
     * Apply knockback to an enemy
     */
    static applyKnockback(
        enemy: EnemyState,
        sourcePos: Vec2,
        force: number
    ): void {
        const angle = Math.atan2(enemy.pos.y - sourcePos.y, enemy.pos.x - sourcePos.x);
        enemy.push.x += Math.cos(angle) * force;
        enemy.push.y += Math.sin(angle) * force;
    }
}
