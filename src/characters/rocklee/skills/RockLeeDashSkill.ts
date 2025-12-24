import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState, SkillState } from "../../../types";
import { Skill } from "../../../skills/Skill";
import { ROCK_LEE_CONSTANTS } from "../constants";

export class RockLeeDashSkill implements Skill {
    id = "rocklee_dash";
    type = "dash";
    name = "High Speed Movement";
    description = "A quick dash with 2 charges.";
    icon = "dash";
    cooldown = 0; // Managed internally via charges

    handleInput(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        // Initialize state if missing
        if (!p.skillStates['rocklee_dash']) {
            p.skillStates['rocklee_dash'] = {
                charges: ROCK_LEE_CONSTANTS.DASH.MAX_CHARGES,
                chargeTimer: 0
            };
        }

        const state = p.skillStates['rocklee_dash'];

        // Recharge logic
        if (state.charges < ROCK_LEE_CONSTANTS.DASH.MAX_CHARGES) {
            state.chargeTimer++;
            if (state.chargeTimer >= ROCK_LEE_CONSTANTS.DASH.COOLDOWN) {
                state.charges++;
                state.chargeTimer = 0;
            }
        }
    }

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        const state = p.skillStates['rocklee_dash'];

        if (state.charges > 0 && !p.dash.active) {
            state.charges--;

            // Calculate direction based on movement keys, fallback to facing
            let dx = 0; let dy = 0;
            if (input.keysHeld['a']) dx -= 1;
            if (input.keysHeld['d']) dx += 1;
            if (input.keysHeld['w']) dy -= 1;
            if (input.keysHeld['s']) dy += 1;

            let vx = 0;
            let vy = 0;

            if (dx !== 0 || dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                vx = (dx / len) * ROCK_LEE_CONSTANTS.DASH.SPEED;
                vy = (dy / len) * ROCK_LEE_CONSTANTS.DASH.SPEED;
            } else {
                // Dash forward if no input
                vx = Math.cos(p.angle) * ROCK_LEE_CONSTANTS.DASH.SPEED;
                vy = Math.sin(p.angle) * ROCK_LEE_CONSTANTS.DASH.SPEED;
            }

            p.dash.active = true;
            p.dash.vx = vx;
            p.dash.vy = vy;
            p.dash.life = ROCK_LEE_CONSTANTS.DASH.DURATION;
        }
    }
}
