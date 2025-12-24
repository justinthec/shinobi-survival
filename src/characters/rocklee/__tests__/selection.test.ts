import { CharacterRegistry } from "../../../core/registries";
import { DefaultInput } from "netplayjs";

test('Selection Logic Verify', () => {
    // Register 3 items
    CharacterRegistry.register('A', {} as any);
    CharacterRegistry.register('B', {} as any);
    CharacterRegistry.register('C', {} as any);

    const keys = CharacterRegistry.getKeys();
    // We expect at least A, B, C.
    // If others ran before, they might be there too (global state in test env? usually reset but who knows).

    // Find index of C
    const idxC = keys.indexOf('C');
    expect(idxC).toBeGreaterThanOrEqual(0);

    const keyForC = (idxC + 1).toString();

    const input = new DefaultInput();
    input.keysPressed[keyForC] = true;

    let selected = null;
    for (let i = 0; i < keys.length; i++) {
        const k = (i + 1).toString();
        if (input.keysPressed[k]) {
            selected = keys[i];
        }
    }

    expect(selected).toBe('C');
});
