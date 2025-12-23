import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState } from "../../types";

export class LeafHurricaneProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        // Follow owner
        const owner = game.players[proj.ownerId];
        if (owner) {
            proj.pos.x = owner.pos.x;
            proj.pos.y = owner.pos.y;
        }

        proj.life--;
        // Spin effect could be handled here or in render via rotation
        proj.rotation = (proj.rotation || 0) + 0.5; // Fast spin
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        ctx.rotate(proj.rotation || 0);

        // Visuals for the hurricane
        ctx.strokeStyle = '#00FF00'; // Green
        ctx.lineWidth = 3;

        // Draw spinning lines
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.quadraticCurveTo(proj.radius/2, 10, proj.radius, 0);
            ctx.stroke();
        }

        // Faint fill
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    calculateDamage(game: ShinobiClashGame, proj: ProjectileState): number {
        return 5;
    }
}
