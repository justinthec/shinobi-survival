import { SkillLogic, SkillState } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";

export class HealSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) state.cooldown -= dt;
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            player.hp = Math.min(player.hp + 50, player.maxHp);
            game.spawnFloatingText(player.pos, "+50", "green");
            state.cooldown = 5.0 * player.stats.cooldownMult;
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
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.activeTime = 6.0;
            player.ultActiveTime = 6.0;
            state.cooldown = 25.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}
