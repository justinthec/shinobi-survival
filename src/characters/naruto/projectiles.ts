import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PLAYER_RADIUS } from "../../types";
import { RasenshurikenSkill } from "./skills/RasenshurikenSkill";
import { CombatManager } from "../../managers/combat-manager";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { NarutoCharacter } from "./NarutoCharacter";
import { getPlayerColor } from "../../core/utils";

export class RasenshurikenProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        if (proj.state === 'exploding') {
            proj.life--;
            if (proj.life % 10 === 0) CombatManager.checkCollision(game, proj); // Re-using for now, will refactor
            if (proj.life <= 0) {
                 const idx = game.projectiles.indexOf(proj);
                 if (idx >= 0) game.projectiles.splice(idx, 1);
            }
            return;
        }

        // Moving
        proj.pos.x += proj.vel.x;
        proj.pos.y += proj.vel.y;

        // Spin
        proj.rotation = (proj.rotation || 0) + 0.15;

        proj.life--;

        // Collision
        const hit = CombatManager.checkCollision(game, proj);

        if (hit || proj.life <= 0) {
            proj.state = 'exploding';
            proj.life = RasenshurikenSkill.EXPLOSION_LIFE;
            proj.radius = RasenshurikenSkill.EXPLOSION_RADIUS;
            proj.vel.x = 0; proj.vel.y = 0;
            // Immediate tick on impact
            CombatManager.checkCollision(game, proj);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        ctx.scale(1.25, 1.25);

        if (proj.state === 'exploding') {
             // Tornado Visual
             ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
             for(let i=0; i<3; i++) {
                 ctx.beginPath();
                 ctx.ellipse(0, 0, proj.radius * (0.5 + i*0.2), 10, (time * 0.2) + i, 0, Math.PI*2);
                 ctx.fill();
             }
             // Core
             ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
             ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.rotate(proj.rotation || 0);
            ctx.fillStyle = '#4fd1c5';
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
            // Blades
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath(); ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(20, -10, 40, 0);
                ctx.quadraticCurveTo(20, 10, 0, 0);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    calculateDamage(game: ShinobiClashGame, proj: ProjectileState): number {
        if (proj.state === 'exploding') {
            return RasenshurikenSkill.EXPLOSION_DAMAGE;
        }
        return proj.damage || 0;
    }
}

export class CloneStrikeProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        // If punching, freeze and wait
        if (proj.actionState === 'punch') {
            proj.life--;
            if (proj.life <= 0 || (proj.hp !== undefined && proj.hp <= 0)) {
                 const idx = game.projectiles.indexOf(proj);
                 if (idx >= 0) game.projectiles.splice(idx, 1);
            }
            return;
        }

        // Find nearest enemy
        let nearest = null;
        let minDst = Infinity;
        for (let id in game.players) {
            const p = game.players[id];
            if (p.id === proj.ownerId || p.dead) continue;
            const d = Math.sqrt((p.pos.x - proj.pos.x)**2 + (p.pos.y - proj.pos.y)**2);
            if (d < minDst) { minDst = d; nearest = p; }
        }

        if (nearest) {
            const angle = Math.atan2(nearest.pos.y - proj.pos.y, nearest.pos.x - proj.pos.x);
            const speed = 2.5; // Slower than players
            proj.vel.x = Math.cos(angle) * speed;
            proj.vel.y = Math.sin(angle) * speed;
            proj.angle = angle; // Face enemy
            proj.actionState = 'run';
        } else {
            proj.vel.x = 0; proj.vel.y = 0;
            proj.actionState = 'run'; // Idle
        }

        proj.pos.x += proj.vel.x;
        proj.pos.y += proj.vel.y;
        proj.life--;

        // Check collision (Punch)
        const hit = CombatManager.checkCollision(game, proj);
        if (hit) {
             // Hit! Change to punch state for visual effect
             proj.actionState = 'punch';
             proj.life = 15; // Animation duration
             return;
        }

        if (proj.life <= 0 || (proj.hp !== undefined && proj.hp <= 0)) {
            const idx = game.projectiles.indexOf(proj);
            if (idx >= 0) game.projectiles.splice(idx, 1);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        const x = proj.pos.x;
        const y = proj.pos.y;
        const angle = proj.angle;
        const opacity = 0.8;
        const hp = proj.hp || 0;
        const maxHp = proj.maxHp || 1;
        const name = "Clone";
        const color = getPlayerColor(proj.ownerId);

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        // Use the static drawModel from NarutoCharacter for consistency
        NarutoCharacter.drawModel(ctx, opacity, proj.actionState);

        ctx.restore();

        // Health Bar
        if (maxHp > 0) {
             ctx.save();
             ctx.translate(x, y - 50);
             ctx.fillStyle = 'rgba(0,0,0,0.8)';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -20, 0, 40, 6, 3); ctx.fill();
             const pct = Math.max(0, hp / maxHp);
             ctx.fillStyle = pct > 0.5 ? '#48bb78' : '#f56565';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -18, 1, 36 * pct, 4, 2); ctx.fill();

             // Name
             ctx.font = 'bold 12px Arial';
             ctx.textAlign = 'center';
             ctx.strokeStyle = 'black';
             ctx.lineWidth = 3;
             ctx.strokeText(name, 0, -5);
             ctx.fillStyle = color; // Colored name
             ctx.fillText(name, 0, -5);

             ctx.restore();
        }
    }
}
