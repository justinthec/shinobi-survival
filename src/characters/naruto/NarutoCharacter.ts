import { CharacterDefinition, AbilityDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";

export class NarutoCharacter implements CharacterDefinition {
    name = "Naruto";
    description = "A well-rounded ninja with balanced offense and mobility.";
    abilities: AbilityDefinition[] = [
        { key: "Q", name: "Rasenshuriken", description: "Throw a wind-enhanced shuriken that expands on impact.", type: "active" },
        { key: "E", name: "Clone Strike", description: "Dash forward. If you hit an enemy, spawn clones to strike them.", type: "active" },
        { key: "SPC", name: "Dash", description: "Quickly dash in movement direction.", type: "active" }
    ];

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        const { pos, angle, hp, maxHp, name } = state;
        const opacity = 1;
        const isClone = false; // Assuming main player is not a clone for this render context, though Naruto spawns clones.
                               // If this render is called for a clone entity, we'd need to know.
                               // But currently players are players. Clones might be projectiles?
                               // If clones are distinct entities using this renderer, we might need a flag.
                               // Looking at ProjectileRegistry, clones might be projectiles.
                               // `drawNinjaBody` had an `isClone` param.
                               // `PlayerState` doesn't seem to have `isClone`. Clones are likely Projectiles with 'clone' type.

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        // Colors
        const c = { skin: '#ffcba4', hair: '#ffdd00', main: '#ff6600', sub: '#1a1a1a', acc: '#0055aa' };

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // Body
        ctx.fillStyle = c.main;
        ctx.beginPath(); ctx.ellipse(-5, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

        // Punch Arm (if casting punch - logic was in helper)
        // For now, we don't have explicit action state passed in easy way except maybe in skillStates?
        // keeping simple for now.

        // Head
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Hair (Naruto Spiky)
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const len = 14;
            const cx = 2 + Math.cos(a) * len;
            const cy = Math.sin(a) * len;
            if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        }
        ctx.fill();

        // Arms
        ctx.fillStyle = c.main;
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -16, 12, 6, 3); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 10, 12, 6, 3); ctx.fill();

        ctx.restore();

        // Health Bar
        if (maxHp > 0) {
             ctx.save();
             ctx.translate(pos.x, pos.y - 50);
             ctx.fillStyle = 'rgba(0,0,0,0.8)';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -20, 0, 40, 6, 3); ctx.fill();
             const pct = Math.max(0, hp / maxHp);
             ctx.fillStyle = pct > 0.5 ? '#48bb78' : '#f56565';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -18, 1, 36 * pct, 4, 2); ctx.fill();

             ctx.font = 'bold 12px Arial';
             ctx.textAlign = 'center';

             ctx.strokeStyle = 'black';
             ctx.lineWidth = 3;
             ctx.strokeText(name, 0, -5);

             ctx.fillStyle = getPlayerColor(state.id);
             ctx.fillText(name, 0, -5);

             ctx.restore();
        }
    }
}
