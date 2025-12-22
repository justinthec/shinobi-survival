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
        if (input.keysPressed['q']) SkillRegistry.getSkill(p.character, 'q')?.cast(game, p, input, targetPos);

        // Sasuke's Teleport (E) Logic
        if (p.character === 'sasuke') {
            const skillE = SkillRegistry.getSkill('sasuke', 'e');
            if (skillE) {
                if (input.keysHeld['e']) {
                    // Charging
                    if (!p.skillStates['e']) p.skillStates['e'] = {};
                    p.skillStates['e'].charging = true;
                    // Re-calculate target to clamp properly (we can just use targetPos but might want to re-clamp)
                    // The TeleportSkill doesn't expose logic easily, but we can just store raw target
                    // And let Cast handle clamping? Or we clamp here for visual indicator accuracy.
                    // Let's rely on Cast for logic, but for Indicator we need a way to know where it will land.
                    // For now, store raw. TeleportSkill currently clamps inside cast.
                    // Ideally we refactor TeleportSkill to expose `calculateDestination`.
                    // But to keep it simple, we store raw targetPos.
                    // WAIT: User wanted indicator. If we store raw targetPos, indicator might be out of range.
                    // We should replicate the clamp logic here or use a helper.
                    // Hardcoding Teleport range (300) here is duplicated logic but safest for now.
                    const maxRange = 300;
                    const dx = targetPos.x - p.pos.x;
                    const dy = targetPos.y - p.pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let tx = targetPos.x;
                    let ty = targetPos.y;
                    if (dist > maxRange) {
                        const angle = Math.atan2(dy, dx);
                        tx = p.pos.x + Math.cos(angle) * maxRange;
                        ty = p.pos.y + Math.sin(angle) * maxRange;
                    }
                    // Map Bounds
                    const bounds = 1600 - PLAYER_RADIUS;
                    tx = Math.max(PLAYER_RADIUS, Math.min(bounds, tx));
                    ty = Math.max(PLAYER_RADIUS, Math.min(bounds, ty));

                    p.skillStates['e'].target = new Vec2(tx, ty);

                } else {
                    // Released
                    if (p.skillStates['e']?.charging) {
                         // Cast!
                         if (p.skillStates['e'].target) {
                            skillE.cast(game, p, input, p.skillStates['e'].target);
                         }
                         delete p.skillStates['e'];
                    }
                }
            }
        } else {
             // Normal Cast for others
             if (input.keysPressed['e']) SkillRegistry.getSkill(p.character, 'e')?.cast(game, p, input, targetPos);
        }

        if (input.keysPressed[' ']) SkillRegistry.getSkill(p.character, ' ')?.cast(game, p, input, targetPos);
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
                     game.projectiles.splice(i, 1);
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
                if (dist < proj.radius + targetProj.radius) {
                    hit = true;
                    this.applyDamageToClone(game, targetProj, proj);
                }
             }
        }

        return hit;
    }

    static applyDamage(game: ShinobiClashGame, target: PlayerState, proj: ProjectileState) {
        let dmg = 0;
        if (proj.type === 'fireball') dmg = 15;
        if (proj.type === 'rasenshuriken') dmg = RasenshurikenSkill.DAMAGE;
        if (proj.type === 'clone_strike') dmg = CloneStrikeSkill.DAMAGE;
        if (proj.type === 'amaterasu_burn') dmg = 2;
        if (proj.state === 'exploding') {
             if (proj.type === 'rasenshuriken') dmg = RasenshurikenSkill.EXPLOSION_DAMAGE;
             else dmg = 2;
        }
        if (proj.type === 'lightning_slash') dmg = LightningSlashSkill.DAMAGE;

        if (dmg > 0) {
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
                target.dead = true;
            }
        }
    }

    static applyDamageToClone(game: ShinobiClashGame, clone: ProjectileState, proj: ProjectileState) {
        let dmg = 0;
        if (proj.type === 'fireball') dmg = 15;
        if (proj.type === 'rasenshuriken') dmg = RasenshurikenSkill.DAMAGE;
        if (proj.state === 'exploding') dmg = 2;

        if (dmg > 0 && clone.hp !== undefined) {
            clone.hp -= dmg;
            game.floatingTexts.push({
                 id: game.nextEntityId++,
                 pos: new Vec2(clone.pos.x, clone.pos.y - 40),
                 val: dmg.toString(),
                 color: 'white',
                 life: 60, maxLife: 60, vy: 0.5
            });
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
