import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Skill } from "../../skills/Skill";

export class RockLeeDashSkill implements Skill {
    readonly cooldown = 10; // Short internal cooldown between dashes (0.16s)
    readonly rechargeTime = 240; // 4 seconds per charge
    readonly maxCharges = 2;

    handleInput(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        // Initialize state if missing
        if (!p.skillStates['rock_lee_dash']) {
            p.skillStates['rock_lee_dash'] = {
                charges: this.maxCharges,
                rechargeTimer: 0
            };
        }

        const state = p.skillStates['rock_lee_dash'];

        // Recharge logic
        if (state.charges < this.maxCharges) {
            state.rechargeTimer--;
            if (state.rechargeTimer <= 0) {
                state.charges++;
                if (state.charges < this.maxCharges) {
                    state.rechargeTimer = this.rechargeTime;
                } else {
                    state.rechargeTimer = 0;
                }
            }
        }
    }

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        const state = p.skillStates['rock_lee_dash'];

        // Check internal cooldown (global dash cooldown) and charges
        if (p.cooldowns.sp > 0 || state.charges <= 0) return;

        // Consume charge
        state.charges--;
        // If we were at max charges, start the timer for the next one
        if (state.charges === this.maxCharges - 1 && state.rechargeTimer <= 0) {
            state.rechargeTimer = this.rechargeTime;
        }

        // Set internal cooldown to prevent instant double usage
        p.cooldowns.sp = this.cooldown;

        const dashSpeed = 15; // Slightly faster/shorter than normal? Normal is 12.5
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
            life: 10, // Shorter dash (normal is 16)
            vx: vx,
            vy: vy
        };

        // Particles
        const rand = (offset: number) => {
            const seed = game.projectiles.length + p.pos.x + p.pos.y + p.dash.life + offset;
            return Math.abs(Math.sin(seed));
        };

        for(let i=0; i<3; i++) {
             game.particles.push({
                id: game.nextEntityId++,
                type: 'smoke',
                pos: new Vec2(p.pos.x, p.pos.y),
                vel: new Vec2((rand(i)-0.5)*2.5, (rand(i+10)-0.5)*2.5),
                life: 30, maxLife: 30, color: '#90EE90', size: 5 // Light green smoke
            });
        }
    }
}
