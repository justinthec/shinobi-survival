import { CharacterDefinition, AbilityDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { ROCK_LEE_CONSTANTS } from "./constants";
import { getPlayerColor } from "../../core/utils";

export class RockLeeCharacter implements CharacterDefinition {
    name = "Rock Lee";
    description = "A taijutsu specialist who relies on speed and physical attacks.";
    abilities: AbilityDefinition[] = [
        { key: "Q", name: "Leaf Hurricane", description: "Spinning kick that damages enemies around you.", type: "active" },
        { key: "E", name: "Dynamic Entry", description: "Flying kick towards target. Stuns on impact.", type: "active" },
        { key: "SPC", name: "Dash", description: "Quickly dash. Has multiple charges.", type: "active" }
    ];

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        const { pos, angle, hp, maxHp, name } = state;

        // Colors
        const c = {
            skin: '#ffe0bd',
            hair: '#111111', // Dark shiny black
            suit: '#32CD32', // Brighter green for anime look
            vest: '#006400', // Dark Green flak jacket (if we want to add it, though Lee usually just has the jumpsuit)
                             // Actually Lee usually doesn't wear the vest in Part 1/Shippuden default, just jumpsuit.
                             // But let's stick to jumpsuit.
            belt: '#d3d3d3', // Red belt/sash or bandages? Lee has a red sash usually.
            sash: '#FF0000',
            warmers: '#FF8C00', // Orange leg warmers
            bandages: '#eeeeee'
        };

        const activeSkill = state.skillStates['active_dash_skill'];
        const isDynamicEntry = state.dash.active && activeSkill && activeSkill.type === 'dynamic_entry';
        const qState = state.skillStates['leaf_hurricane'];
        const isQActive = qState && qState.active;

        // Dynamic Entry Target Indicator
        if (isLocal && isDynamicEntry && state.skillStates['dynamic_entry'] && state.skillStates['dynamic_entry'].target) {
            const target = state.skillStates['dynamic_entry'].target;
            const dx = target.x - pos.x;
            const dy = target.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 600;
            const opacity = Math.max(0.2, 0.8 * (1 - Math.min(dist, maxDist) / maxDist));

            ctx.save();
            ctx.translate(target.x, target.y);
            ctx.scale(1, 0.5);
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);

        // Rotation Logic
        let effectiveAngle = angle;
        if (isQActive) {
            const elapsed = time - (qState.startTime || time);
            const duration = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION;
            const progress = Math.min(1, Math.max(0, elapsed / duration));
            const totalSpins = 5;
            effectiveAngle = (totalSpins * Math.PI * 2) * (progress * progress);
        }
        ctx.rotate(effectiveAngle);

        // Dynamic Entry Aura
        if (isDynamicEntry) {
             ctx.save();
             ctx.shadowColor = "#00ff00";
             ctx.shadowBlur = 20;
             ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
             ctx.beginPath();
             ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // --- Body (Jumpsuit) ---
        ctx.fillStyle = c.suit;
        // Torso
        ctx.beginPath();
        ctx.ellipse(-5, 0, 14, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red Sash
        ctx.fillStyle = c.sash;
        ctx.fillRect(-8, -4, 5, 8); // Belt around waist area (sideways in top down?)
        // Let's draw a small rect across the back
        ctx.fillRect(-10, -5, 4, 10);

        // --- Head ---
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // --- Hair (Bowl Cut) ---
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        // Bowl shape: Rounded top, straight cut bottom/sides
        ctx.arc(2, 0, 12, Math.PI * 0.8, Math.PI * 3.2); // Most of the head
        ctx.closePath();
        ctx.fill();

        // Shiny reflection on hair
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, -6, 6, 2, Math.PI / 12, 0, Math.PI * 2);
        ctx.fill();

        // --- Eyebrows (Thick) ---
        // Visible slightly peeking out or on top of skin area
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Right eyebrow
        ctx.moveTo(8, -4);
        ctx.quadraticCurveTo(10, -5, 12, -3);
        // Left eyebrow
        ctx.moveTo(8, 4);
        ctx.quadraticCurveTo(10, 5, 12, 3);
        ctx.stroke();

        // Eyes (Round)
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(10, -3, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, 3, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(11, -3, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(11, 3, 1, 0, Math.PI*2); ctx.fill();


        // --- Arms (Bandaged) ---
        ctx.fillStyle = c.bandages; // Bandaged arms are iconic
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -17, 12, 5, 2); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 12, 12, 5, 2); ctx.fill();
        // Bandage lines
        ctx.strokeStyle = '#dcdcdc';
        ctx.lineWidth = 1;
        [0, 4, 8].forEach(offset => {
             ctx.beginPath(); ctx.moveTo(2 + offset, -17); ctx.lineTo(2 + offset, -12); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(2 + offset, 12); ctx.lineTo(2 + offset, 17); ctx.stroke();
        });


        // --- Leg Warmers (Orange) ---
        ctx.fillStyle = c.warmers;
        // Left Leg
        CharacterRendererHelper.drawRoundedRectPath(ctx, -6, -14, 8, 6, 2); ctx.fill();
        // Right Leg
        CharacterRendererHelper.drawRoundedRectPath(ctx, -6, 8, 8, 6, 2); ctx.fill();


        // --- Animations ---
        if (isDynamicEntry) {
            // Flying Kick Pose
            // Override legs for kick
            ctx.fillStyle = c.suit;
            // Extended leg
            ctx.fillStyle = c.warmers;
            ctx.fillRect(8, -3, 15, 6);
            // Foot
            ctx.fillStyle = '#333'; // Sandal
            ctx.beginPath(); ctx.arc(24, 0, 4, 0, Math.PI*2); ctx.fill();

            // Speed lines
             ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(-10, -15); ctx.lineTo(-40, -15);
             ctx.moveTo(-10, 15); ctx.lineTo(-40, 15);
             ctx.stroke();

        } else if (isQActive) {
             // Q Spin Kick Visual
             ctx.strokeStyle = 'rgba(200, 255, 200, 0.5)'; // Wind swipe
             ctx.lineWidth = 4;
             ctx.beginPath();
             ctx.arc(0, 0, 35, 0, Math.PI*2);
             ctx.stroke();

             // Leg extended
             ctx.fillStyle = c.warmers;
             ctx.save();
             ctx.rotate(Math.PI / 2);
             CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -3, 20, 6, 2); ctx.fill();
             ctx.restore();
        }

        ctx.restore();

        // Health Bar & Info
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

             // Dash Charges
             if (state.skillStates['rocklee_dash']) {
                 const charges = state.skillStates['rocklee_dash'].charges;
                 ctx.fillStyle = '#00ff00'; // Green LED style
                 for(let i=0; i<charges; i++) {
                     ctx.beginPath();
                     ctx.arc(-10 + (i*20), 10, 3, 0, Math.PI*2);
                     ctx.fill();
                     ctx.strokeStyle = 'white';
                     ctx.lineWidth = 1;
                     ctx.stroke();
                 }
             }
             ctx.restore();
        }
    }
}
