import { SkillLogic, SkillState } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";
import { Vec2 } from "netplayjs";

export class ChakraScalpelSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;

        if (state.activeTime > 0) {
            state.activeTime -= dt;
            // Buff logic is handled in damageEnemy (applying bleed)
            // Visuals can be handled in draw
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.activeTime = 5.0; // 5s duration
            state.cooldown = 12.0 * player.stats.cooldownMult;
            game.spawnFloatingText(player.pos, "Scalpel!", "pink");
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.activeTime > 0) {
            // Glow hands?
            ctx.save();
            ctx.translate(player.pos.x, player.pos.y);
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.strokeStyle = "cyan";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    }
}

export class HealSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            // Heal Self
            const healAmount = 50;
            player.hp = Math.min(player.hp + healAmount, player.maxHp);
            game.spawnFloatingText(player.pos, "+" + healAmount, "green");

            // Heal Allies (AoE)
            for (let id in game.players) {
                const p = game.players[id];
                if (p.id === player.id) continue;
                if (p.dead) continue;

                const d = Math.sqrt((player.pos.x - p.pos.x) ** 2 + (player.pos.y - p.pos.y) ** 2);
                if (d < 300) {
                    p.hp = Math.min(p.hp + healAmount, p.maxHp);
                    game.spawnFloatingText(p.pos, "+" + healAmount, "green");
                }
            }

            state.cooldown = 15.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}

export class KatsuyuSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;

        if (state.activeTime > 0) {
            state.activeTime -= dt;
            player.ultActiveTime = state.activeTime;

            // Healing Zone logic
            // Heal all players in range every second
            // We can use a timer or just add small amount every frame
            // Let's add small amount every frame for smoothness
            const healRate = 20 * dt; // 20 HP/s

            for (let id in game.players) {
                const p = game.players[id];
                if (p.dead) continue;
                const d = Math.sqrt((player.pos.x - p.pos.x) ** 2 + (player.pos.y - p.pos.y) ** 2);
                if (d < 300) {
                    p.hp = Math.min(p.hp + healRate, p.maxHp);
                }
            }

            // Damage Enemies (Acid)
            for (const e of game.enemies) {
                const d = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
                if (d < 300) {
                    const dmg = 20 * dt * player.stats.damageMult;
                    game.damageEnemy(e, dmg, player);
                    // Apply Slow
                    e.speedMult = 0.5;
                }
            }
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.activeTime = 8.0;
            state.cooldown = 60.0 * player.stats.cooldownMult;
            player.ultActiveTime = 8.0;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.activeTime > 0) {
            // Draw Katsuyu (Slug)
            ctx.save();
            ctx.translate(player.pos.x, player.pos.y);

            // Healing Zone
            ctx.beginPath();
            ctx.arc(0, 0, 300, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
            ctx.fill();
            ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Slug Body
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.ellipse(0, 0, 60, 40, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "blue";
            ctx.beginPath();
            ctx.ellipse(0, -10, 40, 20, 0, 0, Math.PI * 2); // Stripe
            ctx.fill();

            ctx.restore();
        }
    }
}
