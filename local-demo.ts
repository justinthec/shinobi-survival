import {
    LocalWrapper,
    Vec2,
    Game,
    NetplayPlayer,
    DefaultInput,
} from "netplayjs/src/index";

const COLORS = ["red", "blue", "green", "yellow", "orange", "purple"];

export class SimpleGame extends Game {
    static timestep = 1000 / 60;
    static canvasSize = { width: 600, height: 300 };
    static numPlayers = 4;

    playerStates: Array<{
        pos: Vec2;
        color: string;
        ready: boolean;
        selectedUpgrade: number | null;
    }> = [];
    gameStarted: boolean = false;

    // Upgrade selection state
    isSelectingUpgrade: boolean = false;
    teamXP: number = 0;
    teamLevel: number = 1;
    xpToNextLevel: number = 300; // XP needed for next level

    constructor(canvas: HTMLCanvasElement, players: Array<NetplayPlayer>) {
        super();

        const xStart = 100;
        const xEnd = 500;
        const range = xEnd - xStart;
        const increments = range / (players.length - 1);

        for (let player of players) {
            this.playerStates.push({
                pos: new Vec2(player.getID() * increments + xStart, 150),
                color: COLORS[player.getID() % COLORS.length],
                ready: false,
                selectedUpgrade: null,
            });
        }
    }

    tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
        if (!this.gameStarted) {
            // Check for ready-up inputs (spacebar or Enter key)
            for (const [player, input] of playerInputs.entries()) {
                if (input.keysPressed[' '] || input.keysPressed['Enter']) {
                    this.playerStates[player.getID()].ready = true;
                }
            }

            // Check if all players are ready
            if (this.playerStates.every(p => p.ready)) {
                this.gameStarted = true;
            }
            return; // Don't process game logic until started
        }

        // Handle upgrade selection phase
        if (this.isSelectingUpgrade) {
            for (const [player, input] of playerInputs.entries()) {
                const playerId = player.getID();

                // Check for upgrade selection (keys 1, 2, or 3)
                if (input.keysPressed['1']) {
                    this.playerStates[playerId].selectedUpgrade = 1;
                } else if (input.keysPressed['2']) {
                    this.playerStates[playerId].selectedUpgrade = 2;
                } else if (input.keysPressed['3']) {
                    this.playerStates[playerId].selectedUpgrade = 3;
                }
            }

            // Check if all players have selected an upgrade
            if (this.playerStates.every(p => p.selectedUpgrade !== null)) {
                // Resume game - reset upgrade selections for next time
                this.isSelectingUpgrade = false;
                this.playerStates.forEach(p => p.selectedUpgrade = null);
            }
            return; // Don't process game logic during upgrade selection
        }

        // Normal game logic
        for (const [player, input] of playerInputs.entries()) {
            const vel = input.arrowKeys().multiplyScalar(5);

            this.playerStates[player.getID()].pos.x += vel.x;
            this.playerStates[player.getID()].pos.y -= vel.y;
        }

        // Mock XP gain system (gain 1 XP per tick for demo purposes)
        this.teamXP++;

        // Check for level up
        if (this.teamXP >= this.xpToNextLevel) {
            this.teamLevel++;
            this.teamXP = 0;
            this.xpToNextLevel += 100; // Increase XP requirement for next level
            this.isSelectingUpgrade = true; // Trigger upgrade selection
        }
    }

    draw(canvas: HTMLCanvasElement) {
        // Fill in a black background.
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.gameStarted) {
            // Draw ready-up UI
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Press SPACE or ENTER when ready", canvas.width / 2, 50);

            // Show ready status for each player
            for (let i = 0; i < this.playerStates.length; i++) {
                const state = this.playerStates[i];
                ctx.fillStyle = state.color;
                const status = state.ready ? "✓ READY" : "Waiting...";
                ctx.fillText(`Player ${i + 1}: ${status}`, canvas.width / 2, 100 + i * 30);
            }
        } else if (this.isSelectingUpgrade) {
            // Draw upgrade selection UI
            ctx.fillStyle = "white";
            ctx.font = "24px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`LEVEL ${this.teamLevel} REACHED!`, canvas.width / 2, 40);
            ctx.font = "18px Arial";
            ctx.fillText("Select Your Upgrade:", canvas.width / 2, 70);

            // Display upgrade options
            ctx.font = "16px Arial";
            ctx.fillText("[1] Speed Boost", canvas.width / 2, 110);
            ctx.fillText("[2] Extra Damage", canvas.width / 2, 140);
            ctx.fillText("[3] Health Regeneration", canvas.width / 2, 170);

            // Show selection status for each player
            ctx.font = "14px Arial";
            for (let i = 0; i < this.playerStates.length; i++) {
                const state = this.playerStates[i];
                ctx.fillStyle = state.color;
                let status = "Waiting...";
                if (state.selectedUpgrade !== null) {
                    status = `✓ Selected Upgrade ${state.selectedUpgrade}`;
                }
                ctx.fillText(`Player ${i + 1}: ${status}`, canvas.width / 2, 210 + i * 20);
            }
        } else {
            // Draw game UI
            // Draw XP bar at top
            ctx.fillStyle = "white";
            ctx.font = "14px Arial";
            ctx.textAlign = "left";
            ctx.fillText(`Level: ${this.teamLevel}`, 10, 20);
            ctx.fillText(`XP: ${this.teamXP}/${this.xpToNextLevel}`, 10, 40);

            // XP progress bar
            const barWidth = 200;
            const barHeight = 10;
            ctx.strokeStyle = "white";
            ctx.strokeRect(10, 45, barWidth, barHeight);
            ctx.fillStyle = "yellow";
            const progress = (this.teamXP / this.xpToNextLevel) * barWidth;
            ctx.fillRect(10, 45, progress, barHeight);

            // Draw squares for the characters.
            for (let player of this.playerStates) {
                ctx.fillStyle = player.color;
                ctx.fillRect(player.pos.x - 5, player.pos.y - 5, 10, 10);
            }
        }
    }
}

new LocalWrapper(SimpleGame).start();
