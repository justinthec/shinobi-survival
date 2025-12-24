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
    const colors = ['#e53e3e', '#3182ce', '#ecc94b', '#d53f8c']; // Red, Blue, Yellow, Pink
    return colors[id % colors.length];
}
