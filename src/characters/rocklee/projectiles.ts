import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PlayerState } from "../../types";
import { ProjectileDefinition } from "../../core/interfaces";
import { CombatManager } from "../../managers/combat-manager";
import { ROCK_LEE_CONSTANTS } from "./constants";

export class LeafHurricaneProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        // Find owner to attach position
        const owner = game.players[proj.ownerId];
        if (owner && !owner.dead) {
            proj.pos.x = owner.pos.x;
            proj.pos.y = owner.pos.y;
        } else {
            // If owner dead, expire immediately? Or just stay at last pos?
            // "Spinning kick around him". If dead, he stops kicking.
            proj.life = 0;
        }

        proj.life--;
        if (proj.life <= 0) {
            // Cleanup handled by CombatManager
        } else {
             // Collision Check
             // Since it's attached to player, we check collision every frame it's active
             // To prevent multi-hit on same target, we might need tracking.
             // But simpler design: Tick rate or single hit.

             // Use `rotation` field as a tick timer if available, or just use life % rate
             if (proj.life % ROCK_LEE_CONSTANTS.LEAF_HURRICANE.TICK_RATE === 0) {
                 CombatManager.checkCollision(game, proj);
             }
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);

        // Spin effect
        // 2 or 3 swirling lines/arcs
        const rotation = (time * 0.5) % (Math.PI * 2);

        ctx.rotate(rotation);

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
        ctx.lineWidth = 4;

        // Draw spiral/swirl
        for(let i = 0; i < 3; i++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.beginPath();
            ctx.arc(0, 0, proj.radius, 0, Math.PI * 0.8);
            ctx.stroke();
        }

        ctx.restore();
    }

    calculateDamage(game: ShinobiClashGame, proj: ProjectileState): number {
        // Scale with owner stats?
        const owner = game.players[proj.ownerId];
        const mult = owner ? owner.stats.damageMult : 1;
        return (proj.damage || 10) * mult;
    }
}
