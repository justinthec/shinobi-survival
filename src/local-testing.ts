import { LocalWrapper } from "netplayjs";
import { ShinobiSurvivalGame } from "./multiplayer-game";

console.log("Starting LocalWrapper...");
try {
    new LocalWrapper(ShinobiSurvivalGame).start();
    console.log("LocalWrapper started.");
} catch (e) {
    console.error("Error starting LocalWrapper:", e);
}
