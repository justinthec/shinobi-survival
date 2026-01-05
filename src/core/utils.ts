export class SeededRNG {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // Linear Congruential Generator
    // Using parameters from Numerical Recipes
    next(): number {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }

    // Returns a number between min (inclusive) and max (exclusive)
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    // Fisher-Yates shuffle
    shuffle<T>(array: T[]): T[] {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex != 0) {

            // Pick a remaining element.
            randomIndex = Math.floor(this.next() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }
}

export function getPlayerColor(id: number): string {
    const colors = ['#e53e3e', '#3182ce', '#ecc94b', '#FF69B4']; // Red, Blue, Yellow, HotPink
    return colors[id % colors.length];
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, align: CanvasTextAlign = 'center'): number {
    const words = text.split(' ');
    let line = '';
    let startY = y;

    // Save current alignment
    const originalAlign = ctx.textAlign;
    ctx.textAlign = align;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);

    ctx.textAlign = originalAlign; // Restore
    return y - startY + lineHeight; // Return total height used
}
