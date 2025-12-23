import { CharacterDefinition, ProjectileDefinition } from "./interfaces";

export class CharacterRegistry {
    private static characters: Record<string, CharacterDefinition> = {};

    static register(key: string, def: CharacterDefinition) {
        this.characters[key] = def;
    }

    static get(key: string): CharacterDefinition | null {
        return this.characters[key] || null;
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
