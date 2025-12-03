import { PlayerState, SkillState } from '../types';
import { ShinobiSurvivalGame } from '../multiplayer-game';
import { Vec2 } from 'netplayjs';

export interface SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
}

// Naruto Skills
export class UzumakiBarrageSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
    }

    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            const numClones = 16;
            const radius = 50;

            for (let i = 0; i < numClones; i++) {
                const angle = (i / numClones) * Math.PI * 2;
                const vel = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
                const spawnPos = new Vec2(player.pos.x + vel.x, player.pos.y + vel.y);
                game.spawnProjectile(player.id, spawnPos, angle, 50, 20 * player.stats.damageMult, 'clone_punch', 50 + player.stats.knockback, 99, 30);
            }

            for (const enemy of game.enemies) {
                const dist = Math.sqrt((player.pos.x - enemy.pos.x) ** 2 + (player.pos.y - enemy.pos.y) ** 2);
                if (dist < 150) {
                    const damage = 30 * player.stats.damageMult;
                    game.damageEnemy(enemy, damage, player);
                    const angle = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x);
                    enemy.push.x += Math.cos(angle) * 800;
                    enemy.push.y += Math.sin(angle) * 800;
                }
            }

            game.spawnFloatingText(player.pos, "Uzumaki Barrage!", "orange");
            skill.cooldown = 10 * player.stats.cooldownMult;
        }
    }

    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class RasenganSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (player.skillCharging || player.dashTime > 0) {
            player.invincible = true;
        } else if (player.character === 'naruto' && player.ultActiveTime <= 0) {
            player.invincible = false;
        }
    }

    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0 || skill.isCharging) {
            skill.isCharging = true;
        }
    }

    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown <= 0 || skill.isCharging) {
            skill.isCharging = true;
            skill.chargeTime = Math.min(skill.chargeTime + dt, 1.5);
            player.direction = Math.abs(player.aimAngle) > Math.PI / 2 ? -1 : 1;
            player.skillCharging = true;
            player.skillChargeTime = skill.chargeTime;
            player.invincible = true;
        }
    }

    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.chargeTime > 0) {
            const chargeRatio = skill.chargeTime / 1.5;
            const speed = 600;
            const minRange = 75;
            const maxRange = 375;
            const range = minRange + chargeRatio * (maxRange - minRange);

            player.dashTime = range / speed;
            player.dashHitList = [];
            player.dashVec = new Vec2(Math.cos(player.aimAngle) * speed, Math.sin(player.aimAngle) * speed);

            skill.chargeTime = 0;
            skill.isCharging = false;
            skill.cooldown = 5 * player.stats.cooldownMult;
            player.skillCharging = false;
            player.skillChargeTime = 0;
            player.invincible = true;

            if (player.character === 'naruto' && player.charState) {
                (player.charState as any).rasenganSize = 1 + chargeRatio * 2;
            }
        }
    }
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class KuramaModeSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (skill.activeTime > 0) {
            skill.activeTime -= dt;
            player.ultActiveTime = skill.activeTime;
            player.invincible = true;

            const beamWidth = 30;
            const beamLength = 2000;
            const beamStart = player.pos;
            const beamEnd = {
                x: player.pos.x + Math.cos(player.aimAngle) * beamLength,
                y: player.pos.y + Math.sin(player.aimAngle) * beamLength
            };

            for (const enemy of game.enemies) {
                const distSq = (beamEnd.x - beamStart.x) ** 2 + (beamEnd.y - beamStart.y) ** 2;
                if (distSq == 0) continue;

                let t = ((enemy.pos.x - beamStart.x) * (beamEnd.x - beamStart.x) + (enemy.pos.y - beamStart.y) * (beamEnd.y - beamStart.y)) / distSq;
                t = Math.max(0, Math.min(1, t));
                const closestPoint = {
                    x: beamStart.x + t * (beamEnd.x - beamStart.x),
                    y: beamStart.y + t * (beamEnd.y - beamStart.y)
                };

                const distToBeam = Math.sqrt((enemy.pos.x - closestPoint.x) ** 2 + (enemy.pos.y - closestPoint.y) ** 2);

                if (distToBeam < beamWidth) {
                    if (enemy.dead) continue;
                    const damage = 5 * player.stats.damageMult;
                    game.damageEnemy(enemy, damage, player);
                }
            }
        } else if (player.character === 'naruto' && !player.skillCharging && player.dashTime <= 0) {
            player.invincible = false;
        }
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            skill.activeTime = 6;
            skill.cooldown = 25 * player.stats.cooldownMult;
            player.ultActiveTime = 6;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

