export const ROCK_LEE_CONSTANTS = {
    // Q: Leaf Hurricane
    LEAF_HURRICANE: {
        COOLDOWN: 5 * 60, // 5 seconds
        DURATION: 45, // Increased from 30 (0.75s)
        RADIUS: 80, // Increased from 60
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
        DURATION: 8, // Increased from 5 to cover more distance
        SPEED: 15, // Fast burst
    },

    STATS: {
        HP: 140, // Tankier than Sasuke, less than Naruto
        SPEED: 3.5, // Faster than Sasuke (3.25)
    }
};
