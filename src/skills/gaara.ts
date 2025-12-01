import { SkillLogic, SkillState } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";
import { Vec2 } from "netplayjs";

export class SandCoffinSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            // Damage enemies around player
            for (const e of game.enemies) {
                const d = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
                if (d < 200) {
                    const dmg = 50 * player.stats.damageMult;
                    e.hp -= dmg;
                    game.spawnFloatingText(e.pos, Math.ceil(dmg).toString(), 'white');
                }
            }
            state.cooldown = 5.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}

export class PyramidSealSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            // Pyramid Seal
            // Big damage area
            for (const e of game.enemies) {
                const d = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
                if (d < 300) {
                    const dmg = 100 * player.stats.damageMult;
                    e.hp -= dmg;
                    game.spawnFloatingText(e.pos, Math.ceil(dmg).toString(), 'white');
                    e.stunTimer = 3.0;
                }
            }
            state.cooldown = 25.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}
