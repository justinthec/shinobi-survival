import { CharacterDefinition, ProjectileDefinition } from "./interfaces";

export class CharacterRegistry {
    private static characters: Record<string, CharacterDefinition> = {};
    private static keys: string[] = [];

    static register(key: string, def: CharacterDefinition) {
        this.characters[key] = def;
        if (!this.keys.includes(key)) {
            this.keys.push(key);
        }
    }

    static get(key: string): CharacterDefinition | null {
        return this.characters[key] || null;
    }

    static getKeys(): string[] {
        return this.keys;
    }
}

export class ProjectileRegistry {
    private static projectiles: Record<string, ProjectileDefinition> = {};

    static register(key: string, def: ProjectileDefinition) {
        this.projectiles[key] = def;
    }

    static get(key: string): ProjectileDefinition | null {
        return this.projectiles[key] || null;
    }
}
