export const ROCK_LEE_CONSTANTS = {
    // Q: Leaf Hurricane
    LEAF_HURRICANE: {
        COOLDOWN: 5 * 60,
        DURATION: 250,
        RADIUS: 80,
        MIN_DAMAGE: 1,
        MAX_DAMAGE: 5,
        TICK_RATE: 5
    },

    // E: Dynamic Entry
    DYNAMIC_ENTRY: {
        COOLDOWN: 10 * 60,
        SPEED: 18, // Slower speed (was 25)
        WINDUP: 15, // Frames
        DURATION: 15, // Calculated: (600 / 18) ~ 33 frames? But for gameplay feel, keep it punchy.
        // Actually, let's derive duration from desired range if we want logic consistency.
        // Range 600 / 18 = 33 frames.
        // If we want it to be fast, 18 speed for 20 frames = 360 range.
        // Let's go with 20 frames duration for ~360 range + slide.
        // Or keep it simple: 20 frames.
        DAMAGE: 20,
        STUN_DURATION: 40
    },

    // Space: Dash
    DASH: {
        COOLDOWN: 200, // 200 * 2 = 400 > 360 (Standard)
        MAX_CHARGES: 2,
        DURATION: 8,
        SPEED: 15,
    },

    STATS: {
        HP: 130,
        SPEED: 3.25,
    }
};
