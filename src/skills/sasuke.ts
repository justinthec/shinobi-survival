import { SkillLogic, SkillState } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";
import { Vec2 } from "netplayjs";
import { SPRITES } from "../sprites";

export class AmaterasuSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            game.hazards.push({
                id: game.nextEntityId++,
                pos: new Vec2(player.pos.x, player.pos.y),
                radius: 100,
                duration: 5.0,
                damage: 5,
                type: 'fire',
                ownerId: player.id
            });
            state.cooldown = 5.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}

export class SusanooSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }

        if (state.activeTime > 0) {
            state.activeTime -= dt;
            player.ultActiveTime = state.activeTime;

            // Susanoo Area Damage
            for (const e of game.enemies) {
                const d = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
                if (d < 150) {
                    const dmg = 2 * player.stats.damageMult;
                    e.hp -= dmg;
                    if (Math.random() < 0.3) game.spawnFloatingText(e.pos, Math.ceil(dmg).toString(), 'white');
                }
            }
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.activeTime = 6.0;
            state.cooldown = 25.0 * player.stats.cooldownMult;
            player.ultActiveTime = 6.0;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.activeTime > 0) {
            ctx.save(); ctx.globalAlpha = 0.8;
            if (SPRITES.susanoo) ctx.drawImage(SPRITES.susanoo, player.pos.x - 150, player.pos.y - 180);
            ctx.restore();
        }
    }
}