// Sasuke Skills
export class FireballSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            const speed = 100;
            const damage = 40 * player.stats.damageMult;
            game.spawnProjectile(player.id, player.pos, player.aimAngle, speed, damage, 'fireball', 50 + player.stats.knockback, 100 + player.stats.piercing, 30);
            skill.cooldown = 6 * player.stats.cooldownMult;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class RinneganSwapSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (skill.activeTime > 0) {
            skill.activeTime -= dt;
            player.invincible = true;
        } else if (player.character === 'sasuke' && !player.skillCharging && player.dashTime <= 0) {
            player.invincible = false;
        }
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            const targetPos = player.targetPos;
            const radius = 50;

            let bestTarget = null;
            let maxHp = -1;

            for (const enemy of game.enemies) {
                const dist = Math.sqrt((targetPos.x - enemy.pos.x) ** 2 + (targetPos.y - enemy.pos.y) ** 2);
                if (dist < radius && enemy.hp > maxHp) {
                    maxHp = enemy.hp;
                    bestTarget = enemy;
                }
            }

            if (bestTarget) {
                game.spawnFloatingText(player.pos, "Swap!", "purple");
                game.spawnProjectile(player.id, player.pos, 0, 0, 0, 'rinnegan_effect', 0, 99, 30);

                const oldPlayerPos = { x: player.pos.x, y: player.pos.y };
                player.pos.x = bestTarget.pos.x;
                player.pos.y = bestTarget.pos.y;
                bestTarget.pos.x = oldPlayerPos.x;
                bestTarget.pos.y = oldPlayerPos.y;

                game.spawnProjectile(player.id, player.pos, 0, 0, 0, 'rinnegan_effect', 0, 99, 30);

                skill.activeTime = 0.5;
                const damage = 100 * player.stats.damageMult;
                game.damageEnemy(bestTarget, damage, player);

                skill.cooldown = 12 * player.stats.cooldownMult;
            } else {
                game.spawnFloatingText(player.pos, "Need Target!", "gray");
            }
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class KirinSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (skill.activeTime > 0) {
            skill.activeTime -= dt;
        }
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            skill.isCharging = true;
            skill.chargeTime = 0;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.isCharging) {
            skill.chargeTime += dt;
            if (skill.chargeTime > 2) skill.chargeTime = 2;
        }
    }
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.isCharging) {
            skill.isCharging = false;
            const target = player.targetPos;
            const radius = 100 + (skill.chargeTime * 50);
            const damage = 200 + (skill.chargeTime * 100);

            skill.activeTime = 0.5;
            skill.cooldown = 40 * player.stats.cooldownMult;

            for (const enemy of game.enemies) {
                const dist = Math.sqrt((target.x - enemy.pos.x) ** 2 + (target.y - enemy.pos.y) ** 2);
                if (dist < radius) {
                    game.damageEnemy(enemy, damage * player.stats.damageMult, player);
                    enemy.stunTimer = 2;
                }
            }
            game.spawnFloatingText(target, "KIRIN!", "cyan");
        }
    }
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}


// Gaara Skills
export class SphereOfSandSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (skill.activeTime > 0) {
            skill.activeTime -= dt;
            player.invincible = true;
            for (const enemy of game.enemies) {
                const dist = Math.sqrt((player.pos.x - enemy.pos.x) ** 2 + (player.pos.y - enemy.pos.y) ** 2);
                if (dist < 100) {
                    const damage = 50 * dt * player.stats.damageMult;
                    game.damageEnemy(enemy, damage, player);
                }
            }
        } else if (player.character === 'gaara' && player.ultActiveTime <= 0) {
            player.invincible = false;
        }
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            skill.activeTime = 3;
            skill.cooldown = 15 * player.stats.cooldownMult;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class DesertQuicksandSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            game.hazards.push({
                id: game.nextEntityId++,
                pos: new Vec2(player.pos.x, player.pos.y),
                radius: 200,
                duration: 5,
                damage: 20 * player.stats.damageMult,
                type: 'quicksand',
                ownerId: player.id,
            });
            skill.cooldown = 8 * player.stats.cooldownMult;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class GrandSandMausoleumSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (skill.activeTime > 0) {
            skill.activeTime -= dt;
            player.ultActiveTime = skill.activeTime;

            for (const enemy of game.enemies) {
                enemy.rooted = true;
            }

            if (skill.activeTime <= 0) {
                for (const enemy of game.enemies) {
                    enemy.rooted = false;
                    const damage = 500 * player.stats.damageMult;
                    game.damageEnemy(enemy, damage, player);
                }
            }
        }
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            skill.activeTime = 2;
            skill.cooldown = 60 * player.stats.cooldownMult;
            player.ultActiveTime = 2;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

