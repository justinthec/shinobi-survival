export const SPRITES: Record<string, HTMLCanvasElement | HTMLImageElement> = {};

export function initSprites() {
    // Load grass tile image
    const grassImg = new Image();
    grassImg.src = './grass.png';
    SPRITES.grass = grassImg;

    const makeSprite = (width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void) => {
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        const ctx = c.getContext('2d')!;
        drawFn(ctx, width / 2, height / 2);
        return c;
    };

    SPRITES.tree = makeSprite(120, 160, (ctx, cx, cy) => {
        ctx.fillStyle = '#3e2723'; ctx.fillRect(cx - 15, cy, 30, 80);
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath(); ctx.moveTo(cx - 50, cy + 20); ctx.lineTo(cx, cy - 60); ctx.lineTo(cx + 50, cy + 20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 45, cy - 20); ctx.lineTo(cx, cy - 90); ctx.lineTo(cx + 45, cy - 20); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + 75, 40, 15, 0, 0, Math.PI * 2); ctx.fill();
    });

    // Tile sprites for map rendering
    SPRITES.tile_grass = makeSprite(32, 32, (ctx, cx, cy) => {
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(0, 0, 32, 32);
        // Add some grass detail
        ctx.fillStyle = '#3d7a37';
        for (let i = 0; i < 8; i++) {
            const x = (i * 17 + 5) % 30;
            const y = (i * 11 + 3) % 30;
            ctx.fillRect(x, y, 3, 2);
        }
    });

    SPRITES.tile_tree = makeSprite(32, 32, (ctx, cx, cy) => {
        // Ground
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(0, 0, 32, 32);
        // Trunk
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(cx - 3, cy + 4, 6, 12);
        // Leaves
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d7a27';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 4, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    SPRITES.tile_rock = makeSprite(32, 32, (ctx, cx, cy) => {
        // Ground
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(0, 0, 32, 32);
        // Rock
        ctx.fillStyle = '#6b6b6b';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.ellipse(cx - 3, cy + 2, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Shadow
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 6, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    SPRITES.tile_water = makeSprite(32, 32, (ctx, cx, cy) => {
        // Water base
        ctx.fillStyle = '#1a5276';
        ctx.fillRect(0, 0, 32, 32);
        // Ripples
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 8, cy + 6, 3, 0, Math.PI * 2);
        ctx.stroke();
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(cx - 8, cy - 8, 6, 3);
    });

    SPRITES.naruto = makeSprite(64, 64, (ctx, cx, cy) => {
        ctx.fillStyle = '#ff6b00'; ctx.beginPath(); ctx.arc(cx, cy + 10, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1c40f'; drawSpikyHair(ctx, cx, cy - 5, 18, '#f1c40f');
        ctx.fillStyle = '#ffccaa'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.fillRect(cx - 10, cy - 8, 20, 6); ctx.fillStyle = '#ccc'; ctx.fillRect(cx - 4, cy - 7, 8, 4);
    });

    SPRITES.sasuke = makeSprite(64, 64, (ctx, cx, cy) => {
        ctx.fillStyle = '#ccc'; ctx.beginPath();
        ctx.moveTo(cx - 12, cy + 5); ctx.lineTo(cx + 12, cy + 5); ctx.lineTo(cx + 15, cy - 8); ctx.lineTo(cx - 15, cy - 8); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy + 10, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx - 4, cy + 15); ctx.lineTo(cx + 4, cy + 15); ctx.fill();
        ctx.strokeStyle = '#800080'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx - 14, cy + 15); ctx.lineTo(cx + 14, cy + 15); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 8, cy + 15); ctx.lineTo(cx + 10, cy + 22); ctx.stroke();
        ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 5); ctx.lineTo(cx - 18, cy - 15); ctx.lineTo(cx - 8, cy - 12);
        ctx.lineTo(cx, cy - 18); ctx.lineTo(cx + 8, cy - 12);
        ctx.lineTo(cx + 18, cy - 15); ctx.lineTo(cx + 12, cy - 5);
        ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 2, 12, 0, Math.PI, true); ctx.fill();
        ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(cx + 3, cy + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx + 8, cy - 5); ctx.lineTo(cx + 12, cy - 15); ctx.stroke();
    });

    SPRITES.gaara = makeSprite(80, 80, (ctx, cx, cy) => {
        ctx.fillStyle = '#d35400'; ctx.beginPath(); ctx.ellipse(cx + 10, cy - 5, 12, 18, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.arc(cx, cy + 10, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(cx, cy + 2, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 5, cy + 2); ctx.lineTo(cx - 2, cy + 2); ctx.stroke();
    });
    SPRITES.sakura = makeSprite(64, 64, (ctx, cx, cy) => {
        ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(cx, cy + 10, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fd79a8'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(cx, cy + 3, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(cx - 10, cy - 8, 20, 5);
    });

    // Enemies
    SPRITES.zetsu = makeSprite(64, 64, (ctx, cx, cy) => {
        ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.ellipse(cx, cy, 16, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(cx - 5, cy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + 5, cy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
    });
    SPRITES.puppet = makeSprite(80, 80, (ctx, cx, cy) => {
        ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d7ccc8'; ctx.beginPath(); ctx.arc(cx, cy + 2, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 10, cy + 8); ctx.lineTo(cx + 10, cy + 8); ctx.stroke();
    });
    SPRITES.sound_ninja = makeSprite(64, 64, (ctx, cx, cy) => {
        ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx, cy - 5, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 15, cy + 10); ctx.lineTo(cx - 25, cy + 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + 15, cy + 10); ctx.lineTo(cx + 25, cy + 20); ctx.stroke();
    });
    SPRITES.snake = makeSprite(128, 128, (ctx, cx, cy) => {
        ctx.fillStyle = '#5e35b1'; ctx.beginPath(); ctx.ellipse(cx, cy, 30, 50, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#yellow'; ctx.beginPath(); ctx.arc(cx - 10, cy - 30, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 10, cy - 30, 5, 0, Math.PI * 2); ctx.fill();
    });

    // VFX & Weapons
    SPRITES.shuriken = makeSprite(32, 32, (ctx, cx, cy) => {
        ctx.translate(cx, cy);
        ctx.fillStyle = '#ccc';
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -10); ctx.lineTo(3, -2); ctx.lineTo(10, 0); ctx.lineTo(3, 2);
            ctx.fill();
        }
        ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    });

    SPRITES.rasengan = makeSprite(100, 100, (ctx, cx, cy) => {
        const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 40);
        grd.addColorStop(0, "white"); grd.addColorStop(0.5, "#00d2ff"); grd.addColorStop(1, "rgba(0, 210, 255, 0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#00d2ff';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, 20 + i * 5, i, i + Math.PI); ctx.stroke(); }
    });

    SPRITES.rasenshuriken = makeSprite(128, 128, (ctx, cx, cy) => {
        ctx.translate(cx, cy);
        ctx.fillStyle = 'rgba(200, 240, 255, 0.7)';
        for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(40, 0, 50, 15, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#00d2ff'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    });

    SPRITES.sword_slash = makeSprite(100, 60, (ctx, cx, cy) => {
        ctx.fillStyle = 'rgba(200, 220, 255, 0.8)'; ctx.beginPath();
        ctx.arc(cx - 20, cy, 45, -Math.PI / 3, Math.PI / 3); ctx.lineTo(cx - 30, cy); ctx.fill();
        ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 2; ctx.stroke();
    });

    SPRITES.sand_hand = makeSprite(120, 160, (ctx, cx, cy) => {
        ctx.fillStyle = '#d35400'; ctx.strokeStyle = '#a04000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy + 30, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        for (let i = -2; i <= 2; i++) {
            const ang = (i * 0.2) - Math.PI / 2;
            const fx = cx + Math.cos(ang) * 60; const fy = cy + Math.sin(ang) * 60;
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * 30, cy + Math.sin(ang) * 30 + 30);
            ctx.lineTo(fx, fy); ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.stroke();
            ctx.beginPath(); ctx.arc(fx, fy, 8, 0, Math.PI * 2); ctx.fill();
        }
    });
    SPRITES.tailed_beast_bomb = makeSprite(64, 64, (ctx, cx, cy) => {
        const grd = ctx.createRadialGradient(cx, cy, 5, cx, cy, 30);
        grd.addColorStop(0, "black"); grd.addColorStop(0.5, "#4b0082"); grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(cx - 5, cy - 5, 2, 0, Math.PI * 2); ctx.fill();
    });
    SPRITES.rock_wave = makeSprite(80, 40, (ctx, cx, cy) => {
        ctx.fillStyle = '#654321'; ctx.beginPath(); ctx.rect(cx - 40, cy - 15, 80, 30); ctx.fill();
        ctx.fillStyle = '#8b4513'; ctx.beginPath();
        ctx.moveTo(cx - 30, cy - 15); ctx.lineTo(cx - 20, cy - 35); ctx.lineTo(cx - 10, cy - 15);
        ctx.moveTo(cx, cy - 15); ctx.lineTo(cx + 10, cy - 40); ctx.lineTo(cx + 20, cy - 15); ctx.fill();
    });
    SPRITES.cracks = makeSprite(100, 100, (ctx, cx, cy) => {
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
            ctx.lineTo(cx + Math.cos(a + 0.2) * 50, cy + Math.sin(a + 0.2) * 50);
        }
        ctx.stroke();
    });

    SPRITES.susanoo = makeSprite(300, 300, (ctx, cx, cy) => {
        ctx.strokeStyle = '#8A2BE2'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.shadowBlur = 20; ctx.shadowColor = '#8A2BE2';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, cy + 20, 40 + i * 30, Math.PI, 0); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(cx, cy - 80, 40, 0, Math.PI * 2); ctx.stroke();
    });
    SPRITES.kurama = makeSprite(300, 300, (ctx, cx, cy) => {
        ctx.fillStyle = 'rgba(255, 140, 0, 0.4)'; ctx.shadowBlur = 30; ctx.shadowColor = 'orange';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 50); ctx.lineTo(cx - 80, cy - 60); ctx.lineTo(cx - 100, cy - 120);
        ctx.lineTo(cx - 40, cy - 80); ctx.lineTo(cx, cy - 40); ctx.lineTo(cx + 40, cy - 80);
        ctx.lineTo(cx + 100, cy - 120); ctx.lineTo(cx + 80, cy - 60); ctx.lineTo(cx, cy + 50); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.ellipse(cx - 30, cy - 30, 10, 20, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 30, cy - 30, 10, 20, -0.5, 0, Math.PI * 2); ctx.fill();
    });
    SPRITES.slug = makeSprite(200, 200, (ctx, cx, cy) => {
        ctx.fillStyle = '#81ecec'; ctx.strokeStyle = '#00cec9'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(cx, cy, 60, 80, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy - 60, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0984e3'; ctx.beginPath(); ctx.arc(cx, cy - 70, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 20, cy, 10, 0, Math.PI * 2); ctx.fill();
    });

    SPRITES.rinnegan_effect = makeSprite(50, 50, (ctx, cx, cy) => {
        ctx.strokeStyle = '#8A2BE2'; ctx.lineWidth = 3;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath(); ctx.arc(cx, cy, i * 5, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(138, 43, 226, 0.5)'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
    });

    SPRITES.fire_trail = makeSprite(64, 64, (ctx, cx, cy) => {
        ctx.fillStyle = 'rgba(255, 69, 0, 0.6)';
        ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 140, 0, 0.8)';
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    });
}

function drawSpikyHair(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const ox = x + Math.cos(angle) * radius; const oy = y + Math.sin(angle) * radius;
        ctx.lineTo(ox, oy);
        const innerAngle = angle + (Math.PI / 8);
        const ix = x + Math.cos(innerAngle) * (radius * 0.5); const iy = y + Math.sin(innerAngle) * (radius * 0.5);
        ctx.lineTo(ix, iy);
    }
    ctx.closePath(); ctx.fill();
}
