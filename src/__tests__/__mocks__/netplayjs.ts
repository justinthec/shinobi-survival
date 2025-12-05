/**
 * Mock for NetplayJS types used in tests.
 * This allows tests to run without the full NetplayJS dependency.
 */

export class Vec2 {
    constructor(public x: number = 0, public y: number = 0) { }

    add(other: Vec2): Vec2 {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    sub(other: Vec2): Vec2 {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    mul(scalar: number): Vec2 {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vec2 {
        const len = this.length();
        if (len === 0) return new Vec2(0, 0);
        return new Vec2(this.x / len, this.y / len);
    }
}

export class Game {
    // Base game class - minimal implementation for testing
}

export class NetplayPlayer {
    id: number = 0;
    isLocal: boolean = false;

    constructor(id: number = 0, isLocal: boolean = false) {
        this.id = id;
        this.isLocal = isLocal;
    }
}

export class DefaultInput {
    keysHeld: Record<string, boolean> = {};
    keysPressed: Record<string, boolean> = {};
    mousePosition: Vec2 | null = null;
}
