import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";

export class RockLeeCharacter implements CharacterDefinition {
    name = "Rock Lee";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        ctx.save();
        ctx.translate(state.pos.x, state.pos.y);
        ctx.rotate(state.angle);

        // Jumpsuit Color
        const jumpsuitColor = '#228B22'; // Forest Green
        const skinColor = '#FFDAB9';

        // Body
        ctx.fillStyle = jumpsuitColor;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#006400';
        ctx.stroke();

        // Head
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // Hair (Bowl Cut)
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(5, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // Re-draw face area
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(8, 0, 14, -Math.PI/2, Math.PI/2);
        ctx.fill();

        // Bandages on arms/hands
        ctx.fillStyle = 'white';
        // Left hand
        ctx.fillRect(10, -22, 12, 6);
        // Right hand
        ctx.fillRect(10, 16, 12, 6);

        // Animation States
        if (state.dash.active) {
            // Streamlines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-20, -10);
            ctx.lineTo(-40, -15);
            ctx.moveTo(-20, 10);
            ctx.lineTo(-40, 15);
            ctx.stroke();
        }

        // Skill Indicators (Local only)
        if (isLocal) {
            const dashState = state.skillStates['rock_lee_dash'];
            if (dashState) {
                // Show charges below character
                ctx.rotate(-state.angle);
                ctx.fillStyle = '#00FF00';
                for (let i = 0; i < dashState.charges; i++) {
                    ctx.beginPath();
                    ctx.arc(-10 + i * 20, 40, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Show recharge progress
                 if (dashState.charges < 2) {
                     ctx.strokeStyle = 'white';
                     ctx.lineWidth = 2;
                     ctx.beginPath();
                     ctx.arc(0, 40, 8, 0, (dashState.rechargeTimer / 240) * Math.PI * 2);
                     ctx.stroke();
                 }
                ctx.rotate(state.angle);
            }
        }

        ctx.restore();
    }
}