// Sakura Skills
export class HealSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            const healAmount = 50;
            player.hp = Math.min(player.hp + healAmount, player.maxHp);
            game.spawnFloatingText(player.pos, `+${healAmount}`, "green");

            for (let id in game.players) {
                const p = game.players[id];
                if (p.id !== player.id && !p.dead) {
                    const dist = Math.sqrt((player.pos.x - p.pos.x) ** 2 + (player.pos.y - p.pos.y) ** 2);
                    if (dist < 300) {
                        p.hp = Math.min(p.hp + healAmount, p.maxHp);
                        game.spawnFloatingText(p.pos, `+${healAmount}`, "green");
                    }
                }
            }
            skill.cooldown = 15 * player.stats.cooldownMult;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class ChakraScalpelSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (skill.activeTime > 0) {
            skill.activeTime -= dt;
        }
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            skill.activeTime = 5;
            skill.cooldown = 12 * player.stats.cooldownMult;
            game.spawnFloatingText(player.pos, "Scalpel!", "pink");

            const speed = 600;
            const range = 200;
            player.dashTime = range / speed;
            player.dashHitList = [];
            player.dashVec = new Vec2(Math.cos(player.aimAngle) * speed, Math.sin(player.aimAngle) * speed);
            player.invincible = true;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

export class KatsuyuSkill implements SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {
        if (skill.cooldown > 0) skill.cooldown -= dt;
        if (skill.activeTime > 0) {
            skill.activeTime -= dt;
            player.ultActiveTime = skill.activeTime;

            const healPerSecond = 20;
            for (let id in game.players) {
                const p = game.players[id];
                if (!p.dead) {
                    const dist = Math.sqrt((player.pos.x - p.pos.x) ** 2 + (player.pos.y - p.pos.y) ** 2);
                    if (dist < 300) {
                        p.hp = Math.min(p.hp + healPerSecond * dt, p.maxHp);
                    }
                }
            }

            for (const enemy of game.enemies) {
                const dist = Math.sqrt((player.pos.x - enemy.pos.x) ** 2 + (player.pos.y - enemy.pos.y) ** 2);
                if (dist < 300) {
                    const damage = 20 * dt * player.stats.damageMult;
                    game.damageEnemy(enemy, damage, player);
                    enemy.speedMult = 0.5;
                }
            }
        }
    }
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {
        if (skill.cooldown <= 0) {
            skill.activeTime = 8;
            skill.cooldown = 60 * player.stats.cooldownMult;
            player.ultActiveTime = 8;
        }
    }
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number) {}
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame) {}
}

const skills: { [key: string]: { [key: string]: SkillLogic } } = {
    naruto: {
        skillQ: new UzumakiBarrageSkill(),
        skillE: new RasenganSkill(),
        ult: new KuramaModeSkill(),
    },
    sasuke: {
        skillQ: new FireballSkill(),
        skillE: new RinneganSwapSkill(),
        ult: new KirinSkill(),
    },
    gaara: {
        skillQ: new SphereOfSandSkill(),
        skillE: new DesertQuicksandSkill(),
        ult: new GrandSandMausoleumSkill(),
    },
    sakura: {
        skillQ: new HealSkill(),
        skillE: new ChakraScalpelSkill(),
        ult: new KatsuyuSkill(),
    }
};

export function getSkill(character: string, skill: string): SkillLogic | null {
    if (skills[character] && skills[character][skill]) {
        return skills[character][skill];
    }
    return null;
}
