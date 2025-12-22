import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Skill } from "../Skill";

export class DashSkill implements Skill {
    readonly cooldown = 360;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.sp > 0) return;

        p.cooldowns.sp = this.cooldown;

        const dashSpeed = 12.5;
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
            vx = Math.cos(p.angle) * dashSpeed;
            vy = Math.sin(p.angle) * dashSpeed;
        }

        p.dash = {
            active: true,
            life: 16,
            vx: vx,
            vy: vy
        };

        const rand = (offset: number) => {
            const seed = game.projectiles.length + p.pos.x + p.pos.y + p.dash.life + offset;
            return Math.abs(Math.sin(seed));
        };

        for(let i=0; i<5; i++) {
             game.particles.push({
                id: game.nextEntityId++,
                type: 'smoke',
                pos: new Vec2(p.pos.x, p.pos.y),
                vel: new Vec2((rand(i)-0.5)*2.5, (rand(i+10)-0.5)*2.5),
                life: 40, maxLife: 40, color: 'white', size: 6
            });
        }
    }
}
