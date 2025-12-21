import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState, ProjectileState } from "../types";

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
        if (input.keysPressed['q']) this.tryCastQ(game, p);
        if (input.keysPressed['e']) this.tryCastE(game, p, targetPos);
        if (input.keysPressed[' ']) this.tryDash(game, p, input);
    }

    static handleMovement(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        if (p.dash.active) {
            p.pos.x += p.dash.vx;
            p.pos.y += p.dash.vy;
            p.dash.life--;

            // Continuous Dash Trail (White Poof)
            // Deterministic random using simple math if game.random() isn't available statically
            // But game instance is passed. We assume game has a random() if it follows NetplayJS pattern.
            // If not, we use a simple seed based on tick/id.
            // Let's rely on deterministic math for safety as I can't verify game.random() exists on type ShinobiClashGame easily right now.
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
            p.pos.x = Math.max(20, Math.min(1600 - 20, p.pos.x));
            p.pos.y = Math.max(20, Math.min(1600 - 20, p.pos.y));
        }
    }

    static tryCastQ(game: ShinobiClashGame, p: PlayerState) {
        if (p.cooldowns.q > 0) return;

        if (p.character === 'naruto') {
            p.cooldowns.q = 240; // 4s
        } else {
            p.cooldowns.q = 30; // 0.5s (Very short)
        }

        p.casting = 20; // Lock

        if (p.character === 'naruto') {
            this.spawnProjectile(game, p, 'rasenshuriken');
        } else {
            this.spawnProjectile(game, p, 'lightning_slash');
        }
    }

    static tryCastE(game: ShinobiClashGame, p: PlayerState, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = 720; // 12s (was 6s)

        if (p.character === 'naruto') {
            // Clone Strike
            this.spawnProjectile(game, p, 'clone_strike', targetPos);
        } else {
            // Sasuke Teleport
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

            // Clamp to map bounds
            const bounds = 1600 - 20;
            tx = Math.max(20, Math.min(bounds, tx));
            ty = Math.max(20, Math.min(bounds, ty));

            // Particles at start
            game.particles.push({
                id: game.nextEntityId++,
                type: 'teleport',
                pos: new Vec2(p.pos.x, p.pos.y),
                vel: new Vec2(0, 0),
                life: 20, maxLife: 20, color: '#8A2BE2', size: 10
            });

            // Move
            p.pos.x = tx;
            p.pos.y = ty;

            // Particles at end
            game.particles.push({
                id: game.nextEntityId++,
                type: 'teleport',
                pos: new Vec2(p.pos.x, p.pos.y),
                vel: new Vec2(0, 0),
                life: 20, maxLife: 20, color: '#8A2BE2', size: 10
            });
        }
    }

    static tryDash(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        if (p.cooldowns.sp > 0) return;

        p.cooldowns.sp = 360; // 6s (was 3s)

        // Dash vector based on movement keys
        const dashSpeed = 12.5; // Was 25
        let dx = 0; let dy = 0;
        if (input.keysHeld['a']) dx -= 1;
        if (input.keysHeld['d']) dx += 1;
        if (input.keysHeld['w']) dy -= 1;
        if (input.keysHeld['s']) dy += 1;

        let vx = 0;
        let vy = 0;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            vx = (dx / len) * dashSpeed;
            vy = (dy / len) * dashSpeed;
        } else {
            // Fallback to mouse aim if stationary
            vx = Math.cos(p.angle) * dashSpeed;
            vy = Math.sin(p.angle) * dashSpeed;
        }

        p.dash = {
            active: true,
            life: 16, // Was 8
            vx: vx,
            vy: vy
        };

        // Initial Burst
        const rand = (offset: number) => {
            const seed = game.projectiles.length + p.pos.x + p.pos.y + p.dash.life + offset;
            return Math.abs(Math.sin(seed));
        };

        for(let i=0; i<5; i++) {
             game.particles.push({
                id: game.nextEntityId++,
                type: 'smoke',
                pos: new Vec2(p.pos.x, p.pos.y),
                vel: new Vec2((rand(i)-0.5)*2.5, (rand(i+10)-0.5)*2.5), // Slower burst (was 5)
                life: 40, maxLife: 40, color: 'white', size: 6 // Longer life (was 20)
            });
        }
    }

    static spawnProjectile(game: ShinobiClashGame, p: PlayerState, type: string, targetPos?: Vec2) {
        const speed = type === 'fireball' ? 7 : 9; // Was 14 : 18
        const life = type === 'fireball' ? 100 : 120; // Was 50 : 60

        let pos = new Vec2(p.pos.x, p.pos.y);
        let vel = new Vec2(Math.cos(p.angle) * speed, Math.sin(p.angle) * speed);

        // Logic for specific types
        if (type === 'amaterasu_buildup' && targetPos) {
            pos = new Vec2(targetPos.x, targetPos.y);
            vel = new Vec2(0, 0); // Stationary
        }
        else if (type === 'clone_strike') {
            pos = new Vec2(p.pos.x, p.pos.y);
            vel = new Vec2(0, 0); // Starts stationary, moves in update
        }
        else {
            // Standard projectile offset
            const ox = Math.cos(p.angle) * 30;
            const oy = Math.sin(p.angle) * 30;
            pos.x += ox;
            pos.y += oy;
        }

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: type as any,
            pos: pos,
            vel: vel,
            ownerId: p.id,
            angle: p.angle,
            rotation: 0,
            life: life,
            maxLife: life,
            radius: type === 'fireball' ? 20 : 25,
            state: 'flying'
        };

        if (type === 'clone_strike') {
            proj.life = 600; // 10 seconds (was 300)
            proj.maxLife = 600;
            proj.hp = p.maxHp;
            proj.maxHp = p.maxHp;
            proj.radius = 20;
            proj.actionState = 'run';
        }

        if (type === 'lightning_slash') {
            proj.life = 10;
            proj.maxLife = 10;
            proj.radius = 100;
            proj.rotation = p.angle;
            // Position offset handled in generic block or override here?
            // Generic block uses 30 offset. We want 50.
            const ox = Math.cos(p.angle) * 50;
            const oy = Math.sin(p.angle) * 50;
            proj.pos.x = p.pos.x + ox;
            proj.pos.y = p.pos.y + oy;
            proj.vel.x = 0; proj.vel.y = 0;
        }

        game.projectiles.push(proj);
    }

    static updateProjectiles(game: ShinobiClashGame) {
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
            const proj = game.projectiles[i];

            if (proj.type === 'lightning_slash') {
                if (proj.life === 9) this.checkCollision(game, proj); // Hit once
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
                        life: 120, radius: 60, isAoe: true // Life 120 (was 60)
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
                     // If it hit something, maybe it dies or stops?
                     // Request: "attacks". Simple logic: Hit once and die.
                     game.projectiles.splice(i, 1);
                     continue;
                }

                if (proj.life <= 0 || (proj.hp !== undefined && proj.hp <= 0)) {
                    game.projectiles.splice(i, 1);
                    continue;
                }

                // Allow clone to be hit by other projectiles
                // This is handled when updating OTHER projectiles.
                continue;
            }

            if (proj.state === 'exploding' || proj.isAoe) {
                proj.life--;
                if (proj.life % 10 === 0) this.checkCollision(game, proj); // % 10 (was 5)
                if (proj.life <= 0) game.projectiles.splice(i, 1);
                continue;
            }

            // Moving
            proj.pos.x += proj.vel.x;
            proj.pos.y += proj.vel.y;

            // Spin
            if (proj.type === 'rasenshuriken') {
                proj.rotation = (proj.rotation || 0) + 0.15; // Was 0.3
            }

            proj.life--;

            // Collision
            const hit = this.checkCollision(game, proj);

            if (hit || proj.life <= 0) {
                if (proj.type === 'rasenshuriken') {
                    proj.state = 'exploding';
                    proj.life = 80; // Was 40
                    proj.radius = 80;
                    proj.vel.x = 0; proj.vel.y = 0;
                } else if (proj.type === 'fireball') {
                    proj.state = 'exploding';
                    proj.life = 20; // Was 10
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

            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);
            if (dist < proj.radius + 20) {
                hit = true;
                this.applyDamage(game, target, proj);
            }
        }

        // Check Clones (Projectiles)
        // Only if proj is NOT a clone itself (Clone vs Clone fight? Maybe, but usually clone hits player)
        // If 'proj' is a fireball/rasenshuriken, it should hit clones.
        if (proj.type !== 'clone_strike') {
             for (let j = 0; j < game.projectiles.length; j++) {
                const targetProj = game.projectiles[j];
                if (targetProj.type !== 'clone_strike') continue; // Only hit clones
                if (targetProj.ownerId === proj.ownerId) continue; // Don't hit own clones

                const dist = Math.sqrt((targetProj.pos.x - proj.pos.x) ** 2 + (targetProj.pos.y - proj.pos.y) ** 2);
                if (dist < proj.radius + targetProj.radius) {
                    hit = true;
                    // Damage Clone
                    this.applyDamageToClone(game, targetProj, proj);
                }
             }
        }

        return hit;
    }

    static applyDamage(game: ShinobiClashGame, target: PlayerState, proj: ProjectileState) {
        let dmg = 0;
        if (proj.type === 'fireball') dmg = 15;
        if (proj.type === 'rasenshuriken') dmg = 5;
        if (proj.type === 'clone_strike') dmg = 20;
        if (proj.type === 'amaterasu_burn') dmg = 2;
        if (proj.state === 'exploding') dmg = 2;
        if (proj.type === 'lightning_slash') dmg = 25;

        if (dmg > 0) {
            target.hp -= dmg;
            game.floatingTexts.push({
                id: game.nextEntityId++,
                pos: new Vec2(target.pos.x, target.pos.y - 40),
                val: dmg.toString(),
                color: 'red',
                life: 60, maxLife: 60, vy: 0.5 // Was 30, 1
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
        if (proj.type === 'rasenshuriken') dmg = 5;
        if (proj.state === 'exploding') dmg = 2;

        if (dmg > 0 && clone.hp !== undefined) {
            clone.hp -= dmg;
            // Visual feedback?
            game.floatingTexts.push({
                 id: game.nextEntityId++,
                 pos: new Vec2(clone.pos.x, clone.pos.y - 40),
                 val: dmg.toString(),
                 color: 'white',
                 life: 60, maxLife: 60, vy: 0.5 // Was 30, 1
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
        // If current target invalid, pick first
        if (currentTarget === undefined || !aliveIds.includes(currentTarget)) {
            p.spectatorTargetId = aliveIds[0];
            return;
        }

        let idx = aliveIds.indexOf(currentTarget);
        idx = (idx + dir + aliveIds.length) % aliveIds.length;
        p.spectatorTargetId = aliveIds[idx];
    }
}
