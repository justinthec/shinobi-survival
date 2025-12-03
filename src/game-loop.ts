import { ShinobiSurvivalGame } from "./multiplayer-game";
import { PlayerState } from "./types";
import { getSkill, getCharacterLogic } from "./skills";

export function updatePlayers(game: ShinobiSurvivalGame, dt: number, playerInputs: any) {
    for (const [player, input] of playerInputs.entries()) {
        const id = player.id;
        const p = game.players[id];
        if (p.dead) continue;

        // Character-specific passive updates
        const characterLogic = getCharacterLogic(p.character || '');
        if (characterLogic) {
            characterLogic.update(p, game, dt);
        }

        // Root Check
        if (p.rooted) {
            // Cannot move
        } else if (p.dashTime > 0) {
            // Dash Logic
            p.pos.x += p.dashVec.x * dt;
            p.pos.y += p.dashVec.y * dt;
            p.dashTime -= dt;

            // Dash Collision
            for (const e of game.enemies) {
                if (!p.dashHitList.includes(e.id)) {
                    const dist = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                    if (dist < 100) { // Increased radius
                        p.dashHitList.push(e.id);
                        p.dashHitList.push(e.id);
                        const dmg = 50 * p.stats.damageMult;
                        game.damageEnemy(e, dmg, p);
                    }
                }
            }

            // End of dash safety burst
            if (p.dashTime <= 0) {
                p.dashTime = 0;

                // Rasengan Blast Effect
                if (p.character === 'naruto') {
                    // Crater Visual
                    game.particles.push({
                        id: game.nextEntityId++,
                        type: 'crater',
                        pos: p.pos.clone(),
                        vel: { x: 0, y: 0 },
                        life: 2.0, // Shorter life
                        maxLife: 2.0,
                        color: '',
                        size: 1
                    });

                    // Blast Damage & Knockback
                    for (const e of game.enemies) {
                        const dist = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                        if (dist < 150) {
                            const dmg = 50 * p.stats.damageMult;
                            game.damageEnemy(e, dmg, p);

                            // Knockback
                            const angle = Math.atan2(e.pos.y - p.pos.y, e.pos.x - p.pos.x);
                            e.push.x += Math.cos(angle) * 650; // Much stronger knockback
                            e.push.y += Math.sin(angle) * 650;
                        }
                    }
                } else {
                    // Generic Dash End (if any other char dashes)
                    for (const e of game.enemies) {
                        const dist = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                        if (dist < 150) {
                            game.damageEnemy(e, 50 * p.stats.damageMult, p);
                        }
                    }
                }
            }
        } else {
            // Normal Movement
            let moveSpeed = 120; // Base speed
            if (p.skillCharging) moveSpeed = 0; // Immobile while charging
            if (p.character === 'naruto' && p.ultActiveTime > 0) moveSpeed = 0; // Immobile during Ult

            let dx = 0; let dy = 0;
            if (input.keysHeld['a']) dx -= 1;
            if (input.keysHeld['d']) dx += 1;
            if (input.keysHeld['w']) dy -= 1;
            if (input.keysHeld['s']) dy += 1;

            if (dx !== 0 || dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                p.pos.x += (dx / len) * moveSpeed * dt;
                p.pos.y += (dy / len) * moveSpeed * dt;

                if (dx !== 0) p.direction = Math.sign(dx);
            }
        }

        // Map Boundaries
        const MAP_WIDTH = 1400;
        const LANE_WIDTH = MAP_WIDTH / 2;
        if (p.pos.x < -LANE_WIDTH + 20) p.pos.x = -LANE_WIDTH + 20;
        if (p.pos.x > LANE_WIDTH - 20) p.pos.x = LANE_WIDTH - 20;

        // Mouse Aiming
        if (input.mousePosition) {
            const mx = input.mousePosition.x - ShinobiSurvivalGame.canvasSize.width / 2;
            const my = input.mousePosition.y - ShinobiSurvivalGame.canvasSize.height / 2;
            p.aimAngle = Math.atan2(my, mx);
            p.targetPos.x = p.pos.x + mx;
            p.targetPos.y = p.pos.y + my;
        }

        // Cooldowns
        for (let key in p.skills) {
            const skill = p.skills[key as keyof typeof p.skills];
            if (skill.cooldown > 0) skill.cooldown -= dt;
        }

        // Skills
        const skillQLogic = getSkill(p.character || '', 'skillQ');
        const skillELogic = getSkill(p.character || '', 'skillE');
        const ultLogic = getSkill(p.character || '', 'ult');

        if (skillQLogic) skillQLogic.update(p.skills.skillQ, p, game, dt);
        if (skillELogic) skillELogic.update(p.skills.skillE, p, game, dt);
        if (ultLogic) ultLogic.update(p.skills.ult, p, game, dt);

        if (input.keysHeld['q']) {
            if (skillQLogic) skillQLogic.onHold(p.skills.skillQ, p, game, dt);
        }
        if (input.keysPressed['q']) {
            if (skillQLogic) skillQLogic.onPress(p.skills.skillQ, p, game);
        }
        if (!input.keysHeld['q'] && p.skills.skillQ.isCharging) {
            if (skillQLogic) skillQLogic.onRelease(p.skills.skillQ, p, game);
        }

        if (input.keysHeld['e']) {
            if (skillELogic) skillELogic.onHold(p.skills.skillE, p, game, dt);
        }
        if (input.keysPressed['e']) {
            if (skillELogic) skillELogic.onPress(p.skills.skillE, p, game);
        }
        if (!input.keysHeld['e'] && p.skills.skillE.isCharging) {
            if (skillELogic) skillELogic.onRelease(p.skills.skillE, p, game);
        }

        if (input.keysPressed['r']) {
            if (ultLogic) ultLogic.onPress(p.skills.ult, p, game);
        }
        if (!input.keysHeld['r'] && p.skills.ult.isCharging) {
            if (ultLogic) ultLogic.onRelease(p.skills.ult, p, game);
        }

        // Basic Attack
        p.fireTimer += dt;
        const fireRate = (p.character === 'sasuke' ? 1.0 : 1.5) * p.stats.cooldownMult;

        if (p.fireTimer >= fireRate) {
            game.fireWeapon(p);
            p.fireTimer = 0;
            if (p.character === 'naruto' && p.weaponLevel >= 2 && !p.isEvolved) {
                p.burstTimer = 0.1;
                p.burstCount = 1;
            }
        }

        if (p.burstCount > 0) {
            p.burstTimer -= dt;
            if (p.burstTimer <= 0) {
                game.fireWeapon(p);
                p.burstCount--;
                if (p.burstCount > 0) p.burstTimer = 0.1;
            }
        }
    }
}

