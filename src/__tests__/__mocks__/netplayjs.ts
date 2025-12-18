export class Game {
    constructor() {}
}

export class NetplayPlayer {
    id: number;
    constructor(id: number, public isLocal: boolean, public isHost: boolean) {
        this.id = id;
    }
    isLocalPlayer() { return this.isLocal; }
}

export class Vec2 {
    constructor(public x: number, public y: number) {}
}

export class DefaultInput {
    keysPressed: Record<string, boolean> = {};
    keysHeld: Record<string, boolean> = {};
    mousePosition: { x: number, y: number } = { x: 0, y: 0 };
}
