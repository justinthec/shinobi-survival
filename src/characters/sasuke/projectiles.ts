import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PLAYER_RADIUS } from "../../types";
import { CombatManager } from "../../managers/combat-manager";

export class LightningSlashProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        if (proj.life === proj.maxLife) {
             // Hit once on first frame
             // We need custom collision logic here because it's a sector check.
             // CombatManager.checkCollision handles sector checks IF proj.type is 'lightning_slash'.
             // But we are trying to remove that hardcode.
             // So we must implement the collision check here.
             this.checkSectorCollision(game, proj);
        }
        proj.life--;
        if (proj.life <= 0) {
            const idx = game.projectiles.indexOf(proj);
            if (idx >= 0) game.projectiles.splice(idx, 1);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        // Visuals are handled by Particle 'slash' in Renderer currently.
        // If we want to move that here, we can, but the renderer loop handles particles separately.
        // However, the renderer DOES draw the sector outline for lightning_slash in `drawHitboxes`
        // and currently `Renderer.drawProjectile` does nothing for lightning_slash except restore context.
        // Let's keep it consistent: if there's nothing to draw for the projectile itself (visual is particle), draw nothing.
    }

    private checkSectorCollision(game: ShinobiClashGame, proj: ProjectileState) {
         // Check Players
         for (let id in game.players) {
            const target = game.players[id];
            if (target.id === proj.ownerId) continue;
            if (target.dead) continue;

            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);

            // Sector Check
            if (dist < proj.radius + PLAYER_RADIUS) {
                // Check Angle
                const angleToTarget = Math.atan2(target.pos.y - proj.pos.y, target.pos.x - proj.pos.x);
                let diff = angleToTarget - proj.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                // 120 degrees total = +/- 60 degrees = +/- PI/3
                if (Math.abs(diff) < Math.PI / 3) {
                        CombatManager.applyDamage(game, target, proj);
                }
            }
        }

        // Check Clones (Projectiles with hp)
        for (let j = 0; j < game.projectiles.length; j++) {
            const targetProj = game.projectiles[j];
            if (targetProj.ownerId === proj.ownerId) continue;
            // Only hit things with HP
            if (targetProj.hp === undefined) continue;

            const dist = Math.sqrt((targetProj.pos.x - proj.pos.x) ** 2 + (targetProj.pos.y - proj.pos.y) ** 2);

            if (dist < proj.radius + targetProj.radius) {
                    const angleToTarget = Math.atan2(targetProj.pos.y - proj.pos.y, targetProj.pos.x - proj.pos.x);
                    let diff = angleToTarget - proj.angle;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    if (Math.abs(diff) < Math.PI / 3) {
                        CombatManager.applyDamage(game, targetProj, proj);
                    }
            }
        }
    }
}