export function updateEnemies(game: ShinobiSurvivalGame, dt: number) {
    for (const e of game.enemies) {
        let closestP: PlayerState | null = null;
        let minDist = Infinity;
        for (let id in game.players) {
            const p = game.players[id];
            if (p.dead) continue;
            const d = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
            if (d < minDist) { minDist = d; closestP = p; }
        }

        if (closestP) {
            const angle = Math.atan2(closestP.pos.y - e.pos.y, closestP.pos.x - e.pos.x);
            if (e.rooted) e.speedMult = 0;

            const speed = 50 * e.speedMult;
            e.pos.x += (Math.cos(angle) * speed + e.push.x) * dt;
            e.pos.y += (Math.sin(angle) * speed + e.push.y) * dt;

            e.push.x *= 0.95;
            e.push.y *= 0.95;

            if (e.bleedStacks > 0) {
                e.dotTimer -= dt;
                if (e.dotTimer <= 0) {
                    e.dotTimer = 1.0;
                    const bleedDmg = e.bleedStacks * 5;
                    e.hp -= bleedDmg;
                    game.spawnFloatingText(e.pos, bleedDmg.toString(), "red");
                }
            }

            if (closestP) {
                const d = Math.sqrt((closestP.pos.x - e.pos.x) ** 2 + (closestP.pos.y - e.pos.y) ** 2);
                if (d < 30) {
                    const dmg = 10 * dt * e.damageDebuff;
                    game.damagePlayer(closestP, dmg);
                }
            }
        }
        e.speedMult = 1.0;
    }

    for (let i = game.enemies.length - 1; i >= 0; i--) {
        if (game.enemies[i].dead) {
            game.enemies.splice(i, 1);
        }
    }
}

export function updateProjectiles(game: ShinobiSurvivalGame, dt: number) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const proj = game.projectiles[i];
        proj.life -= dt;
        if (proj.life <= 0) {
            game.projectiles.splice(i, 1);
            continue;
        }

        if (proj.type === 'rotating_slash') {
            const owner = game.players[proj.ownerId];
            if (owner) {
                const progress = 1 - (proj.life / 0.3);
                const swingRange = 70 * (Math.PI / 180);
                const startAngle = -swingRange / 2;
                const currentSwing = startAngle + (swingRange * progress);
                const baseAngle = proj.targetAngle !== undefined ? proj.targetAngle : owner.aimAngle;
                proj.angle = baseAngle + currentSwing;
                const radius = 30;
                proj.pos.x = owner.pos.x + Math.cos(proj.angle) * radius;
                proj.pos.y = owner.pos.y + Math.sin(proj.angle) * radius;
            }
        } else if (proj.type === 'fireball') {
            proj.size += 20 * dt;
            if (game.random() < 0.2) {
                game.hazards.push({
                    id: game.nextEntityId++,
                    pos: proj.pos.clone(),
                    radius: proj.size * 0.8,
                    duration: 2.0,
                    damage: 5,
                    type: 'fire',
                    ownerId: proj.ownerId
                });
            }
        }

        proj.pos.x += proj.vel.x * dt;
        proj.pos.y += proj.vel.y * dt;

        for (let j = game.enemies.length - 1; j >= 0; j--) {
            const e = game.enemies[j];
            if (proj.hitList.includes(e.id)) continue;

            let hit = false;
            if (proj.type === 'rotating_slash') {
                const owner = game.players[proj.ownerId];
                if (owner) {
                    const distToOwner = Math.sqrt((e.pos.x - owner.pos.x) ** 2 + (e.pos.y - owner.pos.y) ** 2);
                    if (distToOwner < 80) {
                        const angleToEnemy = Math.atan2(e.pos.y - owner.pos.y, e.pos.x - owner.pos.x);
                        let angleDiff = angleToEnemy - proj.angle;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        if (Math.abs(angleDiff) < 0.8) {
                            hit = true;
                        }
                    }
                }
            } else {
                const dist = Math.sqrt((proj.pos.x - e.pos.x) ** 2 + (proj.pos.y - e.pos.y) ** 2);
                if (dist < proj.size) hit = true;
            }

            if (hit) {
                const owner = game.players[proj.ownerId];
                if (owner) {
                    game.damageEnemy(e, proj.dmg, owner);
                } else {
                    e.hp -= proj.dmg;
                }

                proj.hitList.push(e.id);
                if (proj.pierce > 0) {
                    proj.pierce--;
                } else {
                    game.projectiles.splice(i, 1);
                    break;
                }

                if (e.hp <= 0) {
                    game.enemies.splice(j, 1);
                    game.xpOrbs.push({
                        id: game.nextEntityId++,
                        pos: e.pos.clone(),
                        val: 10,
                        dead: false
                    });
                }
            }
        }
    }
}

