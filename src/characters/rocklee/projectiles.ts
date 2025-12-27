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
            // If owner dead, expire immediately
            proj.life = 0;
        }

        proj.life--;
        if (proj.life <= 0) {
            const idx = game.projectiles.indexOf(proj);
            if (idx !== -1) {
                game.projectiles.splice(idx, 1);
            }
        } else {
             // Collision Check
             if (proj.life % ROCK_LEE_CONSTANTS.LEAF_HURRICANE.TICK_RATE === 0) {
                 CombatManager.checkCollision(game, proj);
             }
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);

        // Slower spin for wind effects
        const rotation = (time * 0.2) % (Math.PI * 2);
        ctx.rotate(rotation);

        const radius = proj.radius;

        // Draw "Wind" lines (Arcs)
        ctx.strokeStyle = "rgba(200, 200, 200, 0.5)"; // Grey/White wind
        ctx.lineWidth = 2;

        for(let i = 0; i < 4; i++) {
            ctx.rotate((Math.PI * 2) / 4);
            ctx.beginPath();
            // Draw arc segment
            ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 0.5);
            ctx.stroke();
        }

        // Draw "Dust" particles (Static relative to spin, or moving out?)
        // Let's just draw some small circles near the edge that rotate with context
        ctx.fillStyle = "rgba(150, 150, 150, 0.6)";
        for(let j = 0; j < 6; j++) {
            ctx.rotate((Math.PI * 2) / 6);
            ctx.beginPath();
            ctx.arc(radius * 0.9, 0, 3 + Math.sin(time * 0.5 + j) * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Faint outer boundary
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    calculateDamage(game: ShinobiClashGame, proj: ProjectileState): number {
        // Scale with owner stats?
        const owner = game.players[proj.ownerId];
        const mult = owner ? owner.stats.damageMult : 1;
        return (proj.damage || 10) * mult;
    }
}
