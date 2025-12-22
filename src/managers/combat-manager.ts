import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState, ProjectileState, PLAYER_RADIUS } from "../types";
import { SkillRegistry } from "../skills/SkillRegistry";
import { RasenshurikenSkill } from "../skills/naruto/RasenshurikenSkill";
import { CloneStrikeSkill } from "../skills/naruto/CloneStrikeSkill";
import { LightningSlashSkill } from "../skills/sasuke/LightningSlashSkill";
import { DashSkill } from "../skills/common/DashSkill";

export class CombatManager {

    static processInput(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        if (p.dead) {
            if (input.keysPressed['ArrowLeft']) this.cycleSpectator(game, p, -1);
            if (input.keysPressed['ArrowRight']) this.cycleSpectator(game, p, 1);
            return;
        }

        if (p.casting > 0) {
            p.casting--;
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
        if (p.cooldowns.q > 0) p.cooldowns.q--;
        if (p.cooldowns.e > 0) p.cooldowns.e--;
        if (p.cooldowns.sp > 0) p.cooldowns.sp--;

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
            p.pos.x += p.dash.vx;
            p.pos.y += p.dash.vy;
            p.dash.life--;

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

            p.pos.x += vx;
            p.pos.y += vy;

            // Bounds
            p.pos.x = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, p.pos.x));
            p.pos.y = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, p.pos.y));
        }
    }

    static updateProjectiles(game: ShinobiClashGame) {
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
            const proj = game.projectiles[i];

            if (proj.type === 'lightning_slash') {
                if (proj.life === proj.maxLife) this.checkCollision(game, proj); // Hit once on first frame
                proj.life--;
                if (proj.life <= 0) game.projectiles.splice(i, 1);
                continue;
            }

            // 1. Amaterasu Logic
            if (proj.type === 'amaterasu_buildup') {
                proj.life--;
                if (proj.life <= 0) {
                    // Explode
                    game.projectiles.push({
                        ...proj, id: game.nextEntityId++,
                        type: 'amaterasu_burn',
                        life: 120, radius: 60, isAoe: true
                    });
                    game.projectiles.splice(i, 1);
                }
                continue;
            }

            // 2. Clone AI
            if (proj.type === 'clone_strike') {
                // If punching, freeze and wait
                if (proj.actionState === 'punch') {
                    proj.life--;
                    if (proj.life <= 0) game.projectiles.splice(i, 1);
                    continue;
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
                const hit = this.checkCollision(game, proj);
                if (hit) {
                     // Hit! Change to punch state for visual effect
                     proj.actionState = 'punch';
                     proj.life = 15; // Animation duration
                     continue;
                }

                if (proj.life <= 0 || (proj.hp !== undefined && proj.hp <= 0)) {
                    game.projectiles.splice(i, 1);
                    continue;
                }

                continue;
            }

            if (proj.state === 'exploding' || proj.isAoe) {
                proj.life--;
                if (proj.life % 10 === 0) this.checkCollision(game, proj);
                if (proj.life <= 0) game.projectiles.splice(i, 1);
                continue;
            }

            // Moving
            proj.pos.x += proj.vel.x;
            proj.pos.y += proj.vel.y;

            // Spin
            if (proj.type === 'rasenshuriken') {
                proj.rotation = (proj.rotation || 0) + 0.15;
            }

            proj.life--;

            // Collision
            const hit = this.checkCollision(game, proj);

            if (hit || proj.life <= 0) {
                if (proj.type === 'rasenshuriken') {
                    proj.state = 'exploding';
                    proj.life = RasenshurikenSkill.EXPLOSION_LIFE;
                    proj.radius = RasenshurikenSkill.EXPLOSION_RADIUS;
                    proj.vel.x = 0; proj.vel.y = 0;
                } else if (proj.type === 'fireball') {
                    proj.state = 'exploding';
                    proj.life = 20;
                    proj.radius = 50;
                    proj.vel.x = 0; proj.vel.y = 0;
                } else {
                    game.projectiles.splice(i, 1);
                }
            }
        }
    }

    static checkCollision(game: ShinobiClashGame, proj: ProjectileState): boolean {
        let hit = false;

        // Check Players
        for (let id in game.players) {
            const target = game.players[id];
            if (target.id === proj.ownerId) continue;
            if (target.dead) continue;

            // Radius check
            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);

            if (proj.type === 'lightning_slash') {
                // Sector Check
                if (dist < proj.radius + PLAYER_RADIUS) {
                    // Check Angle
                    const angleToTarget = Math.atan2(target.pos.y - proj.pos.y, target.pos.x - proj.pos.x);
                    let diff = angleToTarget - proj.angle;
                    // Normalize to -PI..PI
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;

                    // 120 degrees total = +/- 60 degrees = +/- PI/3
                    if (Math.abs(diff) < Math.PI / 3) {
                         hit = true;
                         this.applyDamage(game, target, proj);
                    }
                }
            } else {
                // Standard Circle Check
                if (dist < proj.radius + PLAYER_RADIUS) {
                    hit = true;
                    this.applyDamage(game, target, proj);
                }
            }
        }

        // Check Clones
        if (proj.type !== 'clone_strike') {
             for (let j = 0; j < game.projectiles.length; j++) {
                const targetProj = game.projectiles[j];
                if (targetProj.type !== 'clone_strike') continue;
                if (targetProj.ownerId === proj.ownerId) continue;

                const dist = Math.sqrt((targetProj.pos.x - proj.pos.x) ** 2 + (targetProj.pos.y - proj.pos.y) ** 2);

                if (proj.type === 'lightning_slash') {
                    // Sector Check vs Clone
                    if (dist < proj.radius + targetProj.radius) {
                         const angleToTarget = Math.atan2(targetProj.pos.y - proj.pos.y, targetProj.pos.x - proj.pos.x);
                         let diff = angleToTarget - proj.angle;
                         while (diff > Math.PI) diff -= Math.PI * 2;
                         while (diff < -Math.PI) diff += Math.PI * 2;
                         if (Math.abs(diff) < Math.PI / 3) {
                             hit = true;
                             this.applyDamage(game, targetProj, proj);
                         }
                    }
                } else {
                    if (dist < proj.radius + targetProj.radius) {
                        hit = true;
                        this.applyDamage(game, targetProj, proj);
                    }
                }
             }
        }

        return hit;
    }

    static applyDamage(game: ShinobiClashGame, target: { hp?: number, dead?: boolean, pos: Vec2 }, proj: ProjectileState) {
        let dmg = proj.damage || 0;

        // Handle special cases (explosions, etc.) if damage not pre-calc, or override
        if (proj.state === 'exploding') {
             if (proj.type === 'rasenshuriken') dmg = RasenshurikenSkill.EXPLOSION_DAMAGE;
             else dmg = 2; // Generic explosion tick
        }
        if (proj.type === 'amaterasu_burn') dmg = 2;
        if (proj.type === 'fireball' && proj.state === 'exploding') dmg = 0; // Fireball explosion visual only? Or handled above.
        if (proj.type === 'fireball' && proj.state !== 'exploding') dmg = 15; // Fallback if not set

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
