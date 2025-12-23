import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState, ProjectileState, PLAYER_RADIUS } from "../types";
import { SkillRegistry } from "../skills/SkillRegistry";
import { ProjectileRegistry } from "../core/registries";
import { RasenshurikenSkill } from "../characters/naruto/skills/RasenshurikenSkill";

export class CombatManager {

    static processInput(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        if (p.dead) {
            if (input.keysPressed['ArrowLeft']) this.cycleSpectator(game, p, -1);
            if (input.keysPressed['ArrowRight']) this.cycleSpectator(game, p, 1);
            return;
        }

        if (p.casting > 0) {
            p.casting -= game.gameSpeed;
            return; // Stunned while casting
        }

        // 1. Movement
        this.handleMovement(game, p, input);

        let targetPos = new Vec2(p.pos.x, p.pos.y);

        // 2. Aiming
        if (input.mousePosition) {
            // Fixed Resolution Logic to prevent desync
            const screenW = ShinobiClashGame.canvasSize.width; // 1280
            const screenH = ShinobiClashGame.canvasSize.height; // 720

            // Center of screen is where player is drawn
            const cx = screenW / 2;
            const cy = screenH / 2;

            const mx = input.mousePosition.x - cx;
            const my = input.mousePosition.y - cy;

            p.angle = Math.atan2(my, mx);

            // Calculate World Target Position
            targetPos.x = p.pos.x + mx;
            targetPos.y = p.pos.y + my;
        }

        // 3. Cooldowns
        if (p.cooldowns.q > 0) p.cooldowns.q -= game.gameSpeed;
        if (p.cooldowns.e > 0) p.cooldowns.e -= game.gameSpeed;
        if (p.cooldowns.sp > 0) p.cooldowns.sp -= game.gameSpeed;

        // 4. Skills
        // Q
        const skillQ = SkillRegistry.getSkill(p.character, 'q');
        if (skillQ) {
            if (skillQ.handleInput) skillQ.handleInput(game, p, input, targetPos);
            if (input.keysPressed['q']) skillQ.cast(game, p, input, targetPos);
        }

        // E
        const skillE = SkillRegistry.getSkill(p.character, 'e');
        if (skillE) {
            if (skillE.handleInput) {
                skillE.handleInput(game, p, input, targetPos);
            } else if (input.keysPressed['e']) {
                skillE.cast(game, p, input, targetPos);
            }
        }

        // Space
        const skillSp = SkillRegistry.getSkill(p.character, ' ');
        if (skillSp) {
            if (skillSp.handleInput) skillSp.handleInput(game, p, input, targetPos);
            if (input.keysPressed[' ']) skillSp.cast(game, p, input, targetPos);
        }
    }

    static handleMovement(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        if (p.dash.active) {
            p.pos.x += p.dash.vx * game.gameSpeed;
            p.pos.y += p.dash.vy * game.gameSpeed;
            p.dash.life -= game.gameSpeed;

            // Continuous Dash Trail (White Poof)
            const rand = () => {
                const seed = game.projectiles.length + p.pos.x + p.pos.y + p.dash.life;
                return Math.abs(Math.sin(seed));
            };

            game.particles.push({
                id: game.nextEntityId++,
                type: 'smoke',
                pos: new Vec2(p.pos.x, p.pos.y),
                vel: new Vec2((rand() - 0.5) * 1, (rand() - 0.5) * 1), // Slower spread
                life: 30, // Longer life (was 15)
                maxLife: 30,
                color: 'rgba(255,255,255,0.5)',
                size: 4 + rand() * 4
            });

            if (p.dash.life <= 0) p.dash.active = false;
            return;
        }

        let dx = 0; let dy = 0;
        if (input.keysHeld['a']) dx -= 1;
        if (input.keysHeld['d']) dx += 1;
        if (input.keysHeld['w']) dy -= 1;
        if (input.keysHeld['s']) dy += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            const speed = p.stats.speed;

            const vx = (dx / len) * speed;
            const vy = (dy / len) * speed;

            p.pos.x += vx * game.gameSpeed;
            p.pos.y += vy * game.gameSpeed;

            // Bounds
            p.pos.x = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, p.pos.x));
            p.pos.y = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, p.pos.y));
        }
    }

    static updateProjectiles(game: ShinobiClashGame) {
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
            const proj = game.projectiles[i];
            const def = ProjectileRegistry.get(proj.type);

            if (def) {
                def.update(game, proj);
            } else {
                // Fallback or Generic Projectiles if not registered (e.g. particles upgraded to projectiles?)
                // For now, assume all projectiles are registered or handled generically if desired.
                // We'll keep a minimal generic movement/expiration for safety?
                // Or just expire them.
                proj.life--;
                if (proj.life <= 0) game.projectiles.splice(i, 1);
            }
        }
    }

    // Exposed for Projectile Definitions to use
    static checkCollision(game: ShinobiClashGame, proj: ProjectileState): boolean {
        let hit = false;

        // Check Players
        for (let id in game.players) {
            const target = game.players[id];
            if (target.id === proj.ownerId) continue;
            if (target.dead) continue;

            // Radius check
            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);

            if (dist < proj.radius + PLAYER_RADIUS) {
                hit = true;
                this.applyDamage(game, target, proj);
            }
        }

        // Check for projectiles colliding with other projectiles
        // Note: ProjectileDefinitions must handle "don't hit self" logic if they iterate, but here we just check generic collisions
        for (let j = 0; j < game.projectiles.length; j++) {
            const targetProj = game.projectiles[j];
            // Only hit things with HP
            if (targetProj.hp === undefined) continue;
            if (targetProj.ownerId === proj.ownerId) continue;
            // Don't hit itself
            if (targetProj === proj) continue;

            const dist = Math.sqrt((targetProj.pos.x - proj.pos.x) ** 2 + (targetProj.pos.y - proj.pos.y) ** 2);

            if (dist < proj.radius + targetProj.radius) {
                hit = true;
                this.applyDamage(game, targetProj, proj);
            }
        }

        return hit;
    }

    static applyDamage(game: ShinobiClashGame, target: { hp?: number, dead?: boolean, pos: Vec2 }, proj: ProjectileState) {
        let dmg = 0;
        const def = ProjectileRegistry.get(proj.type);
        if (def && def.calculateDamage) {
            dmg = def.calculateDamage(game, proj);
        } else {
            dmg = proj.damage || 0;
        }

        if (dmg > 0 && target.hp !== undefined) {
            target.hp -= dmg;
            game.floatingTexts.push({
                id: game.nextEntityId++,
                pos: new Vec2(target.pos.x, target.pos.y - 40),
                val: dmg.toString(),
                color: 'red',
                life: 60, maxLife: 60, vy: 0.5
            });

            if (target.hp <= 0) {
                target.hp = 0;
                if (target.dead !== undefined) target.dead = true;
            }
        }
    }

    static cycleSpectator(game: ShinobiClashGame, p: PlayerState, dir: number) {
        const aliveIds = Object.values(game.players)
            .filter(pl => !pl.dead)
            .map(pl => pl.id)
            .sort((a, b) => a - b);

        if (aliveIds.length === 0) return;

        let currentTarget = p.spectatorTargetId;
        if (currentTarget === undefined || !aliveIds.includes(currentTarget)) {
            p.spectatorTargetId = aliveIds[0];
            return;
        }

        let idx = aliveIds.indexOf(currentTarget);
        idx = (idx + dir + aliveIds.length) % aliveIds.length;
        p.spectatorTargetId = aliveIds[idx];
    }
}
