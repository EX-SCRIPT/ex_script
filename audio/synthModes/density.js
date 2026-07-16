import { SoundEngine } from '../soundEngine.js';

const SCALE = [
    130.81, 146.83, 164.81, 196.00, 220.00,
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51
];

let lastDensity = 0;
let activeVoiceIndex = 0;
let lastTriggerTime = 0;

export const DensityMode = {
    init() {
        lastDensity = 0;
        activeVoiceIndex = 0;
        lastTriggerTime = 0;
    },

    update(grid, confidence, isLocked) {
        if (!isLocked) {
            if (lastDensity > 0) {
                SoundEngine.dampKickVoiceAt(activeVoiceIndex, SoundEngine.ctx.currentTime, 0.05);
                lastDensity = 0;
            }
            return;
        }

        let currentDensity = 0;
        for (let i = 0; i < grid.length; i++) {
            if (grid[i]) currentDensity++;
        }

        if (currentDensity !== lastDensity) {
            const now = SoundEngine.ctx.currentTime;
            
            if (now - lastTriggerTime < 0.08) {
                return;
            }

            if (lastDensity > 0) {
                SoundEngine.dampKickVoiceAt(activeVoiceIndex, now, 0.05);
            }

            if (currentDensity > 0) {
                activeVoiceIndex = (activeVoiceIndex + 1) % 18;
                const freq = SCALE[currentDensity - 1];
                SoundEngine.playKickVoice(activeVoiceIndex, now, freq);
                lastTriggerTime = now;
            }

            lastDensity = currentDensity;
        }
    },

    stop() {
        if (lastDensity > 0) {
            SoundEngine.dampKickVoiceAt(activeVoiceIndex, SoundEngine.ctx.currentTime, 0.05);
            lastDensity = 0;
        }
    }
};