export function updateHazards(game: ShinobiSurvivalGame, dt: number) {
    for (let i = game.hazards.length - 1; i >= 0; i--) {
        const h = game.hazards[i];
        h.duration -= dt;
        if (h.duration <= 0) {
            game.hazards.splice(i, 1);
            continue;
        }
        for (const e of game.enemies) {
            const d = Math.sqrt((h.pos.x - e.pos.x) ** 2 + (h.pos.y - e.pos.y) ** 2);
            if (d < h.radius) {
                if (h.type === 'quicksand') {
                    e.speedMult *= 0.5;
                }
                const dmg = h.damage * dt;
                e.hp -= dmg;
                if (Math.random() < 0.1) game.spawnFloatingText(e.pos, Math.ceil(h.damage).toString(), 'white');
            }
        }
    }
}

export function updateXpOrbs(game: ShinobiSurvivalGame, dt: number) {
    for (let id in game.players) {
        const p = game.players[id];
        if (p.dead) continue;

        for (let i = game.xpOrbs.length - 1; i >= 0; i--) {
            const orb = game.xpOrbs[i];
            const dist = Math.sqrt((p.pos.x - orb.pos.x) ** 2 + (p.pos.y - orb.pos.y) ** 2);
            if (dist < 50) {
                const angle = Math.atan2(p.pos.y - orb.pos.y, p.pos.x - orb.pos.x);
                orb.pos.x += Math.cos(angle) * 300 * dt;
                orb.pos.y += Math.sin(angle) * 300 * dt;

                if (dist < 20) {
                    game.teamXP += orb.val;
                    game.xpOrbs.splice(i, 1);
                    if (game.teamXP >= game.xpToNextLevel) {
                        game.teamXP = 0;
                        game.teamLevel++;
                        game.xpToNextLevel *= 1.2;
                        game.gamePhase = 'levelUp';
                        for (let pid in game.players) {
                            game.players[pid].selectedUpgrade = null;
                            game.players[pid].offeredUpgrades = game.generateUpgrades(game.players[pid]);
                        }
                    }
                }
            }
        }
    }
}

export function updateParticles(game: ShinobiSurvivalGame, dt: number) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const part = game.particles[i];
        part.life -= dt;
        if (part.life <= 0) {
            game.particles.splice(i, 1);
            continue;
        }
        part.pos.x += part.vel.x * dt;
        part.pos.y += part.vel.y * dt;
    }
}

export function updateFloatingTexts(game: ShinobiSurvivalGame, dt: number) {
    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
        const ft = game.floatingTexts[i];
        ft.life -= dt;
        ft.pos.y -= 20 * dt;
        if (ft.life <= 0) {
            game.floatingTexts.splice(i, 1);
        }
    }
}

export function spawnEnemies(game: ShinobiSurvivalGame, dt: number) {
    game.spawnTimer += dt;
    let spawnRate = 1.0;
    let waveMultiplier = 1;

    if (game.gameTime < 60) {
        spawnRate = 1.0;
        waveMultiplier = 1;
    } else if (game.gameTime < 120) {
        spawnRate = 0.8;
        waveMultiplier = 2;
    } else {
        spawnRate = 0.4;
        waveMultiplier = 3;
    }

    if (game.spawnTimer > spawnRate && game.enemies.length < 50) {
        game.spawnEnemy();
        if (waveMultiplier >= 2 && game.random() < 0.4) game.spawnEnemy();
        if (waveMultiplier >= 3 && game.random() < 0.6) game.spawnEnemy();
        game.spawnTimer = 0;
    }
}
