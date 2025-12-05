/**
 * ParticleManager - Stateless helper class for particle effects.
 * 
 * Handles particle spawning, updates, and cleanup.
 */

import { Vec2 } from 'netplayjs';
import { ParticleState } from '../types';

export interface ParticleOptions {
    vel?: Vec2;
    life?: number;
    color?: string;
    size?: number;
    angle?: number;
}

export class ParticleManager {
    /**
     * Spawn a new particle
     */
    static spawn(
        particles: ParticleState[],
        type: string,
        pos: Vec2,
        nextId: number,
        options: ParticleOptions = {}
    ): number {
        const life = options.life ?? 1.0;

        particles.push({
            id: nextId,
            type,
            pos: new Vec2(pos.x, pos.y),
            vel: options.vel ?? new Vec2(0, 0),
            life,
            maxLife: life,
            color: options.color ?? 'white',
            size: options.size ?? 10,
            angle: options.angle
        });

        return nextId + 1;
    }

    /**
     * Spawn a crater particle (for Rasengan impacts, etc.)
     */
    static spawnCrater(
        particles: ParticleState[],
        pos: Vec2,
        nextId: number,
        life: number = 2.0
    ): number {
        return ParticleManager.spawn(particles, 'crater', pos, nextId, { life });
    }

    /**
     * Spawn a lightning bolt particle
     */
    static spawnLightningBolt(
        particles: ParticleState[],
        startPos: Vec2,
        endPos: Vec2,
        nextId: number
    ): number {
        const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
        const distance = Math.sqrt(
            (endPos.x - startPos.x) ** 2 +
            (endPos.y - startPos.y) ** 2
        );

        return ParticleManager.spawn(particles, 'lightning_bolt', startPos, nextId, {
            life: 0.2,
            color: 'cyan',
            size: distance,
            angle
        });
    }

    /**
     * Update all particles
     */
    static update(particles: ParticleState[], dt: number): void {
        for (let i = particles.length - 1; i >= 0; i--) {
            const part = particles[i];

            // Update lifetime
            part.life -= dt;

            // Update position
            part.pos.x += part.vel.x * dt;
            part.pos.y += part.vel.y * dt;
        }
    }

    /**
     * Remove expired particles
     */
    static cleanup(particles: ParticleState[]): void {
        for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }
    }
}
