import { Vec2 } from "netplayjs";
import { Collider } from "./types";

// Helper for distance to segment
function distToSegmentSquared(p: Vec2, v: Vec2, w: Vec2) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}

export class SpatialHash {
    cellSize: number;
    buckets: Map<string, (Collider & { pos: Vec2, id: number })[]>;

    constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.buckets = new Map();
    }

    clear() {
        this.buckets.clear();
    }

    add(entity: Collider & { pos: Vec2, id: number }) {
        const bounds = this.getBounds(entity);
        const startX = Math.floor(bounds.minX / this.cellSize);
        const startY = Math.floor(bounds.minY / this.cellSize);
        const endX = Math.floor(bounds.maxX / this.cellSize);
        const endY = Math.floor(bounds.maxY / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                if (!this.buckets.has(key)) {
                    this.buckets.set(key, []);
                }
                this.buckets.get(key)!.push(entity);
            }
        }
    }

    query(entity: Collider & { pos: Vec2 }): (Collider & { pos: Vec2, id: number })[] {
        const bounds = this.getBounds(entity);
        const startX = Math.floor(bounds.minX / this.cellSize);
        const startY = Math.floor(bounds.minY / this.cellSize);
        const endX = Math.floor(bounds.maxX / this.cellSize);
        const endY = Math.floor(bounds.maxY / this.cellSize);

        const results = new Set<number>();
        const entities: (Collider & { pos: Vec2, id: number })[] = [];

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const bucket = this.buckets.get(key);
                if (bucket) {
                    for (const e of bucket) {
                        if (!results.has(e.id)) {
                            results.add(e.id);
                            entities.push(e);
                        }
                    }
                }
            }
        }
        return entities;
    }

    getBounds(entity: Collider & { pos: Vec2 }) {
        let minX = entity.pos.x;
        let minY = entity.pos.y;
        let maxX = entity.pos.x;
        let maxY = entity.pos.y;

        if (entity.shape.type === 'circle') {
            const r = entity.shape.radius;
            minX -= r; minY -= r; maxX += r; maxY += r;
        } else if (entity.shape.type === 'capsule') {
            const r = entity.shape.radius;
            const startX = entity.pos.x + entity.shape.startOffset.x;
            const startY = entity.pos.y + entity.shape.startOffset.y;
            const endX = entity.pos.x + entity.shape.endOffset.x;
            const endY = entity.pos.y + entity.shape.endOffset.y;
            minX = Math.min(startX, endX) - r;
            minY = Math.min(startY, endY) - r;
            maxX = Math.max(startX, endX) + r;
            maxY = Math.max(startY, endY) + r;
        } else if (entity.shape.type === 'aabb') {
            minX -= entity.shape.width / 2;
            minY -= entity.shape.height / 2;
            maxX += entity.shape.width / 2;
            maxY += entity.shape.height / 2;
        }
        return { minX, minY, maxX, maxY };
    }

    checkCollision(a: Collider & { pos: Vec2 }, b: Collider & { pos: Vec2 }): boolean {
        // Narrow phase
        if (a.shape.type === 'circle' && b.shape.type === 'circle') {
            const distSq = (a.pos.x - b.pos.x) ** 2 + (a.pos.y - b.pos.y) ** 2;
            const rSum = a.shape.radius + b.shape.radius;
            return distSq < rSum * rSum;
        }

        // Circle vs Capsule
        if (a.shape.type === 'circle' && b.shape.type === 'capsule') {
            const start = new Vec2(b.pos.x + b.shape.startOffset.x, b.pos.y + b.shape.startOffset.y);
            const end = new Vec2(b.pos.x + b.shape.endOffset.x, b.pos.y + b.shape.endOffset.y);
            const distSq = distToSegmentSquared(a.pos, start, end);
            const rSum = a.shape.radius + b.shape.radius;
            return distSq < rSum * rSum;
        }
        if (a.shape.type === 'capsule' && b.shape.type === 'circle') {
            return this.checkCollision(b, a);
        }

        // Capsule vs Capsule (Not implemented yet, expensive and rare)

        return false;
    }
}
