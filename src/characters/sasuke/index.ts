import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { SasukeCharacter } from "./SasukeCharacter";
import { LightningSlashProjectile } from "./projectiles";

export function registerSasuke() {
    CharacterRegistry.register('sasuke', new SasukeCharacter());
    ProjectileRegistry.register('lightning_slash', new LightningSlashProjectile());
}
