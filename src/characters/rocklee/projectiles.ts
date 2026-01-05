import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PLAYER_RADIUS } from "../../types";
import { ROCK_LEE_CONSTANTS } from "./constants";
import { CombatManager } from "../../managers/combat-manager";

export class LeafHurricaneProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        const owner = game.players[proj.ownerId];
        if (!owner || owner.dead) {
            proj.life = 0;
            return;
        }

        // Follow owner
        proj.pos.x = owner.pos.x;
        proj.pos.y = owner.pos.y;

        // Decrement Life
        proj.life--;

        // Sync with cooldown to lock input? (Done via cooldowns.q in Skill, but we clear it here if needed)
        // Check timer? Skill sets cooldown high.
        // We need to set the cooldown to match remaining life when this dies, or just let it expire?
        // Actually, logic is: Input locked while active. Cooldown starts AFTER?
        // Current implementation in Skill sets CD to 9999.
        // We should reset CD to actual cooldown when this ends.

        if (proj.life <= 0) {
            // Reset Cooldown
            owner.cooldowns.q = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.COOLDOWN;
            if (owner.skillStates['leaf_hurricane']) {
                delete owner.skillStates['leaf_hurricane'];
            }

            const idx = game.projectiles.indexOf(proj);
            if (idx >= 0) game.projectiles.splice(idx, 1);
            return;
        }

        // Damage Logic (Tick)
        const tickRate = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.TICK_RATE;
        if (proj.life % tickRate === 0) {
            CombatManager.checkCollision(game, proj);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        // Visuals handled by RockLeeCharacter render
    }
}
