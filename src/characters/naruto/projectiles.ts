import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PLAYER_RADIUS } from "../../types";
import { RasenshurikenSkill } from "./skills/RasenshurikenSkill";
import { CombatManager } from "../../managers/combat-manager";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";

export class RasenshurikenProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        if (proj.state === 'exploding') {
            proj.life -= game.gameSpeed;

            // Logic refactor for float-based life
            if (proj.tickTimer === undefined) proj.tickTimer = 0;
            proj.tickTimer += game.gameSpeed;

            if (proj.tickTimer >= 10) {
                 CombatManager.checkCollision(game, proj);
                 proj.tickTimer -= 10;
            }

            if (proj.life <= 0) {
                 const idx = game.projectiles.indexOf(proj);
                 if (idx >= 0) game.projectiles.splice(idx, 1);
            }
            return;
        }

        // Moving
        proj.pos.x += proj.vel.x * game.gameSpeed;
        proj.pos.y += proj.vel.y * game.gameSpeed;

        // Spin
        proj.rotation = (proj.rotation || 0) + 0.15 * game.gameSpeed;

        proj.life -= game.gameSpeed;

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
            proj.life -= game.gameSpeed;
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

        proj.pos.x += proj.vel.x * game.gameSpeed;
        proj.pos.y += proj.vel.y * game.gameSpeed;
        proj.life -= game.gameSpeed;

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
        CharacterRendererHelper.drawNinjaBody(
            ctx,
            proj.pos.x,
            proj.pos.y,
            proj.angle,
            'naruto',
            proj.hp || 0,
            proj.maxHp || 1,
            "Clone",
            time,
            true,
            1,
            null,
            proj.actionState
        );
    }
}
