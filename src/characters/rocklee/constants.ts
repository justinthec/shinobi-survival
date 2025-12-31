export const ROCK_LEE_CONSTANTS = {
    // Q: Leaf Hurricane
    LEAF_HURRICANE: {
        COOLDOWN: 5 * 60, // 5 seconds (cooldown starts after cast, overlap with duration?)
        // Standard game logic: cooldown is usually "time until next cast".
        // If duration is 90 (1.5s), and cooldown is 300 (5s), that's fine.
        DURATION: 90, // Increased from 45 (1.5 seconds)
        RADIUS: 80,
        MIN_DAMAGE: 5,  // Windup damage
        MAX_DAMAGE: 20, // Full speed damage
        TICK_RATE: 5 // Damage every 5 frames
    },

    // E: Dynamic Entry
    DYNAMIC_ENTRY: {
        COOLDOWN: 10 * 60, // Increased to 10 seconds
        SPEED: 25, // Very fast
    },

    // Space: Dash
    DASH: {
        COOLDOWN: 100, // Increased from 60 to 100 (~1.6 seconds per charge)
        MAX_CHARGES: 2,
        DURATION: 8,
        SPEED: 15, // Fast burst
    },

    STATS: {
        HP: 140,
        SPEED: 3.5,
    }
};
