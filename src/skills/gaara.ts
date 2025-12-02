import { SkillLogic, SkillState, CharacterLogic } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";
import { Vec2 } from "netplayjs";

export class DesertQuicksandSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            // Spawn Quicksand Hazard
            game.hazards.push({
                id: game.nextEntityId++,
                pos: new Vec2(player.pos.x, player.pos.y),
                radius: 200,
                duration: 5.0,
                damage: 20 * player.stats.damageMult, // DPS
                type: 'quicksand', // Slows enemies (handled in game loop)
                ownerId: player.id
            });
            state.cooldown = 8.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}

export class SphereOfSandSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;

        if (state.activeTime > 0) {
            state.activeTime -= dt;
            player.invincible = true;

            // AoE Damage around player (Thorns/Reflection)
            for (const e of game.enemies) {
                const d = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
                if (d < 100) { // Close range
                    const dmg = 50 * dt * player.stats.damageMult; // DPS
                    game.damageEnemy(e, dmg, player);
                }
            }
        } else {
            // Reset invincibility if this skill was active
            // Similar logic to Naruto's Ult, we need to be careful
            if (player.character === 'gaara' && player.ultActiveTime <= 0) {
                // If not in Ult (which might also set invincibility?)
                // Gaara's Ult doesn't set invincibility explicitly in design, but maybe it should?
                // For now, just reset.
                player.invincible = false;
            }
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.activeTime = 3.0;
            state.cooldown = 15.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.activeTime > 0) {
            // Draw Sphere
            ctx.save();
            ctx.translate(player.pos.x, player.pos.y);
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(194, 178, 128, 0.5)"; // Sand color
            ctx.fill();
            ctx.strokeStyle = "rgba(194, 178, 128, 1)";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }
    }
}

export class GaaraLogic implements CharacterLogic {
    updatePassives(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (player.dead) return;

        if (player.character === 'gaara' && player.charState && 'shieldHp' in player.charState) {
            player.charState.shieldRegenTimer += dt;
            if (player.charState.shieldRegenTimer >= 8.0) {
                if (player.charState.shieldHp < 50) {
                    player.charState.shieldHp += 10 * dt;
                    if (player.charState.shieldHp > 50) player.charState.shieldHp = 50;
                }
            }
        }
    }
}

export class GrandSandMausoleumSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;

        if (state.activeTime > 0) {
            state.activeTime -= dt;
            player.ultActiveTime = state.activeTime;

            // Root all enemies
            for (const e of game.enemies) {
                e.rooted = true;
            }

            if (state.activeTime <= 0) {
                // Finish: Deal massive damage
                for (const e of game.enemies) {
                    e.rooted = false; // Release root
                    const dmg = 500 * player.stats.damageMult;
                    game.damageEnemy(e, dmg, player);
                }
            }
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.activeTime = 2.0; // 2s delay
            state.cooldown = 60.0 * player.stats.cooldownMult;
            player.ultActiveTime = 2.0;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.activeTime > 0) {
            // Draw Sand covering screen?
            ctx.save();
            ctx.fillStyle = "rgba(194, 178, 128, 0.3)";
            // We don't have canvas size here easily? 
            // We can draw a huge rect centered on player
            ctx.fillRect(player.pos.x - 1000, player.pos.y - 1000, 2000, 2000);

            // Draw Pyramid on each enemy?
            for (const e of game.enemies) {
                ctx.save();
                ctx.translate(e.pos.x, e.pos.y);
                ctx.beginPath();
                ctx.moveTo(0, -30);
                ctx.lineTo(20, 10);
                ctx.lineTo(-20, 10);
                ctx.closePath();
                ctx.fillStyle = "rgba(194, 178, 128, 0.8)";
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }
    }
}
