import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PLAYER_RADIUS } from "../../types";
import { ROCK_LEE_CONSTANTS } from "./constants";
import { CombatManager } from "../../managers/combat-manager";

export class LeafHurricaneProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        const owner = game.players[proj.ownerId];
        if (!owner || owner.dead) {
            proj.life = 0;
            return;
        }

        // Follow owner
        proj.pos.x = owner.pos.x;
        proj.pos.y = owner.pos.y;

        // Decrement Life
        proj.life--;

        // Sync with cooldown to lock input? (Done via cooldowns.q in Skill, but we clear it here if needed)
        // Check timer? Skill sets cooldown high.
        // We need to set the cooldown to match remaining life when this dies, or just let it expire?
        // Actually, logic is: Input locked while active. Cooldown starts AFTER?
        // Current implementation in Skill sets CD to 9999.
        // We should reset CD to actual cooldown when this ends.

        if (proj.life <= 0) {
            // Reset Cooldown
            owner.cooldowns.q = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.COOLDOWN;
            if (owner.skillStates['leaf_hurricane']) {
                delete owner.skillStates['leaf_hurricane'];
            }

            const idx = game.projectiles.indexOf(proj);
            if (idx >= 0) game.projectiles.splice(idx, 1);
            return;
        }

        // Damage Logic (Tick)
        const tickRate = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.TICK_RATE;
        if (proj.life % tickRate === 0) {
            CombatManager.checkCollision(game, proj);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        // Visuals handled by RockLeeCharacter render
    }
}

export class DynamicEntryProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        const owner = game.players[proj.ownerId];
        if (!owner || owner.dead) {
            proj.life = 0;
            return;
        }

        // 1. Interruption Check (Collide with any projectile that isn't this one or owned by me?
        // Actually, just "collides with a projectile".
        // We scan for projectiles overlapping the owner.
        // We skip "this" projectile.
        for (const other of game.projectiles) {
            if (other === proj) continue;
            // Ignore own projectiles (like Leaf Hurricane) ?
            if (other.ownerId === proj.ownerId) continue;

            const dx = other.pos.x - owner.pos.x;
            const dy = other.pos.y - owner.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < (PLAYER_RADIUS + other.radius)) {
                // Interrupted!
                proj.life = 0;
                // Also clear the skill state so animation stops
                if (owner.skillStates['dynamic_entry']) {
                    owner.skillStates['dynamic_entry'].active = false;
                }
                return;
            }
        }

        // 2. State Logic
        if (proj.actionState === 'windup') {
            proj.life--; // Windup timer logic reused life? No, let's use a custom timer or life.
            // Let's use 'life' as the timer for the current state if we manage transitions manually.
            // Or use a field in 'skillStates' to track windup?
            // ProjectileState has 'life'.

            if (proj.life <= 0) {
                // Transition to Dash
                proj.actionState = 'dashing';

                // Calculate Dash Vector
                // We stored target in velocity or auxiliary?
                // Let's assume we stored the *target* in proj.targetPos (custom field? No).
                // We can calculate velocity based on Angle stored in proj.angle.

                // Recalculate distance? Or just fly fixed distance/time?
                // Standard dash uses time.
                // Let's assume infinite range until collision or... wall?
                // Actually, `DynamicEntrySkill` passed a target.
                // We need to store that target.
                // We can hack `proj.vel` to store the target position during windup?
                // Or just fly in `proj.angle` direction for a fixed duration?
                // The skill description says "Flying kick towards target".
                // Let's fly until we hit something or max duration.

                const speed = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.SPEED;
                proj.vel.x = Math.cos(proj.angle) * speed;
                proj.vel.y = Math.sin(proj.angle) * speed;

                proj.life = 40; // Max dash duration (safety)
            }
        } else if (proj.actionState === 'dashing') {
            // Move Owner
            owner.pos.x += proj.vel.x;
            owner.pos.y += proj.vel.y;

            // Map Bounds
            const mapSize = 1600; // Constant
            if (owner.pos.x < PLAYER_RADIUS) owner.pos.x = PLAYER_RADIUS;
            if (owner.pos.x > mapSize - PLAYER_RADIUS) owner.pos.x = mapSize - PLAYER_RADIUS;
            if (owner.pos.y < PLAYER_RADIUS) owner.pos.y = PLAYER_RADIUS;
            if (owner.pos.y > mapSize - PLAYER_RADIUS) owner.pos.y = mapSize - PLAYER_RADIUS;

            // Sync Proj Pos to Owner
            proj.pos.x = owner.pos.x;
            proj.pos.y = owner.pos.y;

            // Update Skill State for Render
            if (owner.skillStates['dynamic_entry']) {
                owner.skillStates['dynamic_entry'].active = true;
            }

            // Hit Detection (Enemy Players)
            // Use CombatManager logic or custom?
            // "Stuns on impact".
            for (const id in game.players) {
                const target = game.players[id];
                if (target.id === proj.ownerId || target.dead) continue;

                const dx = target.pos.x - proj.pos.x;
                const dy = target.pos.y - proj.pos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < PLAYER_RADIUS * 2) { // Overlap
                    // Hit!
                    proj.damage = 15;
                    CombatManager.applyDamage(game, target, proj); // Some damage
                    proj.damage = 0; // Reset
                    // Stun
                    target.stunned = 60; // 1 second stun

                    // Stop Dash
                    proj.life = 0;
                    return;
                }
            }

            proj.life--;
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        // Logic projectile, no render.
        // Visuals are handled by RockLeeCharacter based on state.
        // But maybe debug render?
    }
}
