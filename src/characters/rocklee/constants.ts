export const ROCK_LEE_CONSTANTS = {
    // Q: Leaf Hurricane
    LEAF_HURRICANE: {
        COOLDOWN: 5 * 60, // 5 seconds
        DURATION: 30, // 0.5 seconds
        RADIUS: 60,
        DAMAGE: 15,
        TICK_RATE: 5 // Damage every 5 frames
    },

    // E: Dynamic Entry
    DYNAMIC_ENTRY: {
        COOLDOWN: 8 * 60, // 8 seconds
        SPEED: 25, // Very fast
    },

    // Space: Dash
    DASH: {
        COOLDOWN: 60, // 1 second recharge for a charge
        MAX_CHARGES: 2,
        DURATION: 5, // Shorter than standard (standard is usually ~10-15)
        SPEED: 15, // Fast burst
    },

    STATS: {
        HP: 140, // Tankier than Sasuke, less than Naruto
        SPEED: 3.5, // Faster than Sasuke (3.25)
    }
};
