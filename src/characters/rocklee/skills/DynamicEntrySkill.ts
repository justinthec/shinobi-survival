import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState } from "../../../types";
import { Skill } from "../../../skills/Skill";
import { ROCK_LEE_CONSTANTS } from "../constants";
import { CombatManager } from "../../../managers/combat-manager";

export class DynamicEntrySkill implements Skill {
    readonly name = "Dynamic Entry";
    readonly description = "Flying kick towards target. Stuns on impact.";
    readonly cooldown = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.COOLDOWN;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        // Handled in update via input check if we wanted custom windup,
        // but 'cast' is called by CombatManager when key is pressed.
        // We'll init the state here.
        if (p.cooldowns.e > 0) return;

        // Don't cast if already doing it
        const state = p.skillStates['dynamic_entry'];
        if (state && (state.active || state.timer !== undefined)) return;

        p.cooldowns.e = this.cooldown;

        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y - p.pos.y;
        const angle = Math.atan2(dy, dx);
        p.angle = angle;

        // Start Windup
        p.skillStates['dynamic_entry'] = {
            target: new Vec2(Math.cos(angle), Math.sin(angle)), // Store direction
            active: false, // Not dashing yet
            timer: ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.WINDUP,
            duration: ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.DURATION // To be used for dash duration
        };

        // Casting stuns the player so they can't move normally
        p.casting = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.WINDUP;
    }

    update(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        const state = p.skillStates['dynamic_entry'];
        if (!state) return;

        // WINDUP PHASE
        if (state.timer !== undefined && state.timer > 0 && !state.active) {
            state.timer--;
            if (state.timer <= 0) {
                // Windup complete -> Start Dash
                state.active = true;
                state.timer = state.duration; // Now timer is dash duration

                // Casting prevents normal movement, we want to keep it "casting" (stunned) during dash too
                p.casting = state.duration || 10;
            }
            return;
        }

        // DASH PHASE
        if (state.active && state.timer !== undefined) {
            state.timer--;

            // Move
            const speed = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.SPEED;
            const dir = state.target!; // Direction vector stored in target

            p.pos.x += dir.x * speed;
            p.pos.y += dir.y * speed;

            // Bounds check
            p.pos.x = Math.max(0, Math.min(1600, p.pos.x));
            p.pos.y = Math.max(0, Math.min(1600, p.pos.y));

            // Collision / Damage Logic
            // We'll manually check collision here since it's not a projectile anymore
            this.checkCollision(game, p);

            if (state.timer <= 0) {
                // End Dash
                delete p.skillStates['dynamic_entry'];
                p.casting = 0; // Release stun
            }
        }
    }

    private checkCollision(game: ShinobiClashGame, p: PlayerState) {
        // Simple radius check against other players
        for (const id in game.players) {
            const target = game.players[id];
            if (target.id === p.id) continue;
            if (target.dead) continue;

            const dist = Math.sqrt((target.pos.x - p.pos.x)**2 + (target.pos.y - p.pos.y)**2);
            // Hitbox
            if (dist < 40 + 20) { // arbitrary hit radius
                // Apply Damage & Stun
                CombatManager.applyDamage(game, target, ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.DAMAGE);

                // Apply Stun
                target.casting = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.STUN_DURATION; // Stun them

                // End dash on hit? Or pass through?
                // Let's end dash on hit to feel like an impact
                delete p.skillStates['dynamic_entry'];
                p.casting = 0;

                // Visual FX
                game.particles.push({
                    id: game.nextEntityId++,
                    type: 'hit',
                    pos: new Vec2(target.pos.x, target.pos.y),
                    vel: new Vec2(0,0),
                    life: 10, maxLife: 10, size: 20, color: 'orange'
                });

                break; // Hit one person per frame max? or multiple? Let's just break for single target impact
            }
        }
    }
}
