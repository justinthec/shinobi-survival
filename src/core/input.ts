import { DefaultInput } from "netplayjs";

export function isKeyPressed(input: DefaultInput, key: string): boolean {
    return !!(input.keysPressed[key] || input.keysPressed[key.toLowerCase()] || input.keysPressed[key.toUpperCase()]);
}

export function isKeyHeld(input: DefaultInput, key: string): boolean {
    return !!(input.keysHeld[key] || input.keysHeld[key.toLowerCase()] || input.keysHeld[key.toUpperCase()]);
}